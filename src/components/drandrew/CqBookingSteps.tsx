/**
 * Booking stepper — same behaviour as the Premium Clinic `PvBookingSteps`
 * (numbered nodes, done/current/upcoming, compact "Step N of M" line on
 * mobile), styled in the Nyaoncha petrol/brass palette.
 */

export const STEPS = ["Reason for visit", "Date", "Time", "Your details", "Confirm"];

function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m5 12.5 4.5 4.5L19 7" />
    </svg>
  );
}

export default function CqBookingSteps({ step }: { step: number }) {
  const current = Math.min(Math.max(step, 1), STEPS.length);
  return (
    <nav className="cq-stepper" aria-label="Booking progress">
      <div className="cq-stepper__compact">
        Step {current} of {STEPS.length} · {STEPS[current - 1]}
      </div>
      <ol className="cq-stepper__list">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const isDone = current > n;
          const isCurrent = current === n;
          return (
            <li key={label} className="cq-stepper__item">
              <span
                className={`cq-stepper__node${isCurrent ? " cq-stepper__node--current" : ""}${isDone ? " cq-stepper__node--done" : ""}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                {isDone ? <CheckIcon /> : <span aria-hidden="true">{n}</span>}
              </span>
              <span className={`cq-stepper__label${isCurrent ? " cq-stepper__label--current" : ""}`}>{label}</span>
              {i < STEPS.length - 1 && <span className="cq-stepper__link" aria-hidden="true" />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
