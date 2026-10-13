import { createServerFn } from "@tanstack/react-start";
import type { AppointmentStatus, BookingRecord } from "~/lib/booking/practice";
import type { ContactMessage, MessageStatus } from "~/lib/server/store";

/**
 * Staff screen server functions. Every read and write checks the session
 * cookie first — nothing here is reachable without signing in.
 */

export interface StaffState {
  signedIn: boolean;
  /** Sign-in possible at all (a password is configured, or demo mode). */
  enabled: boolean;
  demo: boolean;
  /** Data is stored in Postgres (shared by all server instances). */
  persistent: boolean;
}

export interface StaffData {
  bookings: BookingRecord[];
  messages: ContactMessage[];
}

const TRANSITIONS: Record<AppointmentStatus, AppointmentStatus[]> = {
  REQUESTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["COMPLETED", "CANCELLED"],
  CANCELLED: ["REQUESTED"],
  COMPLETED: [],
};

async function auth() {
  return import("~/lib/server/staff-auth");
}
async function store() {
  const { getStore } = await import("~/lib/server/store");
  return getStore();
}

export const getStaffState = createServerFn().handler(async (): Promise<StaffState> => {
  const a = await auth();
  const { password, demo } = a.staffPassword();
  return { signedIn: a.isSignedIn(), enabled: !!password, demo, persistent: (await store()).persistent };
});

export const staffSignIn = createServerFn({ method: "POST" })
  .validator((data: { password: string }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    const a = await auth();
    const attempt = typeof data?.password === "string" ? data.password.slice(0, 200) : "";
    if (!a.checkPassword(attempt)) {
      await new Promise((r) => setTimeout(r, 600)); // slow down guessing
      return { ok: false };
    }
    a.startSession();
    return { ok: true };
  });

export const staffSignOut = createServerFn({ method: "POST" }).handler(async () => {
  (await auth()).endSession();
  return { ok: true };
});

export const getStaffData = createServerFn().handler(async (): Promise<{ ok: false } | { ok: true; data: StaffData }> => {
  if (!(await auth()).isSignedIn()) return { ok: false };
  const s = await store();
  const [bookings, messages] = await Promise.all([s.listBookings(), s.listMessages()]);
  return { ok: true, data: { bookings, messages } };
});

export const setBookingStatus = createServerFn({ method: "POST" })
  .validator((data: { reference: string; status: AppointmentStatus }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean; reason?: "AUTH" | "INVALID" | "SLOT_TAKEN" }> => {
    if (!(await auth()).isSignedIn()) return { ok: false, reason: "AUTH" };
    const s = await store();
    const current = await s.getBooking(String(data?.reference ?? ""));
    if (!current || !TRANSITIONS[current.status].includes(data.status)) return { ok: false, reason: "INVALID" };
    const updated = await s.setBookingStatus(current.reference, data.status);
    return updated ? { ok: true } : { ok: false, reason: "SLOT_TAKEN" };
  });

export const setMessageStatus = createServerFn({ method: "POST" })
  .validator((data: { id: string; status: MessageStatus }) => data)
  .handler(async ({ data }): Promise<{ ok: boolean }> => {
    if (!(await auth()).isSignedIn()) return { ok: false };
    if (data?.status !== "NEW" && data?.status !== "HANDLED") return { ok: false };
    return { ok: await (await store()).setMessageStatus(String(data.id ?? ""), data.status) };
  });
