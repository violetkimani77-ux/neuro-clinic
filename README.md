# Dr. Andrew Nyaoncha — Demo Site

Standalone copy of the Dr. Andrew Nyaoncha demo from [`ihltech`](https://github.com/violetkimani77-ux/ihltech) (`/demo-drandrew`), plus an online appointment booking flow.

Demo website by IHL Tech, for demonstration purposes.

## Pages

| Route | What it is |
|---|---|
| `/` | The Dr. Andrew demo page (same as `ihltech`'s `/demo-drandrew`). Additions: booking buttons go to `/book`; the contact form now sends call-back requests to the staff screen; map with directions in the contact section; FAQ section; FAQ and legal links in the nav and footer. |
| `/book` | Booking front door: book an appointment, or manage an existing one (by phone or WhatsApp for now). |
| `/book/start`, `/book/<service>` | Booking wizard: **Reason for visit → Date → Time → Your details → Confirm**. The details step requires consent to the privacy policy. |
| `/book/confirmation?ref=AN-XXXXX` | "Request sent" screen. Its status badge follows what staff do (Requested → Confirmed / Cancelled). |
| `/staff` | **Staff screen** (password-protected, not linked from the site): new requests, confirmed, past, cancelled, call-back messages. Confirm / decline / mark seen, then call or WhatsApp the patient with a prefilled message. |
| `/privacy`, `/terms` | Privacy Policy (Kenya Data Protection Act, 2019) and Terms of Use with the medical disclaimer. **Drafts: have them reviewed before real patients use the site.** |

Every page has a WhatsApp bubble (above the assistant bubble) that opens a chat with the practice's number (`PRACTICE.whatsapp` in `src/lib/booking/practice.ts`, currently the published phone number).

The booking flow is the Premium Clinic (Providence) flow from `ihltech`, restyled in the Dr. Andrew brand. Its *Specialty* and *Specialist* steps are merged into *Reason for visit*, because this is a single-surgeon practice.

## Settings (Vercel → Project → Settings → Environment Variables)

| Variable | What it does |
|---|---|
| `DATABASE_URL` | Postgres connection string. Add one with Vercel → Storage → **Neon** (it sets this for you). Tables are created automatically on first use. **Without it, bookings and messages live in server memory**: fine for a quick demo, but on Vercel they can vanish and may not appear on every visit. |
| `STAFF_PASSWORD` | Password for `/staff`. Without a database and without this, the staff password is `demo` (shown on the sign-in screen). Once `DATABASE_URL` is set, staff sign-in stays off until this is set. |

Redeploy after changing either.

## How booking works

- The diary is illustrative: slots inside the published hours (Mon–Fri 09:00–15:00, Sat 09:00–11:00, Nairobi time) for the next 21 days, minus slots already requested or confirmed. It is **not** Dr. Nyaoncha's real diary.
- Guarantees match Premium Clinic: idempotent submit, one active booking per slot (a unique index in Postgres), and the 5-minute hold must still be live on submit.
- Patients get no automatic SMS, WhatsApp or email yet. Staff send the prefilled WhatsApp message from the staff screen.
- No fee is shown. The practice confirms it when confirming the appointment.

## Develop

```bash
bun install
bun run dev     # http://localhost:3000
bun run build   # production build -> .output/
bun run start   # serve the production build (PORT env, default 3000)
```

Staff screen locally: open `/staff`, password `demo`.

## Deploy (Vercel)

Import this repo into Vercel. There's no extra configuration: the build detects Vercel and writes `.vercel/output` itself.

## Code map

- `src/lib/booking/practice.ts`: practice details, services, diary, formatting helpers.
- `src/lib/booking/faq.tsx`: FAQ questions and answers (also published as FAQPage structured data).
- `src/lib/server/store.ts`: storage (Postgres if `DATABASE_URL`, else memory). Server-only.
- `src/lib/server/staff-auth.ts`: staff password and signed session cookie. Server-only.
- `src/routes/api/-booking.ts`, `-staff.ts`: server functions for the public site and the staff screen.

## Styles

- `src/styles/app.css`: the `ihltech` stylesheet reduced to the rules the Dr. Andrew page uses (the `cq-*` classes, the chatbot, and the base `html`, `body`, `h2` and `em` rules). Fonts come from `@fontsource` (Fraunces 500/600, Source Sans 3 400/600/700), as on the original.
- `booking.css` (booking flow), `whatsapp.css` (bubble), `staff.css` (staff screen) and `home-extras.css` (map, FAQ, footer links, legal pages). All use the page's `--cq-*` tokens.
