import { createFileRoute } from "@tanstack/react-router";
import CqLegalPage from "~/components/drandrew/CqLegalPage";
import { PRACTICE } from "~/lib/booking/practice";

export const Route = createFileRoute("/terms")({
  component: TermsPage,
  head: () => ({
    meta: [
      { title: "Terms of Use — Dr. Andrew Nyaoncha, Consultant Neurosurgeon" },
      { name: "description", content: "The terms for using Dr. Andrew Nyaoncha's website and online booking, including the medical disclaimer." },
    ],
  }),
});

function TermsPage() {
  return (
    <CqLegalPage title="Terms of Use" updated="13 October 2026">
      <p>
        These terms apply to your use of this website, run by the practice of {PRACTICE.name}, {PRACTICE.role},{" "}
        {PRACTICE.address}. By using the website you agree to them.
      </p>

      <h2>Medical information</h2>
      <p>
        The information on this website is general and is not medical advice. It does not replace a consultation with a
        doctor. Do not delay getting care, or ignore advice from your doctor, because of something you read here.
      </p>
      <p className="cq-legal__important">
        <strong>In an emergency, do not use this website.</strong> Call {PRACTICE.phoneDisplay} or go to the nearest
        emergency department.
      </p>

      <h2>Booking online</h2>
      <ul>
        <li>
          Booking online sends a <strong>request</strong>. Your appointment is only confirmed when the practice contacts
          you to confirm it, usually within one working day.
        </li>
        <li>
          Times are held for 5 minutes while you complete your request. The practice may need to offer a different time
          if the one you chose is no longer available.
        </li>
        <li>Please give accurate details so we can reach you, and only book for yourself or someone you are authorised to book for.</li>
        <li>
          To change or cancel an appointment, call <a href={`tel:${PRACTICE.phone}`}>{PRACTICE.phoneDisplay}</a> and quote
          your booking reference. Please give as much notice as you can.
        </li>
        <li>Consultation fees, and whether your insurer or SHA covers them, are confirmed by the practice when it confirms your appointment.</li>
      </ul>

      <h2>Chat assistant and WhatsApp</h2>
      <p>
        The chat assistant gives automated answers to common questions about the practice. It cannot give medical advice.
        Messages sent on WhatsApp are answered by practice staff during opening hours and are not monitored for
        emergencies.
      </p>

      <h2>Other websites</h2>
      <p>
        Links to other services, such as Google Maps and WhatsApp, are provided for convenience. Their own terms and
        privacy policies apply, and we are not responsible for them.
      </p>

      <h2>Content</h2>
      <p>
        The text, images and video on this website belong to the practice or are used with permission. You may not copy
        them for commercial use without our written permission.
      </p>

      <h2>Liability</h2>
      <p>
        We work to keep this website accurate and available, but we cannot promise it will always be error-free or
        uninterrupted. To the extent the law allows, the practice is not liable for losses arising from use of the
        website. Nothing in these terms limits any rights you have under Kenyan law, including the Consumer Protection
        Act.
      </p>

      <h2>Privacy</h2>
      <p>
        Our <a href="/privacy">Privacy Policy</a> explains how we handle your personal information.
      </p>

      <h2>Changes and governing law</h2>
      <p>
        We may update these terms and will change the date at the top when we do. These terms are governed by the laws
        of Kenya.
      </p>
    </CqLegalPage>
  );
}
