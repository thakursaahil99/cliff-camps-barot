# Cliff Camps, Barot — website & booking system

Riverside camping in Swiss tents at Barot, Himachal Pradesh. Multi-page site with its own booking engine, UPI / Razorpay payments, an admin panel and Airbnb calendar sync. Everything runs on **free tiers with no credit card**: Netlify (site + API as serverless functions) and Supabase (Postgres).

```
/frontend   React (Vite) + React Router + Tailwind CSS v4 + Framer Motion + react-day-picker + react-helmet-async
/backend    Node.js + Express REST API, wrapped with serverless-http as a Netlify Function
            supabase/schema.sql · scripts/seed.js · test/
netlify.toml                         build, functions, /api rewrite, 30-min Airbnb sync schedule
.github/workflows/keep-alive.yml     pings /api/health every 3 days so Supabase never pauses
```

## Pages

| Route | Page |
|---|---|
| `/` | Home: video/photo hero, tagline, highlight cards (Tents, Views, Food), gallery strip, Airbnb + Instagram, Book Now |
| `/stay` | Tents & Stay: tent types from the database with photos, amenities, capacity, price/night, “Check availability” |
| `/experiences` | Experiences & Food: river, wild goats, snow views, trout by the in-house chef, nearby Barot attractions |
| `/gallery` | Gallery: masonry grid with filters and a swipeable, keyboard-friendly lightbox |
| `/book` | Book & Contact: booking form, live price, Google Map, phone/WhatsApp/email/Instagram/Airbnb |
| `/booking/:id?t=…` | Guest booking page: status, UPI QR / Razorpay payment, WhatsApp link |
| `/admin` | Admin panel (JWT login at `/admin/login`) |
| anything else | 404 |

Shared: sticky navbar with mobile menu, footer, floating WhatsApp button, intro animation, scroll progress bar. All animations respect the visitor’s “reduce motion” setting.

## Run locally

Needs Node 20+.

```bash
npm install
cp backend/.env.example backend/.env      # then set JWT_SECRET, ADMIN_PASSWORD, UPI_ID
npm run seed                              # tents + admin login
npm run dev                               # API on :4000, site on http://localhost:5173
```

Without Supabase keys the API uses a **local JSON database** in `backend/.data/` and writes emails as HTML files to `backend/.data/outbox/`, so the whole booking flow works offline. Add `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` to use the real database.

Other ports: `PORT=4100 npm run dev:api` and `API_URL=http://localhost:4100 npm run dev:web`.

Tests (unit + full API flow: booking, double-booking under concurrency, UPI verify, Razorpay signature + webhook, blocks, iCal):

```bash
npm test
```

## Deploy (free)

### 1. Supabase (database)
1. Create a project at [supabase.com](https://supabase.com) (free plan).
2. **SQL Editor → New query**, paste `backend/supabase/schema.sql`, Run. This creates the tables, the atomic `create_booking` function, Row Level Security (no public access; only the backend’s service key can read or write) and a private `payment-proofs` storage bucket.
3. **Project Settings → API**: copy the Project URL and the `service_role` key.
4. Seed from your computer: put those two values in `backend/.env`, then `npm run seed`.

### 2. Netlify (site + API)
1. Push this repo to GitHub, then on [netlify.com](https://netlify.com): **Add new site → Import from Git**. `netlify.toml` already sets the build command, publish folder and functions.
2. **Site configuration → Environment variables**: add everything from `backend/.env.example` (at least `JWT_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SITE_URL`, `UPI_ID`, and the email settings). Redeploy.
3. Check `https://<your-site>.netlify.app/api/health` returns `"status":"ok","db":"supabase"`.

The API runs as Netlify Functions, so there is no server to sleep. The Airbnb sync is a Netlify scheduled function (`ical-sync`, every 30 min).

### 3. Keep Supabase awake
Free Supabase projects pause after 7 days without activity. In GitHub: **Settings → Secrets and variables → Actions → Variables**, add `SITE_URL` = your site URL. The `Keep Supabase awake` workflow then calls `/api/health` (one small DB query) every 3 days. You can also run it by hand from the Actions tab. (cron-job.org pointing at the same URL works too.)

### 4. Email
Either **Gmail**: turn on 2-step verification, create an App Password (Google Account → Security → App passwords) and set `SMTP_USER=cliffcampsbarot@gmail.com`, `SMTP_PASS=<app password>`. Or **Resend**: set `RESEND_API_KEY` (and a verified `MAIL_FROM`).

Emails sent: booking request (guest), new booking alert (`cliffcampsbarot@gmail.com`), UPI payment to verify (admin), confirmation + HTML receipt (guest), cancellation (guest).

## Booking flow

1. Guest picks a tent, dates (booked nights greyed out) and guests, and sees the price live (nights × rate, optional `TAX_PERCENT`).
2. **Request booking** creates a `pending` booking. The server re-checks availability and re-computes the price; two people can never book the last tent, because the check and insert happen together in one locked database transaction.
3. The guest lands on their private booking page (link also emailed), with a prefilled WhatsApp message.
4. Pending, unpaid bookings hold the dates for `PENDING_HOLD_HOURS` (24h), then free them automatically.

### Payments
Card data never touches our servers. Providers sit behind a small interface (`backend/src/payments/`), so another gateway can be added later.

- **UPI direct (zero fees)**: QR code + `upi://pay` deep link (“Pay with GPay / PhonePe / Paytm”) for the advance (`ADVANCE_PERCENT`, default 30%) or the full amount. The guest submits the UPI transaction ID (+ optional screenshot). The admin checks it in the bank/UPI app and clicks **Verify & confirm**, which confirms the booking and emails the receipt.
- **Razorpay (optional)**: set `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`. Start with **test keys** (`rzp_test_…`) and `PAYMENTS_LIVE=false`; switch to live keys with `PAYMENTS_LIVE=true` (mismatched keys are refused). Add a webhook in the Razorpay dashboard to `https://<site>/api/webhooks/razorpay` with the `payment.captured` event. Payments are confirmed by the server-side signature check *and* the verified webhook, and are counted only once.
- **Balance**: payable at the property. Admin → **Mark paid** records it. Refunds are done in your bank/Razorpay, then marked in admin.

### Airbnb calendar sync (no double bookings)
- **Airbnb → website**: in Airbnb, Listing → Calendar → Availability → *Export calendar*; put that link in `AIRBNB_ICAL_URL`. Every 30 min those nights become blocked dates. Set `AIRBNB_TENT_ID` (copy the tent id from Admin → Tents / the database) if the listing is one tent of a type, so each Airbnb booking takes one tent instead of closing the whole camp.
- **Website → Airbnb**: in Airbnb, *Connect another calendar* and paste `https://<site>/api/calendar.ics` (also shown in Admin → Calendar).

## Admin panel (`/admin`)
- **Bookings**: search and filter; confirm, cancel, mark paid, mark refunded, private notes.
- **Payments**: UPI verification queue with screenshots; verify, reject or mark refunded.
- **Calendar**: block dates for the whole camp, a tent type, or some tents of a type; manual Airbnb sync; the iCal feed URL.
- **Tents & prices**: price per night, capacity, number of tents, description, amenities, photos, show/hide.

Create or reset the admin login with `npm run seed` (uses `ADMIN_EMAIL` / `ADMIN_PASSWORD`). Passwords are bcrypt-hashed; sessions are 12-hour JWTs.

## API

| Method | Path | |
|---|---|---|
| GET | `/api/health` | DB ping (keep-alive) |
| GET | `/api/config` | public settings and enabled payment methods |
| GET | `/api/tents` | active tent types |
| GET | `/api/availability?tent_id=&from=&to=` | booked nights |
| POST | `/api/bookings` | create booking |
| GET | `/api/bookings/:id?t=` | guest booking page data |
| POST | `/api/bookings/:id/payments/upi` | submit UPI transaction ID / screenshot |
| POST | `/api/bookings/:id/payments/order` | create Razorpay order |
| POST | `/api/bookings/:id/payments/razorpay/verify` | verify checkout signature |
| POST | `/api/webhooks/razorpay` | `payment.captured` webhook |
| GET | `/api/calendar.ics` | iCal feed for Airbnb |
| POST | `/api/admin/login` | admin JWT |
| GET/PATCH | `/api/admin/bookings[/:id]` | list / act on bookings |
| GET/PATCH | `/api/admin/payments[/:id]` | list / verify / reject / refund |
| GET/POST/DELETE | `/api/admin/blocked-dates[/:id]` | manual blocks |
| GET/POST/PATCH | `/api/admin/tents[/:id]` | tents & prices |
| POST | `/api/admin/sync-airbnb` | run Airbnb sync now |

All input is validated with zod. Requests are rate-limited, CORS is limited to `SITE_URL` + `ALLOWED_ORIGINS`, and Helmet sets the security headers. On serverless the rate limits apply per warm instance, so treat them as best-effort.

## Content & assets
- Text, contacts and photos come from the existing site (cliffcamps.netlify.app). Its four photos, and 11 stills taken from the camp’s own video there, are in `frontend/public/images` as compressed WebP in several sizes and lazy-loaded. The video is re-encoded (muted, ~2.6 MB) in `frontend/public/video`.
- **Tent prices, capacities and counts are sample values.** Set the real ones in Admin → Tents & prices.
- **Logo:** the original logo file was not available, so `frontend/public/logo.png` / `logo.webp` / `logo-512.png` / `logo-192.png` / `apple-touch-icon.png` / `favicon-32.png` are cut from the badge in the site’s Barot-valley artwork (~280px). Replace them with the high-resolution original (same file names) when you have it.
- SEO: per-page titles/descriptions, Open Graph, `LodgingBusiness` JSON-LD in `index.html`, and `sitemap.xml` + `robots.txt` generated at build from `VITE_SITE_URL` (or Netlify’s `URL`).
