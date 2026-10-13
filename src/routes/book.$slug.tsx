import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import CqShell from "~/components/drandrew/CqShell";
import CqBookingSteps, { STEPS } from "~/components/drandrew/CqBookingSteps";
import CqSlotPicker from "~/components/drandrew/CqSlotPicker";
import { PRACTICE, contactPhrase, serviceName, services, timeLabel } from "~/lib/booking/practice";
import { getBookingAvailability, submitBooking, type BookingDay } from "~/routes/api/-booking";

/**
 * Booking wizard — the Premium Clinic 6-step flow (`providence-clinic/book.$slug`)
 * adapted for a single-surgeon practice, so the Specialty + Specialist steps
 * collapse into one "Reason for visit" step:
 *
 * REASON FOR VISIT → DATE → TIME → YOUR DETAILS → CONFIRM.
 *
 * Same state machine: 5-minute slot hold with countdown, aria-live step
 * announcements + focus on the step heading, per-step validation,
 * idempotent submit, SLOT_UNAVAILABLE / HOLD_EXPIRED recovery and toasts.
 *
 * `:slug` is a starting hint: a service slug (deep link from the home page
 * "Book a visit" rows) preselects that service; anything else (e.g. the front
 * door's `/book/start`) starts fresh.
 */

export const Route = createFileRoute("/book/$slug")({
  component: BookingFlowPage,
  head: ({ params }) => {
    const s = services.find((x) => x.slug === params.slug);
    return {
      meta: [
        { title: s ? `Book a consultation: ${s.name} — Dr. Andrew Nyaoncha` : "Book a Consultation — Dr. Andrew Nyaoncha" },
        { name: "robots", content: "noindex" },
      ],
    };
  },
});

/* ── Constants ─────────────────────────────────────────────────────────── */
const STEP_DESC: Record<number, string> = {
  1: "Choose the reason for your visit.",
  2: "Choose a day that suits you.",
  3: "Choose a time for your appointment.",
  4: "Tell us who to contact and how.",
  5: "Review and request your appointment.",
};
type Step = 1 | 2 | 3 | 4 | 5;
type Preferred = "PHONE" | "SMS" | "EMAIL" | "WHATSAPP";
type ReferralKind = "referred" | "direct";
const HOLD_MS = 5 * 60 * 1000;
const MOBILE_RE = /^(?=.*\d)[\d\s()+.-]+$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PREFERRED_OPTIONS: { value: Preferred; label: string }[] = [
  { value: "PHONE", label: "Phone" },
  { value: "SMS", label: "SMS" },
  { value: "EMAIL", label: "Email" },
  { value: "WHATSAPP", label: "WhatsApp" },
];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const DOW = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

function makeKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `an-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

function ChevronLeftIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="m15 6-6 6 6 6" />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </svg>
  );
}

/* ── Draft state ───────────────────────────────────────────────────────── */
interface Draft {
  step: Step;
  service: string | null;
  dateKey: string | null;
  time: string | null;
  holdUntil: number | null;
  fullName: string;
  mobile: string;
  email: string;
  preferredContact: Preferred | null;
  referral: ReferralKind | null;
  referringParty: string;
  idempotencyKey: string;
}

function freshDraft(slug: string): Draft {
  return {
    step: 1,
    service: services.some((s) => s.slug === slug) ? slug : null,
    dateKey: null,
    time: null,
    holdUntil: null,
    fullName: "",
    mobile: "",
    email: "",
    preferredContact: null,
    referral: null,
    referringParty: "",
    idempotencyKey: makeKey(),
  };
}

function formatCountdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, "0")}`;
}
function pad(n: number): string {
  return String(n).padStart(2, "0");
}
function dayLabel(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function dayShort(dateKey: string): string {
  const [y, m, d] = dateKey.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString([], { weekday: "short", day: "numeric", month: "short" });
}

interface ToastState {
  kind: "success" | "warning" | "error";
  title: string;
  sub?: string;
}

function BookingFlowPage() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();

  const [draft, setDraft] = useState<Draft>(() => freshDraft(slug));
  const [schedule, setSchedule] = useState<BookingDay[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [announce, setAnnounce] = useState("");
  const [now, setNow] = useState(() => Date.now());
  const [errors, setErrors] = useState<{ fullName?: string; mobile?: string; email?: string; preferred?: string; referral?: string; referringParty?: string }>({});
  const [slotError, setSlotError] = useState(false);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRender = useRef(true);

  /* Step-change announcement + focus move to the step heading. */
  useEffect(() => {
    setAnnounce(`Step ${draft.step} of ${STEPS.length}: ${STEPS[draft.step - 1]}. ${STEP_DESC[draft.step]}`);
    if (firstRender.current) firstRender.current = false;
    else headingRef.current?.focus();
    setSlotError(false);
  }, [draft.step]);

  useEffect(() => () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
  }, []);

  const showToast = (t: ToastState) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(t);
  };
  const dismissToast = () => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToast(null);
  };

  /* Practice diary — one surgeon, so load it once. */
  useEffect(() => {
    let active = true;
    getBookingAvailability()
      .then((r) => {
        if (active) setSchedule(r.success ? r.data.days : []);
      })
      .catch(() => {
        if (active) setSchedule([]);
      })
      .finally(() => {
        if (active) setScheduleLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  /* 5-min slot hold countdown. Expiry → warning toast + release the slot. */
  useEffect(() => {
    if (!draft.time || !draft.holdUntil) return;
    const heldTime = draft.time;
    const heldUntil = draft.holdUntil;
    const iv = setInterval(() => {
      if (Date.now() > heldUntil) {
        clearInterval(iv);
        setDraft((d) => (d.time ? { ...d, time: null, holdUntil: null } : d));
        showToast({ kind: "warning", title: `Your hold on ${timeLabel(heldTime)} has expired.`, sub: "Please choose another time." });
      } else {
        setNow(Date.now());
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [draft.time, draft.holdUntil]);

  const holdRemaining = draft.holdUntil ? Math.min(HOLD_MS, Math.max(0, draft.holdUntil - now)) : 0;

  /* ── Step handlers ───────────────────────────────────────────────────── */
  const pickService = (s: string) => {
    setDraft((d) => ({ ...d, service: s }));
    setAnnounce(`Selected ${serviceName(s)}.`);
  };
  const pickDate = (key: string) => {
    setDraft((d) => ({ ...d, dateKey: key, time: null, holdUntil: null }));
    setAnnounce(`Selected ${dayLabel(key)}.`);
  };
  const pickTime = (t: string) => {
    setNow(Date.now());
    setDraft((d) => ({ ...d, time: t, holdUntil: Date.now() + HOLD_MS }));
    setAnnounce(`Holding ${timeLabel(t)} for you — you have 5 minutes to complete your booking.`);
    setSlotError(false);
  };

  const canForward = useMemo(() => {
    switch (draft.step) {
      case 1:
        return !!draft.service;
      case 2:
        return !!draft.dateKey;
      case 3:
        return !!draft.time && !!draft.holdUntil && draft.holdUntil > Date.now();
      case 4:
        return true;
      default:
        return false;
    }
  }, [draft]);

  const goForward = () => {
    if (!canForward) return;
    if (draft.step === 4) {
      const e: typeof errors = {};
      if (!draft.fullName.trim()) e.fullName = "Please enter the patient's full name.";
      if (!draft.mobile.trim()) e.mobile = "Please enter a mobile number.";
      else if (!MOBILE_RE.test(draft.mobile.trim())) e.mobile = "Please enter a valid phone number (digits and + - . ( ) space).";
      if (draft.email.trim() && !EMAIL_RE.test(draft.email.trim())) e.email = "Please enter a valid email address, or leave it blank.";
      if (!draft.preferredContact) e.preferred = "Please choose how we should contact you.";
      if (!draft.referral) e.referral = "Please tell us if you were referred by a doctor or clinic.";
      if (draft.referral === "referred" && !draft.referringParty.trim()) e.referringParty = "Please enter the referring doctor or clinic.";
      setErrors(e);
      if (Object.keys(e).length > 0) {
        setAnnounce("Some fields need your attention.");
        return;
      }
    }
    setDraft((d) => ({ ...d, step: (d.step + 1) as Step }));
  };

  const goBack = () => {
    if (draft.step === 3) setDraft((d) => ({ ...d, step: 2, time: null, holdUntil: null }));
    else if (draft.step > 1) setDraft((d) => ({ ...d, step: (d.step - 1) as Step }));
  };

  /* ── Calendar model (Step 2) ─────────────────────────────────────────── */
  const scheduleKeys = useMemo(() => new Set(schedule.map((d) => d.dateKey)), [schedule]);
  const [view, setView] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const todayMid = useMemo(() => {
    const n = new Date();
    n.setHours(0, 0, 0, 0);
    return n;
  }, []);
  const monthCells = useMemo(() => {
    const startDay = new Date(view.y, view.m, 1).getDay();
    const daysIn = new Date(view.y, view.m + 1, 0).getDate();
    const cells: (number | null)[] = [];
    for (let i = 0; i < startDay; i++) cells.push(null);
    for (let d = 1; d <= daysIn; d++) cells.push(d);
    return cells;
  }, [view]);
  const canGoPrev = new Date(view.y, view.m, 1).getTime() > todayMid.getTime();
  const dateKeyOf = (d: number) => `${view.y}-${pad(view.m + 1)}-${pad(d)}`;
  const prevMonth = () => setView(view.m === 0 ? { y: view.y - 1, m: 11 } : { y: view.y, m: view.m - 1 });
  const nextMonth = () => setView(view.m === 11 ? { y: view.y + 1, m: 0 } : { y: view.y, m: view.m + 1 });

  const selectedDay = useMemo(() => schedule.find((d) => d.dateKey === draft.dateKey) ?? null, [schedule, draft.dateKey]);

  /* ── Step 5 submit ───────────────────────────────────────────────────── */
  const handleConfirm = async () => {
    if (submitting || !draft.service || !draft.dateKey || !draft.time) return;
    setSubmitting(true);
    try {
      const res = await submitBooking({
        data: {
          idempotencyKey: draft.idempotencyKey,
          service: draft.service,
          dateKey: draft.dateKey,
          time: draft.time,
          holdUntil: draft.holdUntil ?? Date.now() + HOLD_MS,
          fullName: draft.fullName.trim(),
          mobile: draft.mobile.trim(),
          email: draft.email.trim() || null,
          preferredContact: draft.preferredContact ?? "PHONE",
          referral: draft.referral ?? "direct",
          referringParty: draft.referral === "referred" ? draft.referringParty.trim() : null,
        },
      });
      if (res.success) {
        // Keep a copy for the confirmation screen: on serverless hosting the
        // next request can land on an instance that never saw this booking.
        try {
          sessionStorage.setItem(`an-booking:${res.booking.reference}`, JSON.stringify(res.booking));
        } catch {
          /* storage unavailable — the confirmation page falls back to the server */
        }
        navigate({ to: "/book/confirmation", search: { ref: res.booking.reference } });
        return;
      }
      if (res.code === "SLOT_UNAVAILABLE") {
        await recoverSlotUnavailable();
      } else if (res.code === "HOLD_EXPIRED") {
        setDraft((d) => ({ ...d, step: 3, time: null, holdUntil: null }));
        showToast({ kind: "warning", title: "That time is no longer available.", sub: "Please choose another time." });
      } else {
        showToast({ kind: "error", title: "Something went wrong. Your request has not been submitted.", sub: "Please try again." });
      }
    } catch (err) {
      console.error("[drandrew] booking submission error:", err);
      showToast({ kind: "error", title: "Something went wrong. Your request has not been submitted.", sub: "Please try again." });
    } finally {
      setSubmitting(false);
    }
  };

  /* SLOT_UNAVAILABLE recovery: back to Step 3, slot removed, next open preselected. */
  const recoverSlotUnavailable = async () => {
    setSlotError(true);
    try {
      const r = await getBookingAvailability();
      if (!r.success) {
        setDraft((d) => ({ ...d, step: 3, time: null, holdUntil: null }));
        return;
      }
      const days = r.data.days;
      setSchedule(days);
      setDraft((d) => {
        const day = days.find((x) => x.dateKey === d.dateKey) ?? days[0];
        if (!day) return { ...d, step: 3, time: null, holdUntil: null };
        const pick = day.times.find((t) => t !== d.time) ?? day.times[0];
        return { ...d, dateKey: day.dateKey, time: pick ?? null, holdUntil: pick ? Date.now() + HOLD_MS : null, step: 3 };
      });
      setAnnounce("That slot was just booked. Please pick another time.");
    } catch {
      setDraft((d) => ({ ...d, step: 3, time: null, holdUntil: null }));
    }
  };

  return (
    <CqShell>
      <section className="cq-bk">
        <div className="cq-container cq-bk__inner">
          <CqBookingSteps step={draft.step} />

          <p className="cq-sr-only" role="status" aria-live="polite">{announce}</p>

          <div className="cq-bk__panel">
            <div className="cq-bk__actions cq-bk__actions--top">
              {draft.step === 1 ? (
                <a className="cq-bk__back" href="/book" aria-label="Back to booking home">
                  <ChevronLeftIcon />
                  Back
                </a>
              ) : (
                <button type="button" className="cq-bk__back" onClick={goBack}>
                  <ChevronLeftIcon />
                  Back
                </button>
              )}
            </div>

            {/* ── STEP 1: REASON FOR VISIT ─────────────────────────────── */}
            {draft.step === 1 && (
              <div className="cq-bk__step">
                <h1 className="cq-bk__h1" tabIndex={-1} ref={headingRef}>What would you like to see Dr. Nyaoncha about?</h1>
                <p className="cq-bk__lead">Not sure? Choose Neurosurgical Assessment — Dr. Nyaoncha will advise at your consultation.</p>
                <div className="cq-bk__services" role="radiogroup" aria-label="Reason for visit">
                  {services.map((s, i) => {
                    const selected = draft.service === s.slug;
                    return (
                      <label key={s.slug} className={`cq-radio-card cq-bk__service${selected ? " cq-radio-card--selected" : ""}`}>
                        <input type="radio" name="service" value={s.slug} checked={selected} onChange={() => pickService(s.slug)} />
                        <span className="cq-bk__service-num" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                        <span className="cq-bk__service-body">
                          <strong>{s.name}</strong>
                          <small>{s.scope}</small>
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ── STEP 2: DATE ─────────────────────────────────────────── */}
            {draft.step === 2 && (
              <div className="cq-bk__step">
                <h1 className="cq-bk__h1" tabIndex={-1} ref={headingRef}>Choose a date</h1>
                <p className="cq-bk__lead">Days Dr. Nyaoncha is seeing patients at Doctors Plaza, Nyeri.</p>
                {scheduleLoading ? (
                  <p role="status" className="cq-bk__loading">Checking availability…</p>
                ) : (
                  <div className="cq-calendar">
                    <div className="cq-calendar__nav">
                      <button type="button" className="cq-calendar__nav-btn" onClick={prevMonth} disabled={!canGoPrev} aria-label="Previous month">‹</button>
                      <span className="cq-calendar__month">{MONTH_NAMES[view.m]} {view.y}</span>
                      <button type="button" className="cq-calendar__nav-btn" onClick={nextMonth} aria-label="Next month">›</button>
                    </div>
                    <div className="cq-calendar__dow" aria-hidden="true">
                      {DOW.map((dow) => <span key={dow}>{dow}</span>)}
                    </div>
                    <div className="cq-calendar__grid" role="group" aria-label="Select a date">
                      {monthCells.map((d, i) => {
                        if (d === null) return <span key={i} aria-hidden="true" />;
                        const key = dateKeyOf(d);
                        const available = scheduleKeys.has(key);
                        const selected = draft.dateKey === key;
                        return (
                          <button
                            key={key}
                            type="button"
                            className={`cq-calendar__day${available ? " cq-calendar__day--available" : ""}${selected ? " cq-calendar__day--selected" : ""}`}
                            disabled={!available}
                            aria-pressed={selected}
                            aria-label={`${dayLabel(key)}${available ? "" : ", no appointments"}`}
                            onClick={() => pickDate(key)}
                          >
                            {d}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
                {draft.dateKey && (
                  <p className="cq-bk__chosen">Selected: <strong>{dayLabel(draft.dateKey)}</strong></p>
                )}
              </div>
            )}

            {/* ── STEP 3: TIME ─────────────────────────────────────────── */}
            {draft.step === 3 && (
              <div className="cq-bk__step">
                <h1 className="cq-bk__h1" tabIndex={-1} ref={headingRef}>Choose a time</h1>
                {slotError && (
                  <div className="cq-bk__error-box" role="alert">Slot unavailable — please pick another time. Someone may have just booked it.</div>
                )}
                <p className="cq-bk__lead">Dr. Nyaoncha, {draft.dateKey ? dayLabel(draft.dateKey) : "—"}.</p>
                {!selectedDay || selectedDay.times.length === 0 ? (
                  <p className="cq-bk__loading">{draft.dateKey ? "No times available on this date — please choose another day." : "Choose a date to see available times."}</p>
                ) : (
                  <>
                    <CqSlotPicker times={selectedDay.times} selected={draft.time} onSelect={pickTime} label={`Available times on ${draft.dateKey ? dayShort(draft.dateKey) : ""}`} />
                    {draft.time && draft.holdUntil && (
                      <div className="cq-hold">
                        <ClockIcon />
                        <span>
                          We&rsquo;re holding {timeLabel(draft.time)} for you — <span className="cq-hold__timer">{formatCountdown(holdRemaining)}</span> left
                        </span>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── STEP 4: YOUR DETAILS ─────────────────────────────────── */}
            {draft.step === 4 && (
              <div className="cq-bk__step">
                <h1 className="cq-bk__h1" tabIndex={-1} ref={headingRef}>Your details</h1>
                <p className="cq-bk__lead">We only collect what we need to confirm your appointment.</p>

                <div className="cq-bk__form-grid">
                  <div className="cq-field cq-field--full">
                    <label htmlFor="an-full-name">Full name</label>
                    <input
                      id="an-full-name"
                      className={errors.fullName ? "cq-input--error" : undefined}
                      type="text"
                      autoComplete="name"
                      value={draft.fullName}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, fullName: e.target.value }));
                        if (e.target.value.trim()) setErrors((er) => ({ ...er, fullName: undefined }));
                      }}
                      aria-invalid={errors.fullName ? true : undefined}
                      aria-describedby={errors.fullName ? "an-full-name-err" : undefined}
                    />
                    {errors.fullName && <p className="cq-form-error" id="an-full-name-err" role="alert">{errors.fullName}</p>}
                  </div>

                  <div className="cq-field">
                    <label htmlFor="an-mobile">Mobile number</label>
                    <input
                      id="an-mobile"
                      className={errors.mobile ? "cq-input--error" : undefined}
                      type="tel"
                      inputMode="tel"
                      autoComplete="tel"
                      value={draft.mobile}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, mobile: e.target.value }));
                        if (e.target.value.trim()) setErrors((er) => ({ ...er, mobile: undefined }));
                      }}
                      aria-invalid={errors.mobile ? true : undefined}
                      aria-describedby={errors.mobile ? "an-mobile-err" : undefined}
                    />
                    {errors.mobile && <p className="cq-form-error" id="an-mobile-err" role="alert">{errors.mobile}</p>}
                  </div>

                  <div className="cq-field">
                    <label htmlFor="an-email">Email <span className="cq-field__opt">(optional)</span></label>
                    <input
                      id="an-email"
                      className={errors.email ? "cq-input--error" : undefined}
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={draft.email}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, email: e.target.value }));
                        if (e.target.value.trim()) setErrors((er) => ({ ...er, email: undefined }));
                      }}
                      aria-invalid={errors.email ? true : undefined}
                      aria-describedby={errors.email ? "an-email-err" : undefined}
                    />
                    {errors.email && <p className="cq-form-error" id="an-email-err" role="alert">{errors.email}</p>}
                  </div>
                </div>

                <fieldset className="cq-bk__fieldset">
                  <legend>Preferred contact</legend>
                  {errors.preferred && <p className="cq-form-error" role="alert">{errors.preferred}</p>}
                  <div className="cq-chip-row" role="radiogroup" aria-label="Preferred contact channel">
                    {PREFERRED_OPTIONS.map((o) => (
                      <label key={o.value} className={`cq-chip${draft.preferredContact === o.value ? " cq-chip--selected" : ""}`}>
                        <input
                          type="radio"
                          name="preferredContact"
                          value={o.value}
                          checked={draft.preferredContact === o.value}
                          onChange={() => {
                            setDraft((d) => ({ ...d, preferredContact: o.value }));
                            setErrors((er) => ({ ...er, preferred: undefined }));
                          }}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                <fieldset className="cq-bk__fieldset">
                  <legend>Were you referred by a doctor or clinic?</legend>
                  {errors.referral && <p className="cq-form-error" role="alert">{errors.referral}</p>}
                  <div className="cq-chip-row" role="radiogroup" aria-label="Referral status">
                    {([
                      { value: "referred" as ReferralKind, label: "Referred by a doctor or clinic" },
                      { value: "direct" as ReferralKind, label: "Direct (I found you independently)" },
                    ]).map((o) => (
                      <label key={o.value} className={`cq-chip${draft.referral === o.value ? " cq-chip--selected" : ""}`}>
                        <input
                          type="radio"
                          name="referral"
                          value={o.value}
                          checked={draft.referral === o.value}
                          onChange={() => {
                            setDraft((d) => ({ ...d, referral: o.value }));
                            setErrors((er) => ({ ...er, referral: undefined, referringParty: undefined }));
                          }}
                        />
                        {o.label}
                      </label>
                    ))}
                  </div>
                </fieldset>

                {draft.referral === "referred" && (
                  <div className="cq-field cq-field--full">
                    <label htmlFor="an-referring">Referring doctor or clinic</label>
                    <input
                      id="an-referring"
                      className={errors.referringParty ? "cq-input--error" : undefined}
                      type="text"
                      value={draft.referringParty}
                      onChange={(e) => {
                        setDraft((d) => ({ ...d, referringParty: e.target.value }));
                        if (e.target.value.trim()) setErrors((er) => ({ ...er, referringParty: undefined }));
                      }}
                      aria-invalid={errors.referringParty ? true : undefined}
                      aria-describedby={errors.referringParty ? "an-referring-err" : undefined}
                    />
                    {errors.referringParty && <p className="cq-form-error" id="an-referring-err" role="alert">{errors.referringParty}</p>}
                  </div>
                )}
              </div>
            )}

            {/* ── STEP 5: CONFIRM ──────────────────────────────────────── */}
            {draft.step === 5 && draft.service && draft.dateKey && draft.time && (
              <div className="cq-bk__step">
                <h1 className="cq-bk__h1" tabIndex={-1} ref={headingRef}>Review and confirm</h1>
                <p className="cq-bk__lead">Review your request before sending. The practice confirms your appointment by your preferred contact.</p>
                <dl className="cq-review">
                  <div className="cq-review__row">
                    <dt>Reason for visit</dt>
                    <dd>{serviceName(draft.service)}<small>with {PRACTICE.name}, {PRACTICE.role}</small></dd>
                  </div>
                  <div className="cq-review__row"><dt>Date</dt><dd>{dayShort(draft.dateKey)}</dd></div>
                  <div className="cq-review__row"><dt>Time</dt><dd>{timeLabel(draft.time)}</dd></div>
                  <div className="cq-review__row">
                    <dt>Location</dt>
                    <dd>{PRACTICE.location}<small>{PRACTICE.address}</small></dd>
                  </div>
                  <div className="cq-review__row">
                    <dt>Practice phone</dt>
                    <dd><a href={`tel:${PRACTICE.phone}`}>{PRACTICE.phoneDisplay}</a></dd>
                  </div>
                  <div className="cq-review__row"><dt>Patient</dt><dd>{draft.fullName}<small>{draft.mobile}</small></dd></div>
                  <div className="cq-review__row"><dt>Preferred contact</dt><dd>{PREFERRED_OPTIONS.find((o) => o.value === draft.preferredContact)?.label}</dd></div>
                </dl>
                <p className="cq-bk__note">
                  Your appointment is a <strong>request</strong> — the practice confirms by{" "}
                  {contactPhrase(draft.preferredContact)} before your visit, including the consultation fee.
                </p>
              </div>
            )}

            {/* ── Bottom actions ───────────────────────────────────────── */}
            <div className="cq-bk__actions">
              {draft.step < 5 ? (
                <button type="button" className="cq-btn cq-btn--primary cq-btn--lg cq-btn--block" disabled={!canForward} onClick={goForward}>
                  Continue
                </button>
              ) : (
                <button type="button" className="cq-btn cq-btn--brass cq-btn--lg cq-btn--block" disabled={submitting} onClick={handleConfirm}>
                  {submitting ? "Submitting…" : "Confirm request"}
                </button>
              )}
            </div>
          </div>

          <div className="cq-emergency cq-bk__emergency" role="note">
            If this is a medical emergency, call {PRACTICE.phoneDisplay} or go to the nearest emergency department.
          </div>
        </div>
      </section>

      {toast && (
        <div className={`cq-toast cq-toast--${toast.kind}`} role="status">
          <div className="cq-toast__body">
            <strong>{toast.title}</strong>
            {toast.sub && <p>{toast.sub}</p>}
          </div>
          <button type="button" className="cq-toast__close" onClick={dismissToast} aria-label="Dismiss">×</button>
        </div>
      )}
    </CqShell>
  );
}
