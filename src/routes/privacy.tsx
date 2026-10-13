import { createFileRoute } from "@tanstack/react-router";
import CqLegalPage from "~/components/drandrew/CqLegalPage";
import { PRACTICE } from "~/lib/booking/practice";

export const Route = createFileRoute("/privacy")({
  component: PrivacyPage,
  head: () => ({
    meta: [
      { title: "Privacy Policy — Dr. Andrew Nyaoncha, Consultant Neurosurgeon" },
      { name: "description", content: "How Dr. Andrew Nyaoncha's practice collects, uses and protects your personal information, and your rights under Kenya's Data Protection Act, 2019." },
    ],
  }),
});

function PrivacyPage() {
  return (
    <CqLegalPage title="Privacy Policy" updated="13 October 2026">
      <p>
        This policy explains how the practice of {PRACTICE.name}, {PRACTICE.role}, {PRACTICE.address} (&ldquo;the
        practice&rdquo;, &ldquo;we&rdquo;) handles personal information collected through this website. We follow
        Kenya&rsquo;s Data Protection Act, 2019. The practice is the data controller for this information.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li>
          <strong>When you book a consultation:</strong> your full name, mobile number, email address (optional), the
          reason for your visit, the date and time you choose, how you prefer to be contacted, and whether a doctor or
          clinic referred you (and who).
        </li>
        <li>
          <strong>When you ask us to call you back:</strong> your name, phone number and your message.
        </li>
        <li>
          <strong>When you message us on WhatsApp:</strong> your WhatsApp number, name and the messages you send. WhatsApp is
          run by Meta, and their privacy policy also applies.
        </li>
      </ul>
      <p>
        The reason for your visit is health information, which the law treats as sensitive. We only collect it with your
        consent, which you give when you book.
      </p>

      <h2>How we use it</h2>
      <ul>
        <li>To arrange, confirm, change or cancel your appointment, and to contact you about it.</li>
        <li>To call you back when you ask us to.</li>
        <li>To prepare for your consultation, for example by knowing who referred you.</li>
      </ul>
      <p>We do not sell your information or use it for advertising.</p>

      <h2>Who can see it</h2>
      <p>
        Only Dr. Nyaoncha and his practice staff, through a password-protected staff screen. Our website hosting and
        database providers store the information on our behalf and may keep it on servers outside Kenya; we only use
        providers that protect it to a standard consistent with Kenyan law. We share information with others only when
        the law requires it or when you ask us to (for example, with a doctor who referred you).
      </p>

      <h2>Other services on this website</h2>
      <ul>
        <li>
          <strong>Map:</strong> the map on our home page is provided by Google Maps. When it loads, Google receives your
          IP address and may set cookies, under Google&rsquo;s privacy policy.
        </li>
        <li>
          <strong>Chat assistant:</strong> the assistant on this website gives fixed answers to common questions. It runs
          in your browser, and what you type in it is not sent to or stored by us. Please do not use it for medical
          questions — call us instead.
        </li>
        <li>
          <strong>Your browser:</strong> after you book, your browser keeps a temporary copy of your booking summary so it
          can show the confirmation page. It is deleted when you close the tab. We do not use advertising or tracking
          cookies.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <p>
        We keep booking requests and call-back messages for up to 12 months, then delete them. If you become a patient,
        information needed for your medical record is kept for as long as the law requires medical records to be kept.
      </p>

      <h2>Your rights</h2>
      <p>Under the Data Protection Act, 2019 you have the right to:</p>
      <ul>
        <li>be told how your information is used, and get a copy of it;</li>
        <li>have wrong or incomplete information corrected;</li>
        <li>have information deleted when we no longer need it;</li>
        <li>object to how we use it, or withdraw your consent at any time (this won&rsquo;t affect anything done before).</li>
      </ul>
      <p>
        To use any of these rights, call <a href={`tel:${PRACTICE.phone}`}>{PRACTICE.phoneDisplay}</a> or write to the
        practice at {PRACTICE.address}. If you are unhappy with how we handle your information, you can complain to the
        Office of the Data Protection Commissioner (<a href="https://www.odpc.go.ke" target="_blank" rel="noopener noreferrer">odpc.go.ke</a>).
      </p>

      <h2>Keeping it safe</h2>
      <p>
        Information is sent over an encrypted connection (HTTPS), and only signed-in practice staff can view booking
        requests and messages.
      </p>

      <h2>Changes to this policy</h2>
      <p>If we change this policy, we will update it on this page and change the date at the top.</p>
    </CqLegalPage>
  );
}
