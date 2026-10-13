/**
 * Booking + message storage (server only — import it dynamically inside
 * server function handlers).
 *
 * With DATABASE_URL set (e.g. Neon from the Vercel Marketplace) everything is
 * stored in Postgres, so the public site and the staff screen see the same
 * data on every server instance. Without it, data lives in this process's
 * memory: fine for local demos, but on Vercel each instance has its own copy
 * and it resets on cold starts.
 *
 * Double-booking is prevented by the store itself: a unique index on
 * (date_key, time) for active bookings in Postgres, the same check in memory.
 */
import { neon } from "@neondatabase/serverless";
import type { AppointmentStatus, BookingRecord, Preferred } from "~/lib/booking/practice";

export interface NewBooking {
  idempotencyKey: string;
  service: string;
  dateKey: string;
  time: string;
  preferredContact: Preferred;
  fullName: string;
  mobile: string;
  email: string | null;
  referral: "referred" | "direct";
  referringParty: string | null;
}

export type CreateResult =
  | { ok: true; booking: BookingRecord }
  | { ok: false; code: "SLOT_UNAVAILABLE" | "SERVER" };

export type MessageStatus = "NEW" | "HANDLED";

export interface ContactMessage {
  id: string;
  name: string;
  phone: string;
  message: string;
  status: MessageStatus;
  createdAt: string;
}

export interface Store {
  readonly persistent: boolean;
  takenSlots(): Promise<Set<string>>; // "YYYY-MM-DD HH:MM" of active bookings
  createBooking(input: NewBooking): Promise<CreateResult>;
  getBooking(reference: string): Promise<BookingRecord | null>;
  listBookings(): Promise<BookingRecord[]>;
  setBookingStatus(reference: string, status: AppointmentStatus): Promise<BookingRecord | null>;
  createMessage(input: { name: string; phone: string; message: string }): Promise<ContactMessage>;
  listMessages(): Promise<ContactMessage[]>;
  setMessageStatus(id: string, status: MessageStatus): Promise<boolean>;
}

const ACTIVE: AppointmentStatus[] = ["REQUESTED", "CONFIRMED"];
const REF_CHARS = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O or 1/I — read out over the phone

async function newReference(): Promise<string> {
  const { randomInt } = await import("node:crypto");
  let ref = "AN-";
  for (let i = 0; i < 5; i += 1) ref += REF_CHARS[randomInt(REF_CHARS.length)];
  return ref;
}

async function newId(): Promise<string> {
  const { randomUUID } = await import("node:crypto");
  return randomUUID();
}

/* ── In-memory store ───────────────────────────────────────────────────── */
function memoryStore(): Store {
  const g = globalThis as unknown as { __anStore?: { bookings: BookingRecord[]; messages: ContactMessage[] } };
  const db = (g.__anStore ??= { bookings: [], messages: [] });
  return {
    persistent: false,
    async takenSlots() {
      return new Set(db.bookings.filter((b) => ACTIVE.includes(b.status)).map((b) => `${b.dateKey} ${b.time}`));
    },
    async createBooking(input) {
      const existing = db.bookings.find((b) => b.idempotencyKey === input.idempotencyKey);
      if (existing) return { ok: true, booking: existing };
      if (db.bookings.some((b) => ACTIVE.includes(b.status) && b.dateKey === input.dateKey && b.time === input.time)) {
        return { ok: false, code: "SLOT_UNAVAILABLE" };
      }
      let reference = await newReference();
      while (db.bookings.some((b) => b.reference === reference)) reference = await newReference();
      const now = new Date().toISOString();
      const booking: BookingRecord = { ...input, reference, status: "REQUESTED", consentAt: now, createdAt: now };
      db.bookings.push(booking);
      return { ok: true, booking };
    },
    async getBooking(reference) {
      return db.bookings.find((b) => b.reference === reference) ?? null;
    },
    async listBookings() {
      return [...db.bookings];
    },
    async setBookingStatus(reference, status) {
      const b = db.bookings.find((x) => x.reference === reference);
      if (!b) return null;
      b.status = status;
      return b;
    },
    async createMessage(input) {
      const msg: ContactMessage = { ...input, id: await newId(), status: "NEW", createdAt: new Date().toISOString() };
      db.messages.push(msg);
      return msg;
    },
    async listMessages() {
      return [...db.messages];
    },
    async setMessageStatus(id, status) {
      const m = db.messages.find((x) => x.id === id);
      if (!m) return false;
      m.status = status;
      return true;
    },
  };
}

/* ── Postgres store ────────────────────────────────────────────────────── */
type Row = Record<string, unknown>;

function toBooking(r: Row): BookingRecord {
  return {
    reference: String(r.reference),
    idempotencyKey: String(r.idempotency_key),
    service: String(r.service),
    dateKey: String(r.date_key),
    time: String(r.time),
    status: r.status as AppointmentStatus,
    preferredContact: r.preferred_contact as Preferred,
    fullName: String(r.full_name),
    mobile: String(r.mobile),
    email: r.email ? String(r.email) : null,
    referral: r.referral as "referred" | "direct",
    referringParty: r.referring_party ? String(r.referring_party) : null,
    consentAt: new Date(r.consent_at as string).toISOString(),
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

function toMessage(r: Row): ContactMessage {
  return {
    id: String(r.id),
    name: String(r.name),
    phone: String(r.phone),
    message: String(r.message ?? ""),
    status: r.status as MessageStatus,
    createdAt: new Date(r.created_at as string).toISOString(),
  };
}

let schemaReady: Promise<void> | null = null;

function postgresStore(url: string): Store {
  const sql = neon(url);
  const ready = () =>
    (schemaReady ??= (async () => {
      await sql`create table if not exists an_bookings (
        reference text primary key,
        idempotency_key text not null unique,
        service text not null,
        date_key text not null,
        time text not null,
        status text not null,
        preferred_contact text not null,
        full_name text not null,
        mobile text not null,
        email text,
        referral text not null,
        referring_party text,
        consent_at timestamptz not null default now(),
        created_at timestamptz not null default now(),
        updated_at timestamptz not null default now()
      )`;
      await sql`create unique index if not exists an_bookings_active_slot
        on an_bookings (date_key, time) where status in ('REQUESTED', 'CONFIRMED')`;
      await sql`create table if not exists an_messages (
        id text primary key,
        name text not null,
        phone text not null,
        message text not null default '',
        status text not null default 'NEW',
        created_at timestamptz not null default now()
      )`;
    })().catch((e) => {
      schemaReady = null; // retry on the next request
      throw e;
    }));

  const byKey = async (key: string) => {
    const rows = await sql`select * from an_bookings where idempotency_key = ${key}`;
    return rows[0] ? toBooking(rows[0]) : null;
  };

  return {
    persistent: true,
    async takenSlots() {
      await ready();
      const rows = await sql`select date_key, time from an_bookings where status in ('REQUESTED', 'CONFIRMED')`;
      return new Set(rows.map((r) => `${r.date_key} ${r.time}`));
    },
    async createBooking(input) {
      await ready();
      const existing = await byKey(input.idempotencyKey);
      if (existing) return { ok: true, booking: existing };
      for (let attempt = 0; attempt < 5; attempt++) {
        const reference = await newReference();
        try {
          const rows = await sql`insert into an_bookings
            (reference, idempotency_key, service, date_key, time, status, preferred_contact,
             full_name, mobile, email, referral, referring_party)
            values (${reference}, ${input.idempotencyKey}, ${input.service}, ${input.dateKey}, ${input.time},
                    'REQUESTED', ${input.preferredContact}, ${input.fullName}, ${input.mobile}, ${input.email},
                    ${input.referral}, ${input.referringParty})
            returning *`;
          return { ok: true, booking: toBooking(rows[0]) };
        } catch (e) {
          const err = e as { code?: string; constraint?: string; message?: string };
          if (err.code !== "23505") throw e;
          const which = `${err.constraint ?? ""} ${err.message ?? ""}`;
          if (which.includes("an_bookings_active_slot")) return { ok: false, code: "SLOT_UNAVAILABLE" };
          if (which.includes("idempotency")) {
            const again = await byKey(input.idempotencyKey);
            if (again) return { ok: true, booking: again };
          }
          // reference collision — try a new one
        }
      }
      return { ok: false, code: "SERVER" };
    },
    async getBooking(reference) {
      await ready();
      const rows = await sql`select * from an_bookings where reference = ${reference}`;
      return rows[0] ? toBooking(rows[0]) : null;
    },
    async listBookings() {
      await ready();
      const rows = await sql`select * from an_bookings order by date_key, time limit 1000`;
      return rows.map(toBooking);
    },
    async setBookingStatus(reference, status) {
      await ready();
      try {
        const rows = await sql`update an_bookings set status = ${status}, updated_at = now()
          where reference = ${reference} returning *`;
        return rows[0] ? toBooking(rows[0]) : null;
      } catch (e) {
        // Re-activating a cancelled request whose slot has since been taken.
        if ((e as { code?: string }).code === "23505") return null;
        throw e;
      }
    },
    async createMessage(input) {
      await ready();
      const id = await newId();
      const rows = await sql`insert into an_messages (id, name, phone, message)
        values (${id}, ${input.name}, ${input.phone}, ${input.message}) returning *`;
      return toMessage(rows[0]);
    },
    async listMessages() {
      await ready();
      const rows = await sql`select * from an_messages order by created_at desc limit 500`;
      return rows.map(toMessage);
    },
    async setMessageStatus(id, status) {
      await ready();
      const rows = await sql`update an_messages set status = ${status} where id = ${id} returning id`;
      return rows.length > 0;
    },
  };
}

let cached: Store | null = null;

export function getStore(): Store {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  cached = url ? postgresStore(url) : memoryStore();
  return cached;
}
