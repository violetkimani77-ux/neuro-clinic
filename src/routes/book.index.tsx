import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import CqShell from "~/components/drandrew/CqShell";
import { PRACTICE } from "~/lib/booking/practice";

/**
 * Booking front door — same two-choice pattern as the Premium Clinic
 * `/book` page (Book an appointment / Manage my appointment, plus a
 * "Prefer to talk to someone?" block), in the Nyaoncha brand.
 */

export const Route = createFileRoute("/book/")({
  component: BookFrontDoor,
  head: () => ({
    meta: [
      { title: "Book a Consultation — Dr. Andrew Nyaoncha, Consultant Neurosurgeon" },
      { name: "description", content: "Request a consultation with Dr. Andrew Nyaoncha at Doctors Plaza, Nyeri — choose your reason for visit, pick a date and time, and send your request." },
      { name: "robots", content: "noindex" },
    ],
  }),
});

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <rect x="3" y="4" width="18" height="17" rx="2" />
      <path d="M16 2v4M8 2v4M3 9h18" />
    </svg>
  );
}
function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-3.6 3.1-6 8-6s8 2.4 8 6" />
    </svg>
  );
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m9 6 6 6-6 6" />
    </svg>
  );
}
function PhoneIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 5.18 2 2 0 0 1 4.11 3h3a2 2 0 0 1 2 1.72c.13 1.02.37 2.02.72 2.96a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.13-1.13a2 2 0 0 1 2.11-.45c.94.35 1.94.59 2.96.72A2 2 0 0 1 22 16.92Z" />
    </svg>
  );
}

type DoorChoice = "book" | "manage";

function BookFrontDoor() {
  const [choice, setChoice] = useState<DoorChoice | null>(null);

  return (
    <CqShell>
      <section className="cq-section cq-door">
        <div className="cq-container cq-door__inner">
          <p className="cq-eyebrow">Book a consultation</p>
          <h1 className="cq-h2">How would you like to get started?</h1>
          <p className="cq-lead">
            Request a consultation with Dr. Nyaoncha at Doctors Plaza, Nyeri — at a time
            that suits you.
          </p>

          <div className="cq-door__cards" role="radiogroup" aria-label="What would you like to do?">
            <label className={`cq-radio-card${choice === "book" ? " cq-radio-card--selected" : ""}`}>
              <input type="radio" name="door-choice" value="book" checked={choice === "book"} onChange={() => setChoice("book")} />
              <span className="cq-door__icon" aria-hidden="true"><CalendarIcon /></span>
              <span className="cq-door__body">
                <span className="cq-door__title">Book an appointment</span>
                <span className="cq-door__support">Tell us the reason for your visit, then pick a date and time to request a consultation.</span>
              </span>
            </label>

            <label className={`cq-radio-card${choice === "manage" ? " cq-radio-card--selected" : ""}`}>
              <input type="radio" name="door-choice" value="manage" checked={choice === "manage"} onChange={() => setChoice("manage")} />
              <span className="cq-door__icon" aria-hidden="true"><UserIcon /></span>
              <span className="cq-door__body">
                <span className="cq-door__title">Manage my appointment</span>
                <span className="cq-door__support">View or change an appointment you&rsquo;ve already requested.</span>
              </span>
            </label>
          </div>

          {choice === "book" && (
            <div className="cq-door__action">
              <a href="/book/start" className="cq-btn cq-btn--primary cq-btn--lg cq-btn--block">
                Start booking
                <ChevronIcon />
              </a>
            </div>
          )}
          {choice === "manage" && (
            <div className="cq-door__note" role="status">
              <p>
                Online appointment management is coming soon. To view, move or cancel a request,
                call <a href={`tel:${PRACTICE.phone}`}>{PRACTICE.phoneDisplay}</a> and quote your booking
                reference (e.g. <strong>AN-XXXXX</strong>) from the confirmation screen.
              </p>
            </div>
          )}

          <section className="cq-door__support-block" aria-label="Talk to the practice">
            <h2>Prefer to talk to someone?</h2>
            <p>Dr. Nyaoncha&rsquo;s team is happy to arrange your consultation by phone.</p>
            <a className="cq-btn cq-btn--ghost" href={`tel:${PRACTICE.phone}`}>
              <span className="cq-ic"><PhoneIcon /></span>
              Call {PRACTICE.phoneDisplay}
            </a>
            <p className="cq-door__hours">{PRACTICE.hours}</p>
          </section>

          <p className="cq-door__trust">
            Consultant neurosurgeon · {PRACTICE.address} · Demo booking flow — requests are not
            sent to the practice.
          </p>
        </div>
      </section>
    </CqShell>
  );
}
