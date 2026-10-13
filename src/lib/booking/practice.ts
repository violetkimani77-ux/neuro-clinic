/**
 * DR. ANDREW NYAONCHA — booking data (in-memory mock, mirrors the Premium
 * Clinic `lib/providence/mock.ts` shape).
 *
 * Practice details (name, phone, address, hours, services) come from the demo
 * page itself. Availability is ILLUSTRATIVE demo data generated inside the
 * published hours — it is not the practice's real diary. Submitted requests are
 * held in memory and reset when the server restarts.
 */

export const PRACTICE = {
  name: "Dr. Andrew Nyaoncha",
  role: "Consultant Neurosurgeon",
  location: "Doctors Plaza",
  address: "Doctors Plaza, Nyeri, Kenya",
  phone: "+254721358137",
  phoneDisplay: "0721 358137",
  /* WhatsApp uses the practice's published phone number. Replace with the
     practice's WhatsApp Business number if it differs. Digits only, with
     country code, as wa.me expects. */
  whatsapp: "254721358137",
  hours: "Mon–Fri 8:00–17:00 · Sat 8:00–13:00 · Sun closed",
};

export interface Service {
  slug: string;
  name: string;
  scope: string;
}

/* Same six services, wording and order as the home page "What I treat" list. */
export const services: Service[] = [
  { slug: "brain-tumour-surgery", name: "Brain Tumour Surgery", scope: "Microsurgical removal of brain tumours using modern techniques — meticulous care for healthy tissue." },
  { slug: "aneurysm-surgery", name: "Aneurysm Surgery", scope: "Precision surgery for cerebral aneurysms — described by patients as the best in Kenya." },
  { slug: "spinal-surgery", name: "Spinal Surgery", scope: "Spinal fusions, decompressions and treatment for cervical spine conditions and infections." },
  { slug: "paediatric-neurosurgery", name: "Paediatric Neurosurgery", scope: "Correction of congenital abnormalities in children — compassionate, family-centred care." },
  { slug: "neurosurgical-assessment", name: "Neurosurgical Assessment", scope: "Comprehensive evaluation and diagnosis for conditions of the brain, spine and nervous system." },
  { slug: "general-surgery", name: "General Surgery", scope: "Broad surgical expertise, grounded in general surgery training at Aga Khan University." },
];

export function serviceName(slug: string | null): string {
  return services.find((s) => s.slug === slug)?.name ?? "Consultation";
}

export type AppointmentStatus = "REQUESTED" | "CONFIRMED" | "CANCELLED" | "COMPLETED";
export type Preferred = "PHONE" | "SMS" | "EMAIL" | "WHATSAPP";

/** How a contact channel reads mid-sentence ("confirm by WhatsApp"). */
export function contactPhrase(c: string | null | undefined): string {
  return ({ PHONE: "phone", SMS: "SMS", EMAIL: "email", WHATSAPP: "WhatsApp" } as Record<string, string>)[c ?? ""] ?? "phone";
}

/** A booking as staff and the confirmation screen see it. */
export interface BookingRecord {
  reference: string;
  idempotencyKey: string;
  service: string;
  dateKey: string; // YYYY-MM-DD, practice local date (Africa/Nairobi)
  time: string; // "HH:MM", practice local time
  status: AppointmentStatus;
  preferredContact: Preferred;
  fullName: string;
  mobile: string;
  email: string | null;
  referral: "referred" | "direct";
  referringParty: string | null;
  consentAt: string;
  createdAt: string;
}

/* ── Diary: illustrative slots inside the published hours ────────────────
   Mon–Fri 08:00–17:00 and Sat 08:00–13:00, so weekday slots run 09:00–15:00
   and Saturday slots stop at 11:00. Sunday closed. All times are practice
   local time (Africa/Nairobi, UTC+3, no daylight saving) whatever timezone
   the server runs in. */
export const PRACTICE_TZ = "Africa/Nairobi";
const PRACTICE_UTC_OFFSET = "+03:00";
const WEEKDAY_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00"];
const SATURDAY_TIMES = ["09:00", "10:00", "11:00"];
const DIARY_DAYS = 21;

/** Today's date in the practice timezone, as YYYY-MM-DD. */
export function practiceToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PRACTICE_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** Epoch ms of a practice-local date + time. */
export function slotInstant(dateKey: string, time: string): number {
  return Date.parse(`${dateKey}T${time}:00${PRACTICE_UTC_OFFSET}`);
}

/** Every diary slot for the next DIARY_DAYS days that is still in the future. */
export function diarySlots(now = Date.now()): { dateKey: string; time: string }[] {
  const [y, m, d] = practiceToday(new Date(now)).split("-").map(Number);
  const out: { dateKey: string; time: string }[] = [];
  for (let i = 1; i <= DIARY_DAYS; i++) {
    const day = new Date(Date.UTC(y, m - 1, d + i));
    const dow = day.getUTCDay();
    if (dow === 0) continue;
    const dateKey = day.toISOString().slice(0, 10);
    for (const time of dow === 6 ? SATURDAY_TIMES : WEEKDAY_TIMES) {
      if (slotInstant(dateKey, time) > now) out.push({ dateKey, time });
    }
  }
  return out;
}

export function isDiarySlot(dateKey: string, time: string, now = Date.now()): boolean {
  return diarySlots(now).some((s) => s.dateKey === dateKey && s.time === time);
}

/** "Wed, 14 Oct 2026" for a YYYY-MM-DD key, independent of the runtime timezone. */
export function longDateLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-GB", { timeZone: "UTC", weekday: "short", day: "numeric", month: "short", year: "numeric" });
}

/** Kenyan mobile in any common form -> wa.me digits (e.g. 0712 345678 -> 254712345678). */
export function toWhatsAppDigits(phone: string): string | null {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 10) digits = `254${digits.slice(1)}`;
  else if ((digits.startsWith("7") || digits.startsWith("1")) && digits.length === 9) digits = `254${digits}`;
  return digits.length >= 10 && digits.length <= 15 ? digits : null;
}

/** "10:00" (24h) -> "10:00 AM". */
export function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/** wa.me deep link that opens a chat with the practice, message prefilled. */
export function whatsappLink(message: string): string {
  return `https://wa.me/${PRACTICE.whatsapp}?text=${encodeURIComponent(message)}`;
}
