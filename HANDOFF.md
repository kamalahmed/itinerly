# itinerly — Session Handoff

Bridge doc for picking up in a fresh session. Captures live state, what was
built, operational gotchas, and the planned next step (email-only user auth).

---

## 1. What itinerly is

A flight-itinerary ("dummy ticket") generator for visa applications, modeled on
echoflights/onwardify. Next.js 14 + TypeScript + Tailwind + Prisma + Postgres.
Search → select flight → passenger details → (mock) payment → confirmation →
download a professional itinerary **PDF**.

- **Live:** https://itinerly.vercel.app
- **Vercel account:** `kamalacca@gmail.com` (NOT kamal@kahunas.io). Hobby plan.
- **Repo:** github.com/kamalahmed/itinerly — default branch `main`.
- **DB:** Neon Postgres via the Vercel "itinerly-pg-db" integration
  (project `steep-butterfly`, live endpoint `ep-silent-math-ap3i1wyb`, us-east-1).

## 2. Architecture

- **Provider chain** (`lib/providers/index.ts`, `searchWithChain`): serves only
  from our DB — curated real routes + connections + worldwide synthetic. It does
  NOT call any flight API per-search. `FLIGHT_PROVIDER=amadeus`/`aviationstack`
  can force a single live provider, but default is the DB-backed `mock`.
- **mock provider** (`lib/providers/mock.ts`): direct routes from `SeededRoute`
  (curated + AviationStack-enriched real flights), real curated **connections**
  (`lib/connections.ts`), and a **synthetic generator** (`lib/synthetic.ts`) for
  any uncovered origin/destination worldwide.
- **Real data via AviationStack — OFFLINE only.** Free tier is tiny (~100
  calls/mo, HTTP-only, no fares), so it is NOT called live. `prisma/enrich.ts`
  (`pnpm enrich`) spends a budgeted number of calls to write real schedules into
  `SeededRoute`; the app then serves them from the DB.
- **Data files:** `prisma/data/airports.json` (406 airports / 150 countries) and
  `prisma/data/airlines.json` (104 airlines). The seed loads these.
- **PDF:** `lib/pdf.tsx` — professional itinerary (branded header, segment cards,
  layover strips for connections, barcode). Single understated footer line; no
  "dummy/visa" disclaimer language.
- **Schema timezone math:** `lib/schedule.ts` (tz-aware arrival/duration),
  `lib/synthetic.ts` (distance→duration, hub selection).

## 3. What was built this session (newest first)

- **Search by country + geo defaults** (`b5a9541`): airport search matches IATA,
  city, name AND country, ranked IATA → city → country. FROM field shows
  geo-located default origins (Vercel ip-country header).
- **Worldwide any-pair coverage + datasets** (`2ca61a7`, `3304d8d`): synthetic
  generator for any origin↔destination; expanded to 406 airports / 104 airlines;
  improved connection hub accuracy (great-circle on-the-way hubs, realistic
  layovers).
- **AviationStack provider + offline enrichment** (`b3575c6`, then `b5a9541`
  made it enrichment-only).
- **Connecting long-haul** (`45d22ca`, `100911c`): real two-leg connections via
  carrier hubs (EK/QR/TK/EY), one-way and round-trip.
- **Real flight numbers + times** (`3bea7e4`): curated researched schedules for
  Dhaka nonstop routes.
- **PDF redesign** (`3245e92`): professional, honest single-line footer.
- **Production hardening** (earlier): security headers, fast-fail DB timeouts,
  rate-limiter fail-open, `directUrl` via Neon's `DATABASE_URL_UNPOOLED`.
- **Mobile** (`3304d8d`): header collapses on mobile; Playwright `mobile`
  project (Pixel 5) runs the booking flow.

## 4. Current production state — IMPORTANT GAPS

- **Prod DB is behind the repo data.** It was last seeded with **248 airports**
  and enriched with **65 real flights** (18 routes). The repo/deployed code now
  ships **406 airports / 104 airlines**, but the seed only runs manually. To get
  406 + fresh real data on prod:
  1. `DATABASE_URL=<prod direct URL> pnpm prisma db seed`  (loads 406 airports)
  2. `AVIATIONSTACK_API_KEY=... ENRICH_MAX_CALLS=20 DATABASE_URL=<prod> pnpm enrich`
  Re-seeding wipes routes, so always re-enrich after seeding.
- **Vercel env vars set:** `DATABASE_URL` (pooled), `DATABASE_URL_UNPOOLED`
  (direct, used as Prisma `directUrl`), `AVIATIONSTACK_API_KEY`,
  `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_DEFAULT_CURRENCY`. Upstash vars were
  removed (rate-limiter fails open). `FLIGHT_PROVIDER` defaults to mock.
- **Build** runs `prisma migrate deploy && next build` — migrations auto-apply.
  Seeding/enrichment are manual.

## 5. Branches

- `main` — production. Everything above except payments.
- **`payment-experiment`** — NOT merged, NOT pushed. Holds the payment "thank-you"
  UI (Continue free ৳0 / Buy me a coffee $1 / Send a tip ৳50). Free is default
  and works; paid tiers show "payments not enabled yet." Keep it off live until
  real Stripe/bKash is wired. Resume with `git checkout payment-experiment`.

## 6. Key commands

```
pnpm dev                  # local dev (needs local Postgres; see docker-compose.yml)
pnpm test                 # vitest (unit/integration)
pnpm test:e2e             # Playwright (desktop + mobile projects)
pnpm prisma db seed       # load airports/airlines/curated routes
pnpm enrich               # AVIATIONSTACK_API_KEY=... ENRICH_MAX_CALLS=N pnpm enrich
pnpm build                # prisma migrate deploy && next build
```
Note: `pnpm` is via `corepack`. To run against prod, prefix with
`DATABASE_URL=<Neon direct URL>` (reveal in Vercel → Storage → itinerly-pg-db →
"Show secret"; use the `DATABASE_URL_UNPOOLED` value for migrate/seed/enrich).

## 7. NEXT SESSION — user auth (email-only) + per-user limits

Goal: real users + stop bots/abuse creating unlimited free tickets. Decided:
**email-only** (no phone/SMS for v1). Phone-OTP is a later phase.

### v1 scope
- Email/password + magic link + email OTP login.
- Email verification required before generating a PDF.
- **5 tickets per user per month** limit (`count(bookings where userId AND
  createdAt in current month) < 5`).
- Bot protection: require login + a free CAPTCHA (Cloudflare Turnstile) on
  signup + the existing per-IP rate limit.
- **Dashboard**: list past itineraries, re-download PDFs, show "X/5 used".

### Auth approach — DECIDE FIRST (open question)
- **Auth.js (NextAuth) + Prisma adapter — RECOMMENDED for data-ownership.**
  Users live in OUR Neon DB (small footprint). Credentials provider (email+
  password), Email provider (magic link / OTP). Free, no vendor, library handles
  the security-sensitive parts (hashing, sessions, token expiry). ~2 days.
- **WorkOS AuthKit** — fastest (~1 day), **1,000,000 free MAU** (confirmed on
  workos.com/pricing; far more generous than Clerk's ~10k), includes email+
  password+magic link+MFA+Radar bot protection. BUT user data lives on WorkOS
  (synced to our DB via webhooks), and it's email-first (phone is SMS MFA only).
- **Roll your own** — NOT recommended. Data is small but the security surface
  (hashing, sessions, signed/expiring tokens, reset flows, timing-safe compares)
  is large; auth bugs are costly. ~3-5 days + ongoing risk.

User leans toward owning the data with a small footprint → start with **Auth.js
+ Prisma adapter** unless speed-to-ship outweighs data-ownership (then WorkOS).

### Schema additions (sketch)
```
model User { id String @id @default(cuid()) email String @unique
  emailVerified DateTime? passwordHash String? createdAt DateTime @default(now())
  bookings Booking[] }
// add Booking.userId String? + relation; Auth.js also needs Account/Session/
// VerificationToken tables (its Prisma adapter provides the schema).
```

### Payments (separate, deferred)
Keep free. The `payment-experiment` branch UI stays as-is. Real charging later:
Stripe for $1 (easy, test mode), bKash for ৳50 (needs a registered merchant
account + API approval — weeks of paperwork).

## 8. Operational notes / caveats

- 🔐 **Rotate secrets** exposed in chat this session: the Neon DB password
  (Vercel → Storage → itinerly-pg-db → "Rotate Integration Secrets") and the
  **AviationStack API key** (aviationstack.com dashboard).
- **Sandbox→Vercel network is flaky** from this environment — `itinerly.vercel.app`
  sometimes returns connection timeouts from the shell/headless browser while
  vercel.com works fine. It's environmental, not a site outage. Verify from a
  normal browser.
- **Neon free tier auto-suspends** after ~5 min idle; first request after idle
  pays a cold-start. Fast-fail timeouts keep it graceful.
- Tests assume a CLEAN seeded DB. `pnpm enrich` overwrites curated routes for the
  routes it touches, which breaks fixtures — re-seed before running tests.
- AviationStack `flightsFuture` is rate-limited on free; the enrich script uses
  the real-time `/flights` endpoint (route-filtered) instead.

---
Last updated: end of the session that shipped search-by-country, 406 airports,
mobile fixes, and the payment-experiment branch (`main` @ `3304d8d`).
