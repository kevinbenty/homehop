# HomeHop

Flight search for students abroad who want to get home for the break.

Normal flight sites search one airport to one airport. A student in Gothenburg going home to Thrissur can realistically leave from Gothenburg, Copenhagen, Oslo or Stockholm, and land in Kochi, Kozhikode, Thiruvananthapuram, Chennai or Bangalore. HomeHop searches all of those combinations, including flying back from a different airport, and ranks trips by the **door-to-door** price: flights, plus the train or bus at each end, plus extra-bag fees.

## Features

- **Every airport pair, both directions.** Up to 6 departure and 6 arrival airports, with "mix airports" for open-jaw trips (out of CPH, back into GOT).
- **Door-to-door total.** Ground transport to and from each airport (known routes where we have them, a distance model otherwise, clearly marked as estimates) and fees for missing checked bags.
- **Three ticket types.** Two one-way tickets, real return tickets for the best same-airport pairs, and single open-jaw tickets for the best mixed pairs.
- **Flexible dates** (±1 or ±2 days), sort by cheapest, fastest or best balance, and a price grid for every airport pair.
- **Price alerts.** Sign in with an email link, set a target price, and a daily job re-runs the whole search and emails you when it drops.

## Stack

Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · [Duffel](https://duffel.com) flight API · Auth.js (email magic links via Resend) · Drizzle ORM + Postgres · Vercel Cron · Vitest

## How the search works

`src/lib/engine.ts`

1. Search one-way fares for every origin → destination and destination → origin pair, on every date in the window.
2. Combine outbound and return legs (same airports only, or mixed if allowed).
3. Re-price the 4 cheapest same-airport combinations as real return tickets, and the 3 cheapest mixed ones as single open-jaw tickets.
4. Add ground transport and missing-bag fees, convert everything to one currency (ECB rates via Frankfurter), and rank.

The search form shows how many flight lookups a search will make. With 4 × 5 airports, exact dates and mixing on, that's 47. Lookups run 6 at a time and are cached for 30 minutes per server instance.

## Run it locally

```bash
npm install
cp .env.example .env.local   # fill in what you have
npm run dev
```

With no `DUFFEL_ACCESS_TOKEN` the site runs on **demo fares** (clearly labelled), so you can try everything without any keys. Accounts and alerts need `DATABASE_URL`, `AUTH_SECRET` and `AUTH_RESEND_KEY`.

Create the database tables (also runs automatically before every Vercel build):

```bash
DATABASE_URL=postgres://... npm run migrate
```

Tests: `npm test`

## Deploy on Vercel

1. Import this repo in Vercel.
2. Add a Postgres database (e.g. Neon from the Vercel Marketplace). It sets `DATABASE_URL`.
3. Set the other variables from `.env.example`.
4. Tables are created automatically: the `vercel-build` script runs `scripts/migrate.mjs` before `next build`.
5. `vercel.json` schedules the alert check daily at 05:17 UTC. Vercel sends `CRON_SECRET` with each call.

## Getting real prices

1. Sign up at duffel.com. You get a test token straight away (`duffel_test_…`). Test mode returns **fake** prices.
2. To see real fares, switch off test mode in the dashboard and complete the account verification. Then create a live token (`duffel_live_…`).
3. Duffel charges per search above its search-to-book ratio, so keep the per-IP limit (`SEARCHES_PER_HOUR`) and the 150-lookup cap in place.

## Limits and next steps

- Airports and cities are a curated list (Nordics, wider Europe, South India) in `src/lib/places.ts`. Add more there.
- Ground-transport figures are estimates. Known routes are in `src/lib/ground.ts`.
- The extra-bag fee is a flat estimate (€70 per bag per direction).
- "Check and book" opens Google Flights for the same route. HomeHop doesn't sell tickets.
- Rate limiting and the fare cache are in memory per server instance. Use Redis for real traffic.
- Student fares (extra baggage, student discounts) aren't searched yet.
