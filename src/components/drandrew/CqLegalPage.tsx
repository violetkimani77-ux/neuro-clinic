import type { ReactNode } from "react";
import CqShell from "./CqShell";

/** Shared layout for the legal pages (privacy, terms). */
export default function CqLegalPage({ title, updated, children }: { title: string; updated: string; children: ReactNode }) {
  return (
    <CqShell>
      <section className="cq-section cq-legal">
        <div className="cq-container cq-legal__inner">
          <p className="cq-eyebrow">Dr. Andrew Nyaoncha · Consultant Neurosurgeon</p>
          <h1 className="cq-h2">{title}</h1>
          <p className="cq-legal__updated">Last updated {updated}</p>
          <p className="cq-legal__draft" role="note">
            Draft prepared for this demo website. The practice should review it with a legal adviser before the site
            is used with real patients.
          </p>
          {children}
          <nav className="cq-legal__other" aria-label="Legal pages">
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Use</a>
            <a href="/#section-faq">FAQ</a>
          </nav>
        </div>
      </section>
    </CqShell>
  );
}
