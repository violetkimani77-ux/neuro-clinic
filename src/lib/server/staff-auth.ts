/**
 * Staff sign-in (server only — import dynamically inside handlers).
 *
 * One shared password from STAFF_PASSWORD. A successful sign-in sets an
 * HttpOnly cookie holding an expiry and an HMAC of it keyed by the password,
 * so changing the password signs everyone out.
 *
 * Demo mode: with no DATABASE_URL (nothing real stored) and no
 * STAFF_PASSWORD, the password is "demo" and the sign-in screen says so.
 * Once a database is connected, STAFF_PASSWORD must be set or sign-in is off.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { deleteCookie, getCookie, setCookie } from "@tanstack/react-start/server";

const COOKIE = "an_staff";
const SESSION_MS = 12 * 60 * 60 * 1000;
export const DEMO_PASSWORD = "demo";

export function staffPassword(): { password: string | null; demo: boolean } {
  const set = process.env.STAFF_PASSWORD?.trim();
  if (set) return { password: set, demo: false };
  if (!process.env.DATABASE_URL) return { password: DEMO_PASSWORD, demo: true };
  return { password: null, demo: false };
}

function sign(expiry: number, password: string): string {
  return createHmac("sha256", password).update(`an-staff-v1:${expiry}`).digest("hex");
}

function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  return ab.length === bb.length && timingSafeEqual(ab, bb);
}

export function checkPassword(attempt: string): boolean {
  const { password } = staffPassword();
  if (!password) return false;
  // Compare HMACs so the comparison is constant-time whatever the lengths.
  return safeEqual(sign(0, attempt), sign(0, password));
}

export function startSession(): void {
  const { password } = staffPassword();
  if (!password) return;
  const expiry = Date.now() + SESSION_MS;
  setCookie(COOKIE, `${expiry}.${sign(expiry, password)}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MS / 1000,
  });
}

export function endSession(): void {
  deleteCookie(COOKIE, { path: "/" });
}

export function isSignedIn(): boolean {
  const { password } = staffPassword();
  const raw = getCookie(COOKIE);
  if (!password || !raw) return false;
  const [exp, sig] = raw.split(".");
  const expiry = Number(exp);
  if (!Number.isFinite(expiry) || expiry < Date.now() || !sig) return false;
  return safeEqual(sig, sign(expiry, password));
}
