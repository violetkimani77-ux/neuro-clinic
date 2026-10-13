import { useState, type ReactNode } from "react";
import CliniqChatBot from "~/components/CliniqChatBot";
import { PRACTICE } from "~/lib/booking/practice";

/**
 * Shared chrome for the Dr. Nyaoncha sub-pages (booking flow): the same nav,
 * mobile drawer, footer and assistant as the home page, with section links
 * pointing back to the home page anchors.
 */
export default function CqShell({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  return (
    <main className="cq-page" id="top">
      <header className="cq-nav">
        <div className="cq-nav__inner">
          <a href="/" className="cq-nav__brand">
            <span className="cq-nav__name">Nyaoncha</span>
            <span className="cq-nav__role">Consultant Neurosurgeon · Nyeri</span>
          </a>
          <nav className="cq-nav__links" aria-label="Primary">
            <a href="/#section-about">About</a>
            <a href="/#section-services">Services</a>
            <a href="/#section-reviews">Reviews</a>
          </nav>
          <div className="cq-nav__actions">
            <a className="cq-nav__phone" href={`tel:${PRACTICE.phone}`}>{PRACTICE.phoneDisplay}</a>
            <a className="cq-btn cq-btn--primary" href="/book">Book a Consultation</a>
            <button className={`cq-nav__burger${open ? " is-open" : ""}`} onClick={() => setOpen(!open)} aria-expanded={open} aria-label="Open menu"><i /><i /><i /></button>
          </div>
        </div>
      </header>
      <div className={`cq-drawer${open ? " cq-drawer--open" : ""}`} aria-hidden={!open}>
        <button className="cq-drawer__backdrop" onClick={close} aria-label="Close menu" />
        <aside className="cq-drawer__panel">
          <button className="cq-close" onClick={close} aria-label="Close menu">×</button>
          <nav className="cq-drawer__nav">
            <a onClick={close} href="/#section-about">About</a>
            <a onClick={close} href="/#section-services">Services</a>
            <a onClick={close} href="/#section-reviews">Reviews</a>
            <a onClick={close} href="/book">Book a Consultation</a>
          </nav>
          <a className="cq-drawer__contact" href={`tel:${PRACTICE.phone}`}>Call {PRACTICE.phoneDisplay}</a>
        </aside>
      </div>
      {children}
      <footer className="cq-footer">
        <div className="cq-footer__name">Dr. Andrew Nyaoncha — Consultant Neurosurgeon</div>
        <a href={`tel:${PRACTICE.phone}`}>{PRACTICE.phoneDisplay}</a>
        <p>Doctors Plaza, Nyeri, Kenya · © 2026 Dr. Andrew Nyaoncha</p>
        <small>Demo website by IHL Tech — for demonstration purposes.</small>
      </footer>
      <CliniqChatBot />
    </main>
  );
}
