import { airport, haversineKm } from "../places";
import { FlightProvider, Offer, OfferSlice, SearchOpts, SliceQuery } from "./types";

// Deterministic fake fares for development and demos. Prices are in EUR and
// loosely follow distance, hub, season and day of week. They are NOT real.

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 4294967295;
}

const HUBS = [
  { via: "DOH", carrier: "Qatar Airways", bags: 2 },
  { via: "DXB", carrier: "Emirates", bags: 2 },
  { via: "AUH", carrier: "Etihad Airways", bags: 2 },
  { via: "IST", carrier: "Turkish Airlines", bags: 1 },
  { via: "FRA", carrier: "Lufthansa", bags: 1 },
];

function mockSlice(q: SliceQuery, seed: string): { slice: OfferSlice; price: number } {
  const o = airport(q.origin);
  const d = airport(q.destination);
  const km = haversineKm(o, d);
  const r = hash(seed);
  const hub = HUBS[Math.floor(r * HUBS.length) % HUBS.length];
  const longHaul = km > 3000;
  const smallOrigin = !["CPH", "ARN", "OSL", "HEL", "AMS", "FRA", "LHR", "CDG", "MUC"].includes(o.code);
  const durationMin = Math.round((km / 780) * 60 + (longHaul ? 120 : 60) + (smallOrigin && longHaul ? 150 : 0) + r * 180);
  const day = new Date(q.date + "T00:00:00Z");
  const month = day.getUTCMonth();
  const dd = day.getUTCDate();
  const peak = (month === 11 && dd >= 15) || (month === 0 && dd <= 6) ? 1.35 : 1;
  const weekday = [1.08, 0.95, 0.92, 0.94, 1.05, 1.1, 1.02][day.getUTCDay()];
  const base = 60 + km * 0.055 + (smallOrigin ? 45 : 0);
  const price = Math.round(base * peak * weekday * (0.85 + r * 0.35));
  const dep = new Date(`${q.date}T${String(6 + Math.floor(r * 15)).padStart(2, "0")}:${r > 0.5 ? "35" : "05"}:00`);
  const arr = new Date(dep.getTime() + durationMin * 60000);
  return {
    price,
    slice: {
      origin: o.code,
      destination: d.code,
      departAt: dep.toISOString().slice(0, 19),
      arriveAt: arr.toISOString().slice(0, 19),
      durationMin,
      stops: longHaul ? 1 : 0,
      via: longHaul ? [hub.via] : [],
      carriers: [hub.carrier],
      checkedBags: hub.bags,
    },
  };
}

export class MockProvider implements FlightProvider {
  name = "mock" as const;

  async search(slices: SliceQuery[], opts: SearchOpts = {}): Promise<Offer[]> {
    const n = Math.min(opts.maxResults ?? 3, 3);
    const offers: Offer[] = [];
    for (let i = 0; i < n; i++) {
      const parts = slices.map((q, j) => mockSlice(q, `${q.origin}${q.destination}${q.date}#${i}#${j}`));
      let price = parts.reduce((s, p) => s + p.price, 0);
      if (slices.length === 2) {
        const sameO = slices[0].origin === slices[1].destination;
        const sameD = slices[0].destination === slices[1].origin;
        price *= sameO && sameD ? 0.86 : 0.93; // return / open-jaw tickets price below two one-ways
      }
      offers.push({
        id: `mock_${slices.map((s) => s.origin + s.destination + s.date).join("_")}_${i}`,
        price: Math.round(price),
        currency: "EUR",
        owner: parts[0].slice.carriers[0],
        slices: parts.map((p) => p.slice),
        source: "mock",
      });
    }
    await new Promise((r) => setTimeout(r, 40));
    return offers.sort((a, b) => a.price - b.price);
  }
}
