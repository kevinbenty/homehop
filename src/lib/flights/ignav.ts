import { FlightProvider, Offer, OfferSlice, SearchOpts, SliceQuery } from "./types";

// Ignav: self-serve live fares (https://ignav.com/docs).
// One-way and round-trip have dedicated endpoints; /fares/search takes 1–2
// ordered legs and covers open-jaw trips.
const API = "https://ignav.com/api/fares";

/* eslint-disable @typescript-eslint/no-explicit-any */
function toSlice(leg: any, checkedBags: number): OfferSlice | null {
  const segs: any[] = leg?.segments ?? [];
  if (!segs.length) return null;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const carriers = [...new Set(segs.map((s) => s.operating_carrier_name || s.marketing_carrier_code).filter(Boolean))] as string[];
  return {
    origin: first.departure_airport,
    destination: last.arrival_airport,
    departAt: first.departure_time_local ?? "",
    arriveAt: last.arrival_time_local ?? "",
    durationMin: Number(leg.duration_minutes) || segs.reduce((n, s) => n + (Number(s.duration_minutes) || 0), 0),
    stops: segs.length - 1,
    via: segs.slice(0, -1).map((s) => s.arrival_airport),
    carriers: carriers.length ? carriers : [leg.carrier].filter(Boolean),
    checkedBags,
  };
}

/** `requestedBags`: checked bags asked for in the request; Ignav then includes their estimated fees in the price. */
export function normalizeIgnav(raw: any, requestedBags = 0): Offer | null {
  const legs: any[] = raw.legs ?? [raw.outbound, raw.inbound].filter(Boolean);
  const checked = Math.max(Number(raw.bags?.checked ?? 0) || 0, requestedBags);
  const slices = legs.map((l) => toSlice(l, checked));
  if (!slices.length || slices.some((s) => !s)) return null;
  const price = Number(raw.price?.amount);
  if (!Number.isFinite(price) || !raw.price?.currency) return null;
  return {
    id: raw.ignav_id ?? "",
    price,
    currency: raw.price.currency,
    owner: slices[0]!.carriers[0] ?? "",
    slices: slices as OfferSlice[],
    source: "ignav",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class IgnavProvider implements FlightProvider {
  name = "ignav" as const;
  constructor(private apiKey: string, private market = "SE") {}

  async search(slices: SliceQuery[], opts: SearchOpts = {}): Promise<Offer[]> {
    // Ignav accepts at most one checked bag per seated traveller; extra bags stay estimates in the engine.
    const bags = Math.min(opts.checkedBags ?? 0, 1);
    let path: string;
    let body: Record<string, unknown>;
    const [a, b] = slices;
    if (slices.length === 1) {
      path = "one-way";
      body = { origin: a.origin, destination: a.destination, departure_date: a.date };
    } else if (slices.length === 2 && b.origin === a.destination && b.destination === a.origin) {
      path = "round-trip";
      body = { origin: a.origin, destination: a.destination, departure_date: a.date, return_date: b.date };
    } else {
      path = "search";
      // /fares/search takes max_stops per leg, not at the top level.
      body = { legs: slices.map((s) => ({ origin: s.origin, destination: s.destination, departure_date: s.date, max_stops: 2 })) };
    }
    const res = await fetch(`${API}/${path}`, {
      method: "POST",
      headers: { "X-Api-Key": this.apiKey, "Content-Type": "application/json" },
      body: JSON.stringify({
        ...body,
        ...(path === "search" ? {} : { max_stops: 2 }),
        adults: 1,
        cabin_class: "economy",
        market: this.market,
        ...(bags ? { checked_bags: bags } : {}),
      }),
      // Two-leg searches take longer on Ignav's side.
      signal: AbortSignal.timeout(slices.length > 1 ? 40000 : 25000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Ignav ${res.status}: ${text.slice(0, 300)}`);
    }
    const json = await res.json();
    const offers = ((json?.itineraries ?? []) as unknown[])
      .map((it) => normalizeIgnav(it, bags))
      .filter((o): o is Offer => !!o && o.slices.length === slices.length);
    offers.sort((x, y) => x.price - y.price);
    return offers.slice(0, opts.maxResults ?? 10);
  }
}
