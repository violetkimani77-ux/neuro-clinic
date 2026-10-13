import { createServerFn } from "@tanstack/react-start";
import {
  PRACTICE,
  diarySlots,
  isDiarySlot,
  longDateLabel,
  serviceName,
  services,
  slotInstant,
  timeLabel,
  type AppointmentStatus,
  type BookingRecord,
  type Preferred,
} from "~/lib/booking/practice";

/**
 * DR. ANDREW NYAONCHA — public booking server functions.
 *
 * Same contract and guarantees as the Premium Clinic booking path
 * (`-providence-booking.ts`), minus the specialist dimension — there is one
 * surgeon, so availability is the practice diary:
 *  - Idempotency: a retried submission with the same key returns the SAME
 *    booking and never duplicates.
 *  - Double-book: a second request for a taken slot gets `SLOT_UNAVAILABLE`
 *    (enforced by the store — a unique index when Postgres is connected).
 *  - Hold: the slot must still be inside its 5-minute hold, else `HOLD_EXPIRED`.
 *  - Every field is re-typed, bounded and allow-listed, and consent to the
 *    privacy policy is required.
 */

const HOLD_MS = 5 * 60 * 1000;
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
  preferredContact: Preferred;
  referral: "referred" | "direct";
  referringParty: string | null;
  consent: boolean;
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

async function store() {
  const { getStore } = await import("~/lib/server/store");
  return getStore();
}

export function toConfirmation(rec: BookingRecord): BookingConfirmation {
  return {
    reference: rec.reference,
    service: serviceName(rec.service),
    doctorName: PRACTICE.name,
    dateKey: rec.dateKey,
    time: rec.time,
    dateLabel: longDateLabel(rec.dateKey),
    timeLabel: timeLabel(rec.time),
    location: PRACTICE.location,
    address: PRACTICE.address,
    practicePhone: PRACTICE.phone,
    practicePhoneDisplay: PRACTICE.phoneDisplay,
    patientName: rec.fullName,
    preferredContact: rec.preferredContact,
    status: rec.status,
  };
}

/* ── getBookingAvailability: free diary slots grouped by day ───────────── */
export const getBookingAvailability = createServerFn().handler(async (): Promise<GetAvailabilityResult> => {
  try {
    const taken = await (await store()).takenSlots();
    const byDay = new Map<string, string[]>();
    for (const { dateKey, time } of diarySlots()) {
      if (taken.has(`${dateKey} ${time}`)) continue;
      const arr = byDay.get(dateKey) ?? [];
      arr.push(time);
      byDay.set(dateKey, arr);
    }
    const days = [...byDay.entries()].map(([dateKey, times]) => ({ dateKey, times, label: longDateLabel(dateKey) }));
    return { success: true, data: { days } };
  } catch (error) {
    console.error("[drandrew] availability failed:", error);
    return { success: false, code: "SERVER", message: "Could not load availability." };
  }
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
  const preferredContact = PREFERRED.includes(raw.preferredContact as never) ? (raw.preferredContact as Preferred) : "";
  const referral = raw.referral === "referred" || raw.referral === "direct" ? raw.referral : "";

  if (raw.consent !== true) return { error: "VALIDATION" };
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

  return { value: { idempotencyKey, service, dateKey, time, holdUntil, fullName, mobile, email: email || null, preferredContact, referral, referringParty, consent: true } };
}

export const submitBooking = createServerFn({ method: "POST" })
  // Typing only — every field is re-checked by sanitize() below.
  .validator((data: SubmitBookingPayload) => data)
  .handler(async ({ data }): Promise<SubmitBookingResponse> => {
    try {
      const check = sanitize(data);
      if ("error" in check) return { success: false, code: check.error };
      const c = check.value;
      // Only real diary slots that are still ahead can be requested.
      if (!isDiarySlot(c.dateKey, c.time) || slotInstant(c.dateKey, c.time) <= Date.now()) {
        return { success: false, code: "SLOT_UNAVAILABLE" };
      }
      const res = await (await store()).createBooking({
        idempotencyKey: c.idempotencyKey,
        service: c.service,
        dateKey: c.dateKey,
        time: c.time,
        preferredContact: c.preferredContact,
        fullName: c.fullName,
        mobile: c.mobile,
        email: c.email,
        referral: c.referral,
        referringParty: c.referringParty,
      });
      if (!res.ok) return { success: false, code: res.code };
      console.log("[drandrew] booking created:", res.booking.reference);
      return { success: true, booking: toConfirmation(res.booking) };
    } catch (error) {
      console.error("[drandrew] booking submission failed:", error);
      return { success: false, code: "SERVER" };
    }
  });

/* ── getBookingByReference: confirmation screen payload ────────────────── */
export const getBookingByReference = createServerFn()
  .validator((data: { reference: string }) => data)
  .handler(async ({ data }): Promise<{ success: true; data: BookingConfirmation | null }> => {
    const ref = typeof data?.reference === "string" ? data.reference.trim().toUpperCase().slice(0, 20) : "";
    if (!/^AN-[A-Z0-9]{5}$/.test(ref)) return { success: true, data: null };
    try {
      const rec = await (await store()).getBooking(ref);
      return { success: true, data: rec ? toConfirmation(rec) : null };
    } catch (error) {
      console.error("[drandrew] booking lookup failed:", error);
      return { success: true, data: null };
    }
  });

/* ── submitContactMessage: the home page "Book a consultation" call-back form ── */
export const submitContactMessage = createServerFn({ method: "POST" })
  .validator((data: { name: string; phone: string; message: string }) => data)
  .handler(async ({ data }): Promise<{ success: boolean }> => {
    const str = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");
    const name = str(data?.name, 120);
    const phone = str(data?.phone, 20);
    const message = str(data?.message, 2000);
    if (!name || !phone || !MOBILE_RE.test(phone)) return { success: false };
    try {
      await (await store()).createMessage({ name, phone, message });
      return { success: true };
    } catch (error) {
      console.error("[drandrew] contact message failed:", error);
      return { success: false };
    }
  });
