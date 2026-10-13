import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import CqShell from "~/components/drandrew/CqShell";
import { PRACTICE, contactPhrase } from "~/lib/booking/practice";
import { getBookingByReference, type BookingConfirmation } from "~/routes/api/-booking";

/**
 * Booking confirmation — same screen as the Premium Clinic confirmation:
 * "Request sent" state, status badge, reference, full summary, "What
 * happens next" and Add-to-calendar. Reads `?ref=AN-XXXXX`.
 */

export const Route = createFileRoute("/book/confirmation")({
  validateSearch: (search: Record<string, unknown>) => ({
    ref: typeof search.ref === "string" ? search.ref.trim() : "",
  }),
  component: ConfirmationPage,
  head: () => ({
    meta: [
      { title: "Appointment Requested — Dr. Andrew Nyaoncha" },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CheckIcon() {
  return (
    <svg viewBox="0 0 72 72" width="56" height="56" aria-hidden="true" focusable="false">
      <circle cx="36" cy="36" r="34" fill="#11555D" />
      <path d="M23.5 37.5 32 46l17-19.5" fill="none" stroke="#FFFFFF" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const STATUS_LABEL: Record<BookingConfirmation["status"], string> = {
  REQUESTED: "Requested",
  CONFIRMED: "Confirmed",
  CANCELLED: "Cancelled",
  COMPLETED: "Completed",
};

const WHATS_NEXT = [
  {
    title: "The practice confirms your request",
    body: "Dr. Nyaoncha's team reviews your request and confirms your appointment and consultation fee by your preferred contact — usually within one working day.",
  },
  {
    title: "Bring what you have",
    body: "If you have scans (CT or MRI), reports or a referral letter, bring them along — they help Dr. Nyaoncha plan your care.",
  },
  {
    title: "Arrive and see Dr. Nyaoncha",
    body: "Arrive 15 minutes early at Doctors Plaza, Nyeri.",
  },
];

function calendarUrl(b: BookingConfirmation): string {
  const [y, m, d] = b.dateKey.split("-").map(Number);
  const [hh, mm] = b.time.split(":").map(Number);
  const start = new Date(y, m - 1, d, hh, mm);
  const end = new Date(start.getTime() + 45 * 60000);
  const p = (n: number) => String(n).padStart(2, "0");
  const fmt = (dt: Date) => `${dt.getFullYear()}${p(dt.getMonth() + 1)}${p(dt.getDate())}T${p(dt.getHours())}${p(dt.getMinutes())}00`;
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Consultation with ${b.doctorName}`,
    dates: `${fmt(start)}/${fmt(end)}`,
    location: b.address,
    details: `Booking reference: ${b.reference}. ${b.service}. Practice phone: ${b.practicePhoneDisplay}.`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function readStored(ref: string): BookingConfirmation | null {
  try {
    const raw = sessionStorage.getItem(`an-booking:${ref}`);
    return raw ? (JSON.parse(raw) as BookingConfirmation) : null;
  } catch {
    return null;
  }
}

function ConfirmationPage() {
  const { ref } = Route.useSearch();
  const [state, setState] = useState<{ kind: "loading" } | { kind: "missing" } | { kind: "ready"; booking: BookingConfirmation }>({ kind: "loading" });

  useEffect(() => {
    let active = true;
    getBookingByReference({ data: { reference: ref } })
      .then((r) => r.data)
      .catch(() => null)
      .then((fromServer) => {
        if (!active) return;
        const booking = fromServer ?? readStored(ref);
        setState(booking ? { kind: "ready", booking } : { kind: "missing" });
      });
    return () => {
      active = false;
    };
  }, [ref]);

  return (
    <CqShell>
      <section className="cq-section cq-confirm">
        <div className="cq-container cq-confirm__inner">
          {state.kind === "loading" && <p role="status" className="cq-bk__loading">Loading your appointment…</p>}

          {state.kind === "missing" && (
            <div className="cq-confirm__missing">
              <h1 className="cq-h2">Appointment not found</h1>
              <p className="cq-lead">We couldn&rsquo;t find a booking for that reference. Check the reference in the link, or call the practice for help.</p>
              <a href={`tel:${PRACTICE.phone}`} className="cq-btn cq-btn--primary">Call {PRACTICE.phoneDisplay}</a>
            </div>
          )}

          {state.kind === "ready" && <Ready booking={state.booking} />}
        </div>
      </section>
    </CqShell>
  );
}

function Ready({ booking: b }: { booking: BookingConfirmation }) {
  return (
    <div>
      <div className="cq-confirm__head">
        <CheckIcon />
        <p className="cq-eyebrow">Dr. Andrew Nyaoncha</p>
        <h1 className="cq-h2">Request sent</h1>
        <p className="cq-lead">Your appointment request has been received. The practice will confirm your appointment by {contactPhrase(b.preferredContact)}.</p>
        <span className={`cq-status cq-status--${b.status.toLowerCase()}`}>{STATUS_LABEL[b.status]}</span>
        <p className="cq-confirm__ref">Reference <strong>{b.reference}</strong></p>
      </div>

      <dl className="cq-review">
        <div className="cq-review__row"><dt>Reason for visit</dt><dd>{b.service}<small>with {b.doctorName}</small></dd></div>
        <div className="cq-review__row"><dt>Date</dt><dd>{b.dateLabel}</dd></div>
        <div className="cq-review__row"><dt>Time</dt><dd>{b.timeLabel}</dd></div>
        <div className="cq-review__row"><dt>Location</dt><dd>{b.location}<small>{b.address}</small></dd></div>
        <div className="cq-review__row"><dt>Practice phone</dt><dd><a href={`tel:${b.practicePhone}`}>{b.practicePhoneDisplay}</a></dd></div>
      </dl>

      <section className="cq-confirm__next" aria-labelledby="an-whatsnext">
        <h2 id="an-whatsnext">What happens next</h2>
        <ol>
          {WHATS_NEXT.map((s, i) => (
            <li key={s.title}>
              <span className="cq-confirm__num" aria-hidden="true">{i + 1}</span>
              <div>
                <strong>{s.title}</strong>
                <p>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <div className="cq-confirm__actions">
        <a className="cq-btn cq-btn--primary" href={calendarUrl(b)} target="_blank" rel="noopener noreferrer">Add to calendar</a>
        <a className="cq-btn cq-btn--ghost" href="/">Back to home</a>
      </div>
      <p className="cq-confirm__note">
        Keep your reference <strong>{b.reference}</strong> — quote it if you call to change your appointment. Demo booking flow — requests are not sent to the practice.
      </p>
    </div>
  );
}
