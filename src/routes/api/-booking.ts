import { createServerFn } from "@tanstack/react-start";
import {
  PRACTICE,
  availabilitySlots,
  serviceName,
  services,
  submittedBookings,
  timeLabel,
  type AppointmentStatus,
  type BookingRecord,
} from "~/lib/booking/practice";

/**
 * DR. ANDREW NYAONCHA — booking server functions (mock-backed).
 *
 * Same contract and guarantees as the Premium Clinic booking path
 * (`-providence-booking.ts`), minus the specialist dimension — there is one
 * surgeon, so availability is the practice diary:
 *  - Idempotency: a retried submission with the same key returns the SAME
 *    booking and never duplicates.
 *  - In-process double-book: a second submission for a taken slot gets
 *    `SLOT_UNAVAILABLE`; the slot then disappears from availability.
 *  - Hold: the slot must still be inside its 5-minute hold, else `HOLD_EXPIRED`.
 *  - Every field is re-typed, bounded and allow-listed.
 */

const HOLD_MS = 5 * 60 * 1000;
const REF_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
const MOBILE_RE = /^(?=.*\d)[\d\s()+.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;
const PREFERRED = ["PHONE", "SMS", "EMAIL", "WHATSAPP"] as const;

/** One calendar day's free time slots (Step 2 DATE + Step 3 TIME). */
export interface BookingDay {
  dateKey: string; // YYYY-MM-DD
  times: string[]; // free 24h "HH:MM"
  label: string;
  weekdayLabel: string;
}

export type GetAvailabilityResult =
  | { success: true; data: { days: BookingDay[] } }
  | { success: false; code: string; message: string };

export interface SubmitBookingPayload {
  idempotencyKey: string;
  service: string;
  dateKey: string;
  time: string;
  holdUntil: number;
  fullName: string;
  mobile: string;
  email: string | null;
  preferredContact: (typeof PREFERRED)[number];
  referral: "referred" | "direct";
  referringParty: string | null;
}

export interface BookingConfirmation {
  reference: string;
  service: string;
  doctorName: string;
  dateKey: string;
  time: string;
  dateLabel: string;
  timeLabel: string;
  location: string;
  address: string;
  practicePhone: string;
  practicePhoneDisplay: string;
  patientName: string;
  preferredContact: string;
  status: AppointmentStatus;
}

export type SubmitBookingResponse =
  | { success: true; booking: BookingConfirmation }
  | { success: false; code: "VALIDATION" | "SLOT_UNAVAILABLE" | "HOLD_EXPIRED" | "SERVER" };

/* ── date/time helpers ─────────────────────────────────────────────────── */
function toDateKey(d: Date): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}
function toHM(startIso: string): string {
  const d = new Date(startIso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
function longDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short", year: "numeric" });
}
function weekdayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "long" });
}

/* ── getBookingAvailability: free slots grouped by day ─────────────────── */
export const getBookingAvailability = createServerFn().handler(async (): Promise<GetAvailabilityResult> => {
  const byDay = new Map<string, string[]>();
  const now = Date.now();
  for (const slot of availabilitySlots) {
    if (slot.status !== "free" || new Date(slot.startIso).getTime() <= now) continue;
    const key = toDateKey(new Date(slot.startIso));
    const arr = byDay.get(key) ?? [];
    arr.push(toHM(slot.startIso));
    byDay.set(key, arr);
  }
  const days = [...byDay.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([dateKey, times]) => ({ dateKey, times: times.sort(), label: longDateLabel(dateKey), weekdayLabel: weekdayLabel(dateKey) }));
  return { success: true, data: { days } };
});

/* ── submitBooking ─────────────────────────────────────────────────────── */
function sanitize(p: unknown): { error: "VALIDATION" | "HOLD_EXPIRED" } | { value: SubmitBookingPayload } {
  if (!p || typeof p !== "object") return { error: "VALIDATION" };
  const raw = p as Record<string, unknown>;
  const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

  const idempotencyKey = str(raw.idempotencyKey, 80);
  const service = str(raw.service, 80);
  const dateKey = str(raw.dateKey, 10);
  const time = str(raw.time, 5);
  const fullName = str(raw.fullName, 120);
  const mobile = str(raw.mobile, 20);
  const email = raw.email ? str(raw.email, 160) : null;
  const referringParty = raw.referringParty ? str(raw.referringParty, 160) : null;
  const holdUntil = typeof raw.holdUntil === "number" && Number.isFinite(raw.holdUntil) ? raw.holdUntil : NaN;
  const preferredContact = PREFERRED.includes(raw.preferredContact as never) ? (raw.preferredContact as SubmitBookingPayload["preferredContact"]) : "";
  const referral = raw.referral === "referred" || raw.referral === "direct" ? raw.referral : "";

  if (!idempotencyKey || !fullName || !mobile) return { error: "VALIDATION" };
  if (!services.some((s) => s.slug === service)) return { error: "VALIDATION" };
  if (!MOBILE_RE.test(mobile)) return { error: "VALIDATION" };
  if (email && !EMAIL_RE.test(email)) return { error: "VALIDATION" };
  if (!DATE_RE.test(dateKey) || !TIME_RE.test(time)) return { error: "VALIDATION" };
  if (!preferredContact || !referral) return { error: "VALIDATION" };
  if (referral === "referred" && !referringParty) return { error: "VALIDATION" };
  if (!Number.isFinite(holdUntil)) return { error: "VALIDATION" };
  if (Date.now() > holdUntil) return { error: "HOLD_EXPIRED" };
  if (holdUntil - Date.now() > HOLD_MS + 60_000) return { error: "VALIDATION" };

  return { value: { idempotencyKey, service, dateKey, time, holdUntil, fullName, mobile, email: email || null, preferredContact, referral, referringParty } };
}

function findSlot(dateKey: string, time: string) {
  const [y, m, d] = dateKey.split("-").map(Number);
  const [h, min] = time.split(":").map(Number);
  const iso = new Date(y, m - 1, d, h, min, 0, 0).toISOString();
  return availabilitySlots.find((s) => s.startIso === iso) ?? null;
}

function toConfirmation(rec: BookingRecord): BookingConfirmation {
  const dateKey = toDateKey(new Date(rec.startIso));
  const time = toHM(rec.startIso);
  return {
    reference: rec.reference,
    service: serviceName(rec.service),
    doctorName: PRACTICE.name,
    dateKey,
    time,
    dateLabel: longDateLabel(dateKey),
    timeLabel: timeLabel(time),
    location: PRACTICE.location,
    address: PRACTICE.address,
    practicePhone: PRACTICE.phone,
    practicePhoneDisplay: PRACTICE.phoneDisplay,
    patientName: rec.fullName,
    preferredContact: rec.preferredContact,
    status: rec.status,
  };
}

export const submitBooking = createServerFn({ method: "POST" })
  // Typing only — every field is re-checked by sanitize() below.
  .validator((data: SubmitBookingPayload) => data)
  .handler(async ({ data }): Promise<SubmitBookingResponse> => {
    try {
      const check = sanitize(data);
      if ("error" in check) return { success: false, code: check.error };
      const clean = check.value;

      const existing = submittedBookings.find((b) => b.idempotencyKey === clean.idempotencyKey);
      if (existing) return { success: true, booking: toConfirmation(existing) };

      const slot = findSlot(clean.dateKey, clean.time);
      if (!slot || slot.status !== "free") return { success: false, code: "SLOT_UNAVAILABLE" };
      slot.status = "booked";

      const { randomInt } = await import("node:crypto");
      let reference = "";
      for (let attempt = 0; attempt < 8; attempt += 1) {
        let ref = "AN-";
        for (let i = 0; i < 5; i += 1) ref += REF_CHARS[randomInt(REF_CHARS.length)];
        if (!submittedBookings.some((b) => b.reference === ref)) {
          reference = ref;
          break;
        }
      }
      if (!reference) {
        slot.status = "free";
        return { success: false, code: "SERVER" };
      }

      const record: BookingRecord = {
        idempotencyKey: clean.idempotencyKey,
        reference,
        service: clean.service,
        startIso: slot.startIso,
        status: "REQUESTED",
        preferredContact: clean.preferredContact,
        fullName: clean.fullName,
        mobile: clean.mobile,
        email: clean.email,
        referral: clean.referral,
        referringParty: clean.referringParty,
        createdAt: new Date().toISOString(),
      };
      submittedBookings.push(record);
      console.log("[drandrew] booking created:", reference);
      return { success: true, booking: toConfirmation(record) };
    } catch (error) {
      console.error("[drandrew] booking submission failed:", error);
      return { success: false, code: "SERVER" };
    }
  });

/* ── getBookingByReference: confirmation screen payload ────────────────── */
export const getBookingByReference = createServerFn()
  .validator((data: { reference: string }) => data)
  .handler(async ({ data }): Promise<{ success: true; data: BookingConfirmation | null }> => {
    const ref = typeof data?.reference === "string" ? data.reference.trim().slice(0, 20) : "";
    if (!/^AN-[A-Z0-9]{5}$/.test(ref)) return { success: true, data: null };
    const rec = submittedBookings.find((b) => b.reference === ref);
    return { success: true, data: rec ? toConfirmation(rec) : null };
  });
