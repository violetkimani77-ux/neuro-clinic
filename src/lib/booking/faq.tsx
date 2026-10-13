import type { ReactNode } from "react";
import { PRACTICE } from "./practice";

/**
 * Home page FAQ. `text` is the plain-text answer used for search engines
 * (FAQPage structured data); `answer` is what the page shows.
 * Answers about fees, insurance and referrals are deliberately general —
 * the practice should confirm the wording before launch.
 */
export interface FaqItem {
  q: string;
  text: string;
  answer: ReactNode;
}

export const FAQ: FaqItem[] = [
  {
    q: "How do I book a consultation?",
    text: `Book online in a few steps: choose the reason for your visit, then a date and time. You can also call ${PRACTICE.phoneDisplay} or message the practice on WhatsApp. The team confirms every request, usually within one working day.`,
    answer: (
      <>
        <a href="/book">Book online</a> in a few steps — choose the reason for your visit, then a date and time.
        You can also call <a href={`tel:${PRACTICE.phone}`}>{PRACTICE.phoneDisplay}</a> or message the practice on
        WhatsApp. The team confirms every request, usually within one working day.
      </>
    ),
  },
  {
    q: "Do I need a referral from another doctor?",
    text: "You can book directly. If another doctor or clinic has referred you, tell us when you book and bring the referral letter to your consultation.",
    answer: <>You can book directly. If another doctor or clinic has referred you, tell us when you book and bring the referral letter to your consultation.</>,
  },
  {
    q: "What should I bring to my first consultation?",
    text: "Your ID, any CT or MRI scans with their reports, previous medical reports, a referral letter if you have one, a list of the medicines you take, and your insurance card. Please arrive 15 minutes early.",
    answer: (
      <ul>
        <li>Your ID and insurance card</li>
        <li>Any CT or MRI scans, with their reports</li>
        <li>Previous medical reports and a referral letter, if you have one</li>
        <li>A list of the medicines you take</li>
      </ul>
    ),
  },
  {
    q: "Where is the clinic, and when is it open?",
    text: `${PRACTICE.address}. Open Monday to Friday 8:00 to 17:00 and Saturday 8:00 to 13:00. Closed on Sundays.`,
    answer: (
      <>
        {PRACTICE.address} — see the <a href="#section-location">map and directions</a>. Open Monday to Friday 8:00–17:00 and
        Saturday 8:00–13:00. Closed on Sundays.
      </>
    ),
  },
  {
    q: "Does Dr. Nyaoncha treat children?",
    text: "Yes. Paediatric neurosurgery, including the correction of congenital abnormalities, is one of Dr. Nyaoncha's services. Please bring your child's medical records and any scans.",
    answer: <>Yes. Paediatric neurosurgery, including the correction of congenital abnormalities, is one of Dr. Nyaoncha&rsquo;s services. Please bring your child&rsquo;s medical records and any scans.</>,
  },
  {
    q: "How much does a consultation cost? Is it covered by insurance or SHA?",
    text: "Fees and cover depend on your insurer and the care you need. The team confirms the consultation fee when they confirm your appointment, and can tell you whether your insurance or SHA cover applies.",
    answer: <>Fees and cover depend on your insurer and the care you need. The team confirms the consultation fee when they confirm your appointment, and can tell you whether your insurance or SHA cover applies.</>,
  },
  {
    q: "I live outside Nyeri. Can I still be seen?",
    text: "Yes. Dr. Nyaoncha sees patients from Nyeri, Nyahururu and Murang'a, and from as far as Samburu.",
    answer: <>Yes. Dr. Nyaoncha sees patients from Nyeri, Nyahururu and Murang&rsquo;a — and from as far as Samburu.</>,
  },
  {
    q: "What if it's an emergency?",
    text: `Do not book online. Call ${PRACTICE.phoneDisplay} or go to the nearest emergency department.`,
    answer: (
      <>
        Don&rsquo;t book online. Call <a href={`tel:${PRACTICE.phone}`}>{PRACTICE.phoneDisplay}</a> or go to the nearest
        emergency department.
      </>
    ),
  },
  {
    q: "How is my personal information used?",
    text: "Only to arrange and provide your care. It is handled in line with Kenya's Data Protection Act, 2019. The privacy policy explains what is collected and your rights.",
    answer: (
      <>
        Only to arrange and provide your care, in line with Kenya&rsquo;s Data Protection Act, 2019. Our{" "}
        <a href="/privacy">Privacy Policy</a> explains what we collect and your rights.
      </>
    ),
  },
];

export const faqStructuredData = JSON.stringify({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.text } })),
});
