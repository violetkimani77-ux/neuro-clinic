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

export interface AvailabilitySlot {
  id: string;
  startIso: string;
  status: "free" | "booked";
}

export interface BookingRecord {
  idempotencyKey: string;
  reference: string;
  service: string;
  startIso: string;
  status: AppointmentStatus;
  preferredContact: Preferred;
  fullName: string;
  mobile: string;
  email: string | null;
  referral: "referred" | "direct";
  referringParty: string | null;
  createdAt: string;
}

/* ── Availability: next ~21 days inside published hours ─────────────────
   Mon–Fri 08:00–17:00 and Sat 08:00–13:00, so weekday slots run 09:00–15:00
   and Saturday slots stop at 11:00. Sunday closed. */
const WEEKDAY_TIMES = ["09:00", "10:00", "11:00", "14:00", "15:00"];
const SATURDAY_TIMES = ["09:00", "10:00", "11:00"];

function buildSlots(): AvailabilitySlot[] {
  const slots: AvailabilitySlot[] = [];
  const now = new Date();
  for (let d = 1; d <= 21; d++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + d);
    const dow = day.getDay();
    if (dow === 0) continue;
    for (const time of dow === 6 ? SATURDAY_TIMES : WEEKDAY_TIMES) {
      const [h, m] = time.split(":").map(Number);
      const start = new Date(day);
      start.setHours(h, m, 0, 0);
      slots.push({ id: `slot-${start.toISOString()}`, startIso: start.toISOString(), status: "free" });
    }
  }
  return slots;
}

export const availabilitySlots: AvailabilitySlot[] = buildSlots();
export const submittedBookings: BookingRecord[] = [];

/** "10:00" (24h) -> "10:00 AM". */
export function timeLabel(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return hhmm;
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}
