import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  PRACTICE,
  contactPhrase,
  longDateLabel,
  serviceName,
  slotInstant,
  timeLabel,
  toWhatsAppDigits,
  type AppointmentStatus,
  type BookingRecord,
} from "~/lib/booking/practice";
import type { ContactMessage } from "~/lib/server/store";
import {
  getStaffData,
  getStaffState,
  setBookingStatus,
  setMessageStatus,
  staffSignIn,
  staffSignOut,
  type StaffData,
  type StaffState,
} from "~/routes/api/-staff";

/**
 * Staff screen — where Dr. Nyaoncha's team works through online booking
 * requests and call-back messages: confirm or decline requests, mark visits
 * completed, and message or call patients (WhatsApp messages are prefilled).
 * Not linked from the public site; password-protected (see staff-auth.ts).
 */

export const Route = createFileRoute("/staff")({
  component: StaffPage,
  head: () => ({
    meta: [
      { title: "Staff — Dr. Andrew Nyaoncha" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
});

type Tab = "new" | "upcoming" | "past" | "cancelled" | "messages";
const REFRESH_MS = 30_000;

const STATUS_LABEL: Record<AppointmentStatus, string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

function waLink(phone: string, text: string): string | null {
  const digits = toWhatsAppDigits(phone);
  return digits ? `https://wa.me/${digits}?text=${encodeURIComponent(text)}` : null;
}

function patientMessage(b: BookingRecord): string {
  const first = b.fullName.split(/\s+/)[0];
  const when = `${longDateLabel(b.dateKey)} at ${timeLabel(b.time)}`;
  if (b.status === "CONFIRMED") {
    return `Hello ${first}, this is Dr. Andrew Nyaoncha's office. Your consultation (${serviceName(b.service)}) is confirmed for ${when} at ${PRACTICE.address}. Please arrive 15 minutes early and bring any scans, reports or referral letter. Reference: ${b.reference}.`;
  }
  if (b.status === "CANCELLED") {
    return `Hello ${first}, this is Dr. Andrew Nyaoncha's office about your request for ${when} (ref ${b.reference}). Unfortunately we can't see you at that time. Please reply or call ${PRACTICE.phoneDisplay} and we'll find another time.`;
  }
  return `Hello ${first}, this is Dr. Andrew Nyaoncha's office about your appointment request for ${when} (ref ${b.reference}).`;
}

function ago(iso: string): string {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

function StaffPage() {
  const [state, setState] = useState<StaffState | null>(null);
  const refreshState = useCallback(() => {
    getStaffState()
      .then(setState)
      .catch(() => setState({ signedIn: false, enabled: false, demo: false, persistent: false }));
  }, []);
  useEffect(refreshState, [refreshState]);

  return (
    <main className="cq-page cq-staff">
      <header className="cq-staff__bar">
        <div className="cq-staff__brand">
          <span className="cq-nav__name">Nyaoncha</span>
          <span className="cq-nav__role">Staff · Appointments</span>
        </div>
        {state?.signedIn && (
          <button type="button" className="cq-staff__signout" onClick={() => staffSignOut().finally(refreshState)}>
            Sign out
          </button>
        )}
      </header>
      {!state ? (
        <p className="cq-staff__loading" role="status">Loading…</p>
      ) : state.signedIn ? (
        <Dashboard state={state} onSignedOut={refreshState} />
      ) : (
        <SignIn state={state} onSignedIn={refreshState} />
      )}
    </main>
  );
}

function SignIn({ state, onSignedIn }: { state: StaffState; onSignedIn: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const r = await staffSignIn({ data: { password } });
      if (r.ok) onSignedIn();
      else setError("That password isn't right.");
    } catch {
      setError("Couldn't sign in. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  if (!state.enabled) {
    return (
      <section className="cq-staff__signin">
        <h1>Staff sign-in is switched off</h1>
        <p>Set the <code>STAFF_PASSWORD</code> environment variable on the server to turn it on.</p>
      </section>
    );
  }

  return (
    <section className="cq-staff__signin">
      <h1>Staff sign-in</h1>
      <p>Appointment requests and call-back messages for Dr. Nyaoncha&rsquo;s practice.</p>
      {state.demo && (
        <p className="cq-staff__demo">Demo mode — the password is <strong>demo</strong>.</p>
      )}
      <form onSubmit={submit}>
        <div className="cq-field">
          <label htmlFor="staff-password">Password</label>
          <input id="staff-password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="cq-form-error" role="alert">{error}</p>}
        <button type="submit" className="cq-btn cq-btn--primary cq-btn--block" disabled={busy}>
          {busy ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </section>
  );
}

function Dashboard({ state, onSignedOut }: { state: StaffState; onSignedOut: () => void }) {
  const [data, setData] = useState<StaffData | null>(null);
  const [tab, setTab] = useState<Tab>("new");
  const [loadError, setLoadError] = useState(false);
  const [notice, setNotice] = useState("");
  const [updated, setUpdated] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const load = useCallback(async () => {
    try {
      const r = await getStaffData();
      if (!r.ok) return onSignedOut();
      setData(r.data);
      setLoadError(false);
      setUpdated(Date.now());
      setNow(Date.now());
    } catch {
      setLoadError(true);
    }
  }, [onSignedOut]);

  useEffect(() => {
    load();
    const iv = setInterval(load, REFRESH_MS);
    return () => clearInterval(iv);
  }, [load]);

  const groups = useMemo(() => {
    const bookings = data?.bookings ?? [];
    const isPast = (b: BookingRecord) => slotInstant(b.dateKey, b.time) < now;
    const asc = (a: BookingRecord, b: BookingRecord) => slotInstant(a.dateKey, a.time) - slotInstant(b.dateKey, b.time);
    return {
      new: bookings.filter((b) => b.status === "REQUESTED" && !isPast(b)).sort(asc),
      upcoming: bookings.filter((b) => b.status === "CONFIRMED" && !isPast(b)).sort(asc),
      past: bookings.filter((b) => b.status !== "CANCELLED" && (isPast(b) || b.status === "COMPLETED")).sort((a, b) => asc(b, a)),
      cancelled: bookings.filter((b) => b.status === "CANCELLED").sort(asc),
    };
  }, [data, now]);

  const messages = useMemo(
    () => [...(data?.messages ?? [])].sort((a, b) => (a.status === b.status ? b.createdAt.localeCompare(a.createdAt) : a.status === "NEW" ? -1 : 1)),
    [data],
  );
  const newMessages = messages.filter((m) => m.status === "NEW").length;

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Nairobi" }).format(new Date(now));
  const todayCount = groups.upcoming.filter((b) => b.dateKey === today).length;

  const changeStatus = async (b: BookingRecord, status: AppointmentStatus) => {
    const r = await setBookingStatus({ data: { reference: b.reference, status } });
    if (!r.ok) {
      if (r.reason === "AUTH") return onSignedOut();
      setNotice(r.reason === "SLOT_TAKEN" ? "That time has since been booked by someone else." : "That change isn't possible any more — the list has been refreshed.");
    } else {
      setNotice(`${b.fullName}: ${STATUS_LABEL[status].toLowerCase()}.`);
    }
    await load();
  };

  const changeMessage = async (m: ContactMessage, status: "NEW" | "HANDLED") => {
    const r = await setMessageStatus({ data: { id: m.id, status } });
    if (!r.ok) setNotice("Couldn't update that message.");
    await load();
  };

  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: "new", label: "New requests", count: groups.new.length },
    { id: "upcoming", label: "Confirmed", count: groups.upcoming.length },
    { id: "messages", label: "Call-backs", count: newMessages },
    { id: "past", label: "Past", count: groups.past.length },
    { id: "cancelled", label: "Cancelled", count: groups.cancelled.length },
  ];

  return (
    <div className="cq-staff__body">
      {!state.persistent && (
        <p className="cq-staff__warn" role="note">
          <strong>Demo storage.</strong> Requests are kept in server memory, so they can disappear after a restart and
          may not show up on every visit. Connect a database (<code>DATABASE_URL</code>) to keep them.
        </p>
      )}

      <div className="cq-staff__summary">
        <div><b>{groups.new.length}</b><span>waiting for a reply</span></div>
        <div><b>{todayCount}</b><span>confirmed today</span></div>
        <div><b>{newMessages}</b><span>call-backs to make</span></div>
        <button type="button" className="cq-btn cq-btn--ghost cq-staff__refresh" onClick={load}>Refresh</button>
      </div>
      <p className="cq-staff__updated" aria-live="polite">
        {loadError ? "Couldn't refresh — check your connection." : updated ? `Updated ${new Date(updated).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })} · refreshes every 30 seconds` : "Loading…"}
      </p>

      <nav className="cq-staff__tabs" aria-label="Views">
        {tabs.map((t) => (
          <button key={t.id} type="button" className={`cq-staff__tab${tab === t.id ? " cq-staff__tab--on" : ""}`} aria-pressed={tab === t.id} onClick={() => setTab(t.id)}>
            {t.label}
            {t.count > 0 && <span className="cq-staff__count">{t.count}</span>}
          </button>
        ))}
      </nav>

      {notice && (
        <div className="cq-staff__notice" role="status">
          {notice}
          <button type="button" onClick={() => setNotice("")} aria-label="Dismiss">×</button>
        </div>
      )}

      {tab === "messages" ? (
        <MessageList messages={messages} onChange={changeMessage} />
      ) : (
        <BookingList bookings={groups[tab]} tab={tab} onChange={changeStatus} />
      )}
    </div>
  );
}

const EMPTY: Record<Exclude<Tab, "messages">, string> = {
  new: "No new requests. New online bookings appear here.",
  upcoming: "No confirmed appointments coming up.",
  past: "No past appointments yet.",
  cancelled: "Nothing cancelled.",
};

function BookingList({ bookings, tab, onChange }: { bookings: BookingRecord[]; tab: Exclude<Tab, "messages">; onChange: (b: BookingRecord, s: AppointmentStatus) => Promise<void> }) {
  if (!bookings.length) return <p className="cq-staff__empty">{EMPTY[tab]}</p>;
  let lastDay = "";
  return (
    <div className="cq-staff__list">
      {bookings.map((b) => {
        const header = b.dateKey !== lastDay ? longDateLabel(b.dateKey) : null;
        lastDay = b.dateKey;
        return (
          <div key={b.reference}>
            {header && <h2 className="cq-staff__day">{header}</h2>}
            <BookingCard b={b} onChange={onChange} />
          </div>
        );
      })}
    </div>
  );
}

function BookingCard({ b, onChange }: { b: BookingRecord; onChange: (b: BookingRecord, s: AppointmentStatus) => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const act = async (s: AppointmentStatus) => {
    setBusy(true);
    try {
      await onChange(b, s);
    } finally {
      setBusy(false);
    }
  };
  const wa = waLink(b.mobile, patientMessage(b));
  return (
    <article className={`cq-staff__card cq-staff__card--${b.status.toLowerCase()}`}>
      <div className="cq-staff__time">
        <b>{timeLabel(b.time)}</b>
        <span className={`cq-status cq-status--${b.status.toLowerCase()}`}>{STATUS_LABEL[b.status]}</span>
      </div>
      <div className="cq-staff__main">
        <h3>{b.fullName}</h3>
        <p className="cq-staff__service">{serviceName(b.service)}</p>
        <dl className="cq-staff__facts">
          <div><dt>Mobile</dt><dd><a href={`tel:${b.mobile.replace(/\s+/g, "")}`}>{b.mobile}</a></dd></div>
          {b.email && <div><dt>Email</dt><dd><a href={`mailto:${b.email}`}>{b.email}</a></dd></div>}
          <div><dt>Prefers</dt><dd>{contactPhrase(b.preferredContact)}</dd></div>
          <div><dt>Referral</dt><dd>{b.referral === "referred" ? `Referred by ${b.referringParty}` : "Direct"}</dd></div>
          <div><dt>Reference</dt><dd>{b.reference}</dd></div>
          <div><dt>Requested</dt><dd>{ago(b.createdAt)}</dd></div>
        </dl>
      </div>
      <div className="cq-staff__actions">
        {b.status === "REQUESTED" && (
          <>
            <button type="button" className="cq-btn cq-btn--primary" disabled={busy} onClick={() => act("CONFIRMED")}>Confirm</button>
            <button type="button" className="cq-btn cq-btn--ghost" disabled={busy} onClick={() => act("CANCELLED")}>Decline</button>
          </>
        )}
        {b.status === "CONFIRMED" && (
          <>
            {slotInstant(b.dateKey, b.time) < Date.now() && (
              <button type="button" className="cq-btn cq-btn--primary" disabled={busy} onClick={() => act("COMPLETED")}>Mark seen</button>
            )}
            <button type="button" className="cq-btn cq-btn--ghost" disabled={busy} onClick={() => act("CANCELLED")}>Cancel</button>
          </>
        )}
        {b.status === "CANCELLED" && slotInstant(b.dateKey, b.time) > Date.now() && (
          <button type="button" className="cq-btn cq-btn--ghost" disabled={busy} onClick={() => act("REQUESTED")}>Restore</button>
        )}
        {wa && b.status !== "COMPLETED" && (
          <a className="cq-btn cq-btn--wa" href={wa} target="_blank" rel="noopener noreferrer">
            {b.status === "CONFIRMED" ? "Send confirmation" : b.status === "CANCELLED" ? "Offer another time" : "WhatsApp"}
          </a>
        )}
        <a className="cq-btn cq-btn--ghost" href={`tel:${b.mobile.replace(/\s+/g, "")}`}>Call</a>
      </div>
    </article>
  );
}

function MessageList({ messages, onChange }: { messages: ContactMessage[]; onChange: (m: ContactMessage, s: "NEW" | "HANDLED") => Promise<void> }) {
  if (!messages.length) return <p className="cq-staff__empty">No call-back requests. Messages from the website&rsquo;s contact form appear here.</p>;
  return (
    <div className="cq-staff__list">
      {messages.map((m) => {
        const wa = waLink(m.phone, `Hello ${m.name.split(/\s+/)[0]}, this is Dr. Andrew Nyaoncha's office returning your message.`);
        return (
          <article key={m.id} className={`cq-staff__card${m.status === "HANDLED" ? " cq-staff__card--handled" : ""}`}>
            <div className="cq-staff__time">
              <b>{ago(m.createdAt)}</b>
              <span className={`cq-status${m.status === "HANDLED" ? " cq-status--completed" : ""}`}>{m.status === "HANDLED" ? "Done" : "Call back"}</span>
            </div>
            <div className="cq-staff__main">
              <h3>{m.name}</h3>
              <p className="cq-staff__service"><a href={`tel:${m.phone.replace(/\s+/g, "")}`}>{m.phone}</a></p>
              {m.message && <p className="cq-staff__message">{m.message}</p>}
            </div>
            <div className="cq-staff__actions">
              {m.status === "NEW" ? (
                <button type="button" className="cq-btn cq-btn--primary" onClick={() => onChange(m, "HANDLED")}>Mark done</button>
              ) : (
                <button type="button" className="cq-btn cq-btn--ghost" onClick={() => onChange(m, "NEW")}>Reopen</button>
              )}
              {wa && <a className="cq-btn cq-btn--wa" href={wa} target="_blank" rel="noopener noreferrer">WhatsApp</a>}
              <a className="cq-btn cq-btn--ghost" href={`tel:${m.phone.replace(/\s+/g, "")}`}>Call</a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
