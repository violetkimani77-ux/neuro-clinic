import { useState, type ReactNode } from "react";
import CliniqChatBot from "~/components/CliniqChatBot";
import CqWhatsApp from "~/components/drandrew/CqWhatsApp";
import { PRACTICE } from "~/lib/booking/practice";

/**
 * Shared chrome for every public Dr. Nyaoncha page: nav, mobile drawer,
 * footer (with legal links), WhatsApp bubble and assistant. `home` makes the
 * section links plain anchors on the home page.
 */
export default function CqShell({ children, home = false }: { children: ReactNode; home?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);
  // On the home page section links are plain anchors; elsewhere they lead back home.
  const at = (id: string) => (home ? `#${id}` : `/#${id}`);
  return (
    <main className="cq-page" id="top">
      <header className="cq-nav">
        <div className="cq-nav__inner">
          <a href={home ? "#top" : "/"} className="cq-nav__brand">
            <span className="cq-nav__name">Nyaoncha</span>
            <span className="cq-nav__role">Consultant Neurosurgeon · Nyeri</span>
          </a>
          <nav className="cq-nav__links" aria-label="Primary">
            <a href={at("section-about")}>About</a>
            <a href={at("section-services")}>Services</a>
            <a href={at("section-faq")}>FAQ</a>
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
            <a onClick={close} href={at("section-about")}>About</a>
            <a onClick={close} href={at("section-services")}>Services</a>
            <a onClick={close} href={at("section-faq")}>FAQ</a>
            <a onClick={close} href="/book">Book a Consultation</a>
          </nav>
          <a className="cq-drawer__contact" href={`tel:${PRACTICE.phone}`}>Call {PRACTICE.phoneDisplay}</a>
        </aside>
      </div>
      {children}
      <footer className="cq-footer">
        <div className="cq-footer__name">Dr. Andrew Nyaoncha — Consultant Neurosurgeon</div>
        <a href={`tel:${PRACTICE.phone}`}>{PRACTICE.phoneDisplay}</a>
        <nav className="cq-footer__links" aria-label="Footer">
          <a href="/book">Book a consultation</a>
          <a href={at("section-faq")}>FAQ</a>
          <a href="/privacy">Privacy Policy</a>
          <a href="/terms">Terms of Use</a>
        </nav>
        <p>Doctors Plaza, Nyeri, Kenya · © 2026 Dr. Andrew Nyaoncha</p>
        <small>Demo website by IHL Tech — for demonstration purposes.</small>
      </footer>
      <CqWhatsApp />
      <CliniqChatBot />
    </main>
  );
}
