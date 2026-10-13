# Dr. Andrew Nyaoncha — Demo Site

Standalone copy of the Dr. Andrew Nyaoncha demo from [`ihltech`](https://github.com/violetkimani77-ux/ihltech) (`/demo-drandrew`), plus an online appointment booking flow.

Demo website by IHL Tech, for demonstration purposes.

## Pages

| Route | What it is |
|---|---|
| `/` | The Dr. Andrew demo page, same as `ihltech`'s `/demo-drandrew`. Only change: the "Book a Consultation" buttons and the service rows' "Book a visit" links now go to the booking flow instead of the contact form. |
| `/book` | Booking front door: book an appointment, or manage an existing one (by phone for now). |
| `/book/start` | Booking wizard: **Reason for visit → Date → Time → Your details → Confirm**. |
| `/book/<service>` | Same wizard with the service preselected, e.g. `/book/spinal-surgery`. These are the targets of the home page's service rows. |
| `/book/confirmation?ref=AN-XXXXX` | "Request sent" screen with reference, summary, next steps and Add to calendar. |

The booking flow is the Premium Clinic (Providence) flow from `ihltech`: stepper, calendar, time slots, 5-minute slot hold with countdown, the same patient-detail fields and validation, review step, and confirmation. It's restyled in the Dr. Andrew brand (petrol teal, brass, Fraunces / Source Sans 3). Premium Clinic's *Specialty* and *Specialist* steps are merged into one *Reason for visit* step, because this is a single-surgeon practice.

## How booking works (demo)

- Availability is illustrative. It is generated inside the published hours (Mon–Fri 09:00–15:00, Sat 09:00–11:00) for the next 21 days. It is **not** Dr. Nyaoncha's real diary.
- Requests are held in server memory (`src/routes/api/-booking.ts`) and reset when the server restarts. **Nothing is sent to the practice.** Connecting a real diary or a database (or an SMS/email notification) is the next step before using this for real patients.
- The guarantees match Premium Clinic: idempotent submit, no double-booking of a slot, and the hold must still be live when you submit.
- No consultation fee is shown, because the real fee isn't known. The flow says the practice confirms the fee when they call.

## Develop

```bash
bun install
bun run dev     # http://localhost:3000
bun run build   # production build -> .output/
bun run start   # serve the production build (PORT env, default 3000)
```

## Deploy (Vercel)

Import this repo into Vercel. There's no extra configuration: the build detects Vercel and writes `.vercel/output` itself.

## Styles

- `src/styles/app.css`: the `ihltech` stylesheet reduced to the rules the Dr. Andrew page uses (the `cq-*` classes, the chatbot, and the base `html`, `body`, `h2` and `em` rules). Fonts come from `@fontsource` (Fraunces 500/600, Source Sans 3 400/600/700), as on the original.
- `src/styles/booking.css`: the booking flow, using the page's `--cq-*` tokens.
