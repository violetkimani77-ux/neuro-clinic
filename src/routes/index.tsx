import { createFileRoute } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import CqShell from "~/components/drandrew/CqShell";
import { FAQ, faqStructuredData } from "~/lib/booking/faq";
import { PRACTICE } from "~/lib/booking/practice";
import { submitContactMessage } from "~/routes/api/-booking";

export const Route = createFileRoute("/")({
  head: () => ({ meta: [{ title: "Dr. Andrew Nyaoncha — Consultant Neurosurgeon | Nyeri, Kenya" }, { name: "description", content: "Dr. Andrew Nyaoncha, Consultant Neurosurgeon providing brain, spine and nervous system care across the Mt Kenya region." }, { property: "og:title", content: "Dr. Andrew Nyaoncha — Consultant Neurosurgeon" }, { name: "robots", content: "index,follow" }], links: [{ rel: "preconnect", href: "https://fonts.googleapis.com" }, { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" }, { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@400;600;700&display=swap" }], scripts: [{ type: "application/ld+json", children: faqStructuredData }] }), component: CliniqDemo,
});
const phone="0721 358137";
const services=["Brain Tumour Surgery|Microsurgical removal of brain tumours using modern techniques — meticulous care for healthy tissue.","Aneurysm Surgery|Precision surgery for cerebral aneurysms — described by patients as the best in Kenya.","Spinal Surgery|Spinal fusions, decompressions and treatment for cervical spine conditions and infections.","Paediatric Neurosurgery|Correction of congenital abnormalities in children — compassionate, family-centred care.","Neurosurgical Assessment|Comprehensive evaluation and diagnosis for conditions of the brain, spine and nervous system.","General Surgery|Broad surgical expertise, grounded in general surgery training at Aga Khan University."];
const slugOf=(t:string)=>t.toLowerCase().replace(/[^a-z0-9]+/g,"-");
const quotes=["Most of my high comes from patients — when I do a surgery and the patient lives.","If you are so good at what you do, you won't have to look for money — money will look for you.","When you open up someone's brain and witness its beauty and complexity, you realise the need to have faith and submit to a higher power."];
const MAP_QUERY = encodeURIComponent(PRACTICE.address);
const MAP_EMBED = `https://www.google.com/maps?q=${MAP_QUERY}&output=embed`;
const DIRECTIONS = `https://www.google.com/maps/dir/?api=1&destination=${MAP_QUERY}`;

/* Home page. Hero, numbers, services and about are unchanged from the
   ihltech /demo-drandrew page. The patient testimonials section was removed
   (KMPDC advertising rules prohibit testimonials). The contact section sends
   call-back requests to the staff screen and has a map; the FAQ follows it. */
function CliniqDemo(){ return <CqShell home>
<section className="cq-hero cq-section"><video className="cq-hero__video" src="/cliniq/hero-bg.mp4" poster="/cliniq/dr-nyaoncha.jpg" preload="none" autoPlay muted loop playsInline/><div className="cq-hero__overlay"/><div className="cq-container cq-hero__grid"><div className="cq-hero__copy"><p className="cq-eyebrow">Consultant Neurosurgeon · Nyeri, Kenya</p><h1 className="cq-hero__title">Dr. Andrew Nyaoncha</h1><p className="cq-hero__lead">Doctors Plaza, Nyeri — providing brain, spine and nervous system care across the Mt Kenya region.</p><div className="cq-hero__actions"><a className="cq-btn cq-btn--primary cq-btn--lg" href="/book">Book a Consultation</a><a className="cq-btn cq-btn--ghost cq-btn--lg" href="tel:+254721358137"><span className="cq-ic"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 5.18 2 2 0 0 1 4.11 3h3a2 2 0 0 1 2 1.72c.13 1.02.37 2.02.72 2.96a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.13-1.13a2 2 0 0 1 2.11-.45c.94.35 1.94.59 2.96.72A2 2 0 0 1 22 16.92Z"/></svg></span>Call {phone}</a></div><p className="cq-hero__creds">MBChB (UoN) · M.Med Gen Surgery (AKU) · FCS-ECSA Neurosurgery (COSECSA) · RCS UK</p></div></div></section>
<section className="cq-ledger"><div className="cq-container"><p className="cq-ledger__eyebrow">The practice in numbers</p><div className="cq-ledger__grid">{[["300+","Complex procedures since 2018"],["15+","Years of experience"],["Top 40","Under 40 — Business Daily, 2019"],["1 of 2","Neurosurgeons serving central & northern Kenya"]].map(x=><div className="cq-stat" key={x[0]}><b>{x[0]}</b><span>{x[1]}</span></div>)}</div><p className="cq-ledger__strip">Fellow, COSECSA — FCS-ECSA 2018 · Royal College of Surgeons UK, 2016 · 5/5 patient rating</p></div></section>
<section id="section-services" className="cq-section"><div className="cq-container"><div className="cq-head"><p className="cq-eyebrow">What I treat</p><h2 className="cq-h2">Surgical care for the brain, spine &amp; nervous system</h2><p className="cq-lead">Precision and compassion — close to home.</p></div><div className="cq-services">{services.map((s,i)=>{const [t,d]=s.split("|");return <a href={`/book/${slugOf(t)}`} className="cq-service" key={t}><span className="cq-service__num">{String(i+1).padStart(2,"0")}</span><span className="cq-service__body"><strong>{t}</strong><small>{d}</small></span><span className="cq-service__link">Book a visit →</span></a>})}</div></div></section>
<section id="section-about" className="cq-section cq-section--sand"><div className="cq-container"><div className="cq-head cq-head--left"><p className="cq-eyebrow">Meet Dr Nyaoncha</p><h2 className="cq-h2">From a Yale scholarship to Nyeri's operating theatre</h2></div><div className="cq-bio__grid"><div><p className="cq-bio__pullquote">“I don't feel like a village neurosurgeon at all.”</p><div className="cq-bio__text"><p>Dr. Andrew Nyaoncha turned down a scholarship to study computer engineering at Yale University to pursue medicine, graduating with an MBChB from the University of Nairobi in 2008.</p><p>After general surgery training at Aga Khan University in 2015, he found himself performing more brain-related cases than any other type. Mentors Dr. Mahamood Qureshi and Dr. David Oluoch-Olunya encouraged him into neurosurgery.</p><p>He trained at the Royal College of Surgeons, UK in 2016 and earned his FCS-ECSA in 2018 as the top candidate in Kigali. Named Top 40 Under 40 in 2019, he now serves patients across Nyeri, Nyahururu, Murang'a and Samburu.</p></div><div className="cq-timeline">{[["2008","MBChB","University of Nairobi"],["2015","M.Med General Surgery","Aga Khan University"],["2016","Royal College of Surgeons","United Kingdom"],["2018","FCS-ECSA Neurosurgery","COSECSA · top candidate, Kigali"],["2019","Top 40 Under 40","Business Daily · Doctor with a Difference"],["Today","300+ procedures","Serving the Mt Kenya region"]].map(x=><div className="cq-timeline__row" key={x[0]}><b>{x[0]}</b><span><strong>{x[1]}</strong><small>{x[2]}</small></span></div>)}</div></div><div>{quotes.map(q=><blockquote className="cq-quote" key={q}>{q}</blockquote>)}</div></div></div></section>
<ContactSection/>
<FaqSection/>
</CqShell>}

function ContactSection() {
  const [state, setState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setState("sending");
    try {
      const r = await submitContactMessage({ data: { name: String(f.get("name") ?? ""), phone: String(f.get("phone") ?? ""), message: String(f.get("message") ?? "") } });
      setState(r.success ? "sent" : "error");
    } catch {
      setState("error");
    }
  };
  return (
    <section id="section-contact" className="cq-section">
      <div className="cq-container">
        <div className="cq-head">
          <p className="cq-eyebrow">Get in touch</p>
          <h2 className="cq-h2">Book a consultation</h2>
        </div>
        <div className="cq-contact__grid">
          {state === "sent" ? (
            <div className="cq-form cq-form__success" aria-live="polite">
              <h3>Thank you — we'll call you back.</h3>
              <p>Dr. Nyaoncha's team will reach you on the number provided, usually within one working day.</p>
              <a href={`tel:${PRACTICE.phone}`}>Prefer to talk now? Call {phone}.</a>
            </div>
          ) : (
            <form className="cq-form" onSubmit={submit}>
              <div className="cq-field"><label htmlFor="name">Name</label><input id="name" name="name" autoComplete="name" maxLength={120} required /></div>
              <div className="cq-field"><label htmlFor="phone">Phone</label><input id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" maxLength={20} required /></div>
              <div className="cq-field"><label htmlFor="message">Message</label><textarea id="message" name="message" rows={5} maxLength={2000} /></div>
              {state === "error" && <p className="cq-form-error" role="alert">Sorry — your message wasn't sent. Please try again, or call {phone}.</p>}
              <button className="cq-btn cq-btn--primary cq-btn--lg" type="submit" disabled={state === "sending"}>{state === "sending" ? "Sending…" : "Send"}</button>
              <p className="cq-form__privacy">We use your name and number only to call you back. See our <a href="/privacy">Privacy Policy</a>.</p>
            </form>
          )}
          <div className="cq-info">
            <div><b>Visit</b><span>Doctors Plaza, Nyeri, Kenya<br />Serving Nyeri, Nyahururu, Murang'a — and beyond.</span><a href="#section-location" className="cq-info__more">Map &amp; directions ↓</a></div>
            <div><b>Call</b><a href={`tel:${PRACTICE.phone}`}>{phone}</a></div>
            <div><b>Hours</b><span>Mon–Fri 8:00–17:00<br />Sat 8:00–13:00 · Sun closed</span></div>
            <div><b>Serving</b><span>Patients from as far as Samburu.</span></div>
          </div>
        </div>

        <div id="section-location" className="cq-map">
          <div className="cq-map__frame">
            <iframe title="Map showing Doctors Plaza, Nyeri" src={MAP_EMBED} loading="lazy" referrerPolicy="no-referrer-when-downgrade" allowFullScreen />
          </div>
          <div className="cq-map__card">
            <p className="cq-eyebrow">Find us</p>
            <h3>Doctors Plaza, Nyeri</h3>
            <p>Dr. Nyaoncha sees patients at Doctors Plaza in Nyeri town — serving the Mt Kenya region and beyond.</p>
            <p className="cq-map__hours">Mon–Fri 8:00–17:00 · Sat 8:00–13:00 · Sun closed</p>
            <div className="cq-map__actions">
              <a className="cq-btn cq-btn--primary" href={DIRECTIONS} target="_blank" rel="noopener noreferrer">Get directions</a>
              <a className="cq-btn cq-btn--ghost" href={`tel:${PRACTICE.phone}`}>Call {phone}</a>
            </div>
          </div>
        </div>

        <div className="cq-emergency" role="note"><span className="cq-ic cq-ic--warn"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></svg></span>If this is a medical emergency, call {phone} or go to the nearest emergency department.</div>
      </div>
    </section>
  );
}

function FaqSection() {
  return (
    <section id="section-faq" className="cq-section cq-section--sand">
      <div className="cq-container cq-faq">
        <div className="cq-head">
          <p className="cq-eyebrow">Questions</p>
          <h2 className="cq-h2">Frequently asked questions</h2>
          <p className="cq-lead">Still unsure? Call {phone} — the team is happy to help.</p>
        </div>
        <div className="cq-faq__list">
          {FAQ.map((f) => (
            <details key={f.q} className="cq-faq__item">
              <summary>{f.q}</summary>
              <div className="cq-faq__answer">{f.answer}</div>
            </details>
          ))}
        </div>
        <div className="cq-faq__cta">
          <a className="cq-btn cq-btn--primary cq-btn--lg" href="/book">Book a consultation</a>
        </div>
      </div>
    </section>
  );
}
