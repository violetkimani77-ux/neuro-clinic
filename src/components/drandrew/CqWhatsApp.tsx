import { useEffect, useRef, useState } from "react";
import { PRACTICE, whatsappLink } from "~/lib/booking/practice";

/**
 * Floating WhatsApp bubble, stacked above the assistant bubble. Tapping it
 * opens a small card (same pattern as the Olive Hill demo) with a button
 * that starts a WhatsApp chat with the practice, message prefilled.
 * Hidden while the assistant panel is open (see whatsapp.css).
 */

const GREETING = "Hello Dr. Nyaoncha's team, I'd like to ask about a consultation.";

export function WhatsAppIcon({ size = 28 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.9 9.9 0 0 0 4.79 1.22h.01c5.46 0 9.9-4.45 9.9-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15a8.2 8.2 0 0 1-4.19-1.15l-.3-.18-3.12.82.83-3.04-.2-.31a8.2 8.2 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.23 8.23zm4.52-6.16c-.25-.12-1.47-.72-1.69-.81-.23-.08-.39-.12-.56.13-.17.25-.64.81-.78.97-.14.17-.29.19-.54.06-.25-.12-1.05-.39-1.99-1.23-.74-.66-1.23-1.47-1.38-1.72-.14-.25-.02-.38.11-.51.11-.11.25-.29.37-.43.12-.14.17-.25.25-.41.08-.17.04-.31-.02-.43-.06-.12-.56-1.34-.76-1.84-.2-.48-.41-.42-.56-.43h-.48c-.17 0-.43.06-.66.31-.22.25-.86.85-.86 2.07 0 1.22.89 2.4 1.01 2.56.12.17 1.75 2.67 4.23 3.74.59.26 1.05.41 1.41.52.59.19 1.13.16 1.56.1.48-.07 1.47-.6 1.67-1.18.21-.58.21-1.07.15-1.18-.06-.1-.23-.16-.48-.29z" />
    </svg>
  );
}

export default function CqWhatsApp() {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  /* Close on Escape or a tap outside the card. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onPointer);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onPointer);
    };
  }, [open]);

  return (
    <div className="cq-wa" ref={rootRef}>
      {open && (
        <div className="cq-wa__card" role="dialog" aria-label="Chat with the practice on WhatsApp">
          <button type="button" className="cq-wa__close" onClick={() => setOpen(false)} aria-label="Close">×</button>
          <p className="cq-wa__title">Chat with us on WhatsApp</p>
          <p className="cq-wa__text">
            Questions about a consultation, referral or directions? Message Dr. Nyaoncha&rsquo;s team.
          </p>
          <a className="cq-wa__start" href={whatsappLink(GREETING)} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
            <WhatsAppIcon size={20} />
            Start WhatsApp chat
          </a>
          <p className="cq-wa__hours">{PRACTICE.hours}</p>
        </div>
      )}
      <button
        type="button"
        className="cq-wa__bubble"
        onClick={() => setOpen((v) => !v)}
        aria-label="Chat with the practice on WhatsApp"
        aria-expanded={open}
      >
        <WhatsAppIcon />
      </button>
    </div>
  );
}
