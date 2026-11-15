import { FlightProvider, Offer, OfferSlice, SliceQuery } from "./types";

const API = "https://api.duffel.com/air/offer_requests";

/** Parses an ISO 8601 duration such as "PT13H5M" or "P1DT2H" into minutes. */
export function isoDurationToMin(d: string | null | undefined): number {
  if (!d) return 0;
  const m = /P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?/.exec(d);
  if (!m) return 0;
  return (Number(m[1] ?? 0) * 24 + Number(m[2] ?? 0)) * 60 + Number(m[3] ?? 0);
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function normalize(raw: any): Offer {
  const slices: OfferSlice[] = (raw.slices ?? []).map((s: any) => {
    const segs: any[] = s.segments ?? [];
    const first = segs[0];
    const last = segs[segs.length - 1];
    const bagCounts = segs.map((seg) =>
      Math.min(
        ...((seg.passengers ?? []).map((p: any) =>
          (p.baggages ?? [])
            .filter((b: any) => b.type === "checked")
            .reduce((n: number, b: any) => n + (b.quantity ?? 0), 0),
        ) as number[]),
      ),
    );
    return {
      origin: s.origin?.iata_code ?? first?.origin?.iata_code,
      destination: s.destination?.iata_code ?? last?.destination?.iata_code,
      departAt: first?.departing_at ?? "",
      arriveAt: last?.arriving_at ?? "",
      durationMin: isoDurationToMin(s.duration),
      stops: Math.max(0, segs.length - 1),
      via: segs.slice(0, -1).map((seg) => seg.destination?.iata_code).filter(Boolean),
      carriers: [...new Set(segs.map((seg) => seg.marketing_carrier?.name).filter(Boolean))] as string[],
      checkedBags: bagCounts.length && Number.isFinite(Math.min(...bagCounts)) ? Math.min(...bagCounts) : 0,
    };
  });
  return {
    id: raw.id,
    price: Number(raw.total_amount),
    currency: raw.total_currency,
    owner: raw.owner?.name ?? "",
    slices,
    source: "duffel",
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

export class DuffelProvider implements FlightProvider {
  name = "duffel" as const;
  constructor(private token: string) {}

  async search(slices: SliceQuery[], opts: { maxResults?: number } = {}): Promise<Offer[]> {
    const res = await fetch(`${API}?return_offers=true&supplier_timeout=15000`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.token}`,
        "Duffel-Version": "v2",
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          slices: slices.map((s) => ({ origin: s.origin, destination: s.destination, departure_date: s.date })),
          passengers: [{ type: "adult" }],
          cabin_class: "economy",
          max_connections: 2,
        },
      }),
      signal: AbortSignal.timeout(25000),
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new Error(`Duffel ${res.status}: ${text.slice(0, 300)}`);
    }
    const body = await res.json();
    const offers: Offer[] = (body?.data?.offers ?? []).map(normalize).filter((o: Offer) => Number.isFinite(o.price));
    offers.sort((a, b) => a.price - b.price);
    return offers.slice(0, opts.maxResults ?? 5);
  }
}
