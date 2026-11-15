import pLimit from "p-limit";
import { cachedSearch, FlightProvider, Offer, OfferSlice } from "./flights";
import { converter, eurRates } from "./fx";
import { groundLeg, GroundLeg } from "./ground";
import { airport, City, findCity } from "./places";
import { dateRange, OPEN_JAW_CHECKS, RETURN_TICKET_CHECKS, SearchInput } from "./search-input";

/** Estimated fee per extra checked bag per flight direction, EUR. Shown as an estimate. */
export const EXTRA_BAG_EUR = 70;
/** How much one extra hour of travel "costs" in the Best balance sort, EUR. */
export const HOUR_VALUE_EUR = 10;

export type TicketKind = "return" | "openjaw" | "separate";

export interface TripLeg {
  date: string;
  slice: OfferSlice;
  groundStart: GroundLeg & { from: string; to: string; cost: number };
  groundEnd: GroundLeg & { from: string; to: string; cost: number };
  doorToDoorMin: number;
}

export interface Trip {
  id: string;
  kind: TicketKind;
  out: TripLeg;
  back: TripLeg;
  flight: number;
  bagFee: number;
  groundAbroad: number;
  groundHome: number;
  total: number;
  avgMin: number;
  bagsIncluded: number;
  owners: string[];
  bookUrls: string[];
}

export interface SearchResult {
  currency: string;
  provider: string;
  fxLive: boolean;
  callsMade: number;
  failedCalls: number;
  trips: Trip[];
  matrix: { origins: string[]; dests: string[]; cells: (number | null)[][] };
  baseline: { label: string; total: number } | null;
  hourValue: number;
}

interface LegOption {
  o: string;
  d: string;
  date: string;
  offer: Offer;
}

function googleFlightsUrl(from: string, to: string, date: string, back?: { from: string; to: string; date: string }) {
  let q = `Flights from ${from} to ${to} on ${date}`;
  if (back && back.from === to && back.to === from) q += ` returning ${back.date}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(q)}`;
}

export async function runSearch(input: SearchInput, provider: FlightProvider): Promise<SearchResult> {
  const study = findCity(input.studyCity) as City;
  const home = findCity(input.homeCity) as City;
  const { rates, live } = await eurRates();
  const toCur = converter(rates, input.currency);
  const eur = (n: number) => toCur(n, "EUR");

  const outDates = dateRange(input.outDate, input.flexDays);
  const retDates = dateRange(input.retDate, input.flexDays);
  const limit = pLimit(6);
  let callsMade = 0;
  let failedCalls = 0;

  const search = (slices: { origin: string; destination: string; date: string }[]) =>
    limit(async () => {
      callsMade++;
      try {
        return await cachedSearch(provider, slices);
      } catch (e) {
        failedCalls++;
        console.error("flight search failed", slices, e);
        return [] as Offer[];
      }
    });

  // Phase 1: one-way legs in both directions for every airport pair and date.
  const outJobs: Promise<LegOption | null>[] = [];
  const retJobs: Promise<LegOption | null>[] = [];
  for (const o of input.origins)
    for (const d of input.dests) {
      for (const date of outDates)
        outJobs.push(search([{ origin: o, destination: d, date }]).then((r) => (r[0] ? { o, d, date, offer: r[0] } : null)));
      for (const date of retDates)
        retJobs.push(search([{ origin: d, destination: o, date }]).then((r) => (r[0] ? { o: d, d: o, date, offer: r[0] } : null)));
    }
  const outLegs = (await Promise.all(outJobs)).filter((x): x is LegOption => !!x);
  const retLegs = (await Promise.all(retJobs)).filter((x): x is LegOption => !!x);

  const groundCache = new Map<string, GroundLeg>();
  const ground = (c: City, code: string) => {
    const k = c.id + code;
    if (!groundCache.has(k)) groundCache.set(k, groundLeg(c, airport(code)));
    return groundCache.get(k)!;
  };

  const buildTrip = (
    kind: TicketKind,
    outSlice: OfferSlice,
    outDate: string,
    backSlice: OfferSlice,
    backDate: string,
    flightPrice: number,
    owners: string[],
  ): Trip => {
    const o = outSlice.origin, d = outSlice.destination, d2 = backSlice.origin, o2 = backSlice.destination;
    const gOutStart = ground(study, o), gOutEnd = ground(home, d), gBackStart = ground(home, d2), gBackEnd = ground(study, o2);
    const outLeg: TripLeg = {
      date: outDate,
      slice: outSlice,
      groundStart: { ...gOutStart, from: study.name, to: o, cost: eur(gOutStart.costEur) },
      groundEnd: { ...gOutEnd, from: d, to: home.name, cost: eur(gOutEnd.costEur) },
      doorToDoorMin: gOutStart.minutes + outSlice.durationMin + gOutEnd.minutes,
    };
    const backLeg: TripLeg = {
      date: backDate,
      slice: backSlice,
      groundStart: { ...gBackStart, from: home.name, to: d2, cost: eur(gBackStart.costEur) },
      groundEnd: { ...gBackEnd, from: o2, to: study.name, cost: eur(gBackEnd.costEur) },
      doorToDoorMin: gBackStart.minutes + backSlice.durationMin + gBackEnd.minutes,
    };
    const missing = Math.max(0, input.bags - outSlice.checkedBags) + Math.max(0, input.bags - backSlice.checkedBags);
    const bagFee = eur(missing * EXTRA_BAG_EUR);
    const groundAbroad = eur(gOutStart.costEur + gBackEnd.costEur);
    const groundHome = eur(gOutEnd.costEur + gBackStart.costEur);
    const bookUrls =
      kind === "return"
        ? [googleFlightsUrl(o, d, outDate, { from: d2, to: o2, date: backDate })]
        : [googleFlightsUrl(o, d, outDate), googleFlightsUrl(d2, o2, backDate)];
    return {
      id: `${kind}:${o}-${d}-${outDate}:${d2}-${o2}-${backDate}`,
      kind,
      out: outLeg,
      back: backLeg,
      flight: flightPrice,
      bagFee,
      groundAbroad,
      groundHome,
      total: flightPrice + bagFee + groundAbroad + groundHome,
      avgMin: Math.round((outLeg.doorToDoorMin + backLeg.doorToDoorMin) / 2),
      bagsIncluded: Math.min(outSlice.checkedBags, backSlice.checkedBags),
      owners: [...new Set(owners)],
      bookUrls,
    };
  };

  // Combine one-way legs as two separate tickets.
  const trips: Trip[] = [];
  for (const a of outLegs)
    for (const b of retLegs) {
      if (b.date <= a.date) continue;
      if (!input.mix && (b.o !== a.d || b.d !== a.o)) continue;
      trips.push(
        buildTrip("separate", a.offer.slices[0], a.date, b.offer.slices[0], b.date,
          toCur(a.offer.price, a.offer.currency) + toCur(b.offer.price, b.offer.currency), [a.offer.owner, b.offer.owner]),
      );
    }

  // Phase 2: price real return tickets for the most promising same-airport pairs.
  const samePair = trips
    .filter((t) => t.out.slice.origin === t.back.slice.destination && t.out.slice.destination === t.back.slice.origin)
    .sort((x, y) => x.total - y.total);
  const seenPairs = new Set<string>();
  const rtCandidates: Trip[] = [];
  for (const t of samePair) {
    const k = t.out.slice.origin + t.out.slice.destination;
    if (seenPairs.has(k)) continue;
    seenPairs.add(k);
    rtCandidates.push(t);
    if (rtCandidates.length >= RETURN_TICKET_CHECKS) break;
  }
  // Phase 3: price the cheapest mixed-airport combinations as one open-jaw ticket.
  const mixedCandidates = input.mix
    ? trips.filter((t) => !samePair.includes(t)).sort((x, y) => x.total - y.total).slice(0, OPEN_JAW_CHECKS)
    : [];

  const ticketJobs = [...rtCandidates, ...mixedCandidates].map(async (t) => {
    const offers = await search([
      { origin: t.out.slice.origin, destination: t.out.slice.destination, date: t.out.date },
      { origin: t.back.slice.origin, destination: t.back.slice.destination, date: t.back.date },
    ]);
    const best = offers[0];
    if (!best || best.slices.length < 2) return null;
    const kind: TicketKind = rtCandidates.includes(t) ? "return" : "openjaw";
    return buildTrip(kind, best.slices[0], t.out.date, best.slices[1], t.back.date, toCur(best.price, best.currency), [best.owner]);
  });
  for (const t of await Promise.all(ticketJobs)) if (t) trips.push(t);

  // Keep the cheapest version of each itinerary shape.
  const byShape = new Map<string, Trip>();
  for (const t of trips) {
    const k = `${t.out.slice.origin}${t.out.slice.destination}${t.out.date}${t.back.slice.origin}${t.back.slice.destination}${t.back.date}`;
    const cur = byShape.get(k);
    if (!cur || t.total < cur.total) byShape.set(k, t);
  }
  const unique = [...byShape.values()];
  const hourValue = eur(HOUR_VALUE_EUR);
  const keep = new Map<string, Trip>();
  const add = (list: Trip[], n: number) => list.slice(0, n).forEach((t) => keep.set(t.id, t));
  add([...unique].sort((a, b) => a.total - b.total), 60);
  add([...unique].sort((a, b) => a.avgMin - b.avgMin), 20);
  add([...unique].sort((a, b) => a.total + (a.avgMin / 60) * hourValue - (b.total + (b.avgMin / 60) * hourValue)), 20);

  const cells = input.origins.map((o) =>
    input.dests.map((d) => {
      const list = unique.filter((t) => t.out.slice.origin === o && t.out.slice.destination === d);
      return list.length ? Math.min(...list.map((t) => t.total)) : null;
    }),
  );

  // Baseline: what a usual search finds, nearest airport at each end, same airport both ways.
  const nearestO = [...input.origins].sort((a, b) => ground(study, a).km - ground(study, b).km)[0];
  const nearestD = [...input.dests].sort((a, b) => ground(home, a).km - ground(home, b).km)[0];
  const baseList = unique.filter(
    (t) => t.out.slice.origin === nearestO && t.back.slice.destination === nearestO && t.out.slice.destination === nearestD && t.back.slice.origin === nearestD,
  );
  const baseline = baseList.length ? { label: `${nearestO} ⇄ ${nearestD} only`, total: Math.min(...baseList.map((t) => t.total)) } : null;

  return {
    currency: input.currency,
    provider: provider.name,
    fxLive: live,
    callsMade,
    failedCalls,
    trips: [...keep.values()].sort((a, b) => a.total - b.total),
    matrix: { origins: input.origins, dests: input.dests, cells },
    baseline,
    hourValue,
  };
}
