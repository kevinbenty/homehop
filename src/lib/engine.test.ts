import { beforeAll, describe, expect, it, vi } from "vitest";
import { runSearch } from "./engine";
import { isoDurationToMin } from "./flights/duffel";
import { MockProvider } from "./flights/mock";
import { FlightProvider, Offer, SliceQuery } from "./flights/types";
import { groundLeg } from "./ground";
import { airport, airportsNear, findCity } from "./places";
import { decodeQuery, encodeQuery, estimateCalls, SearchInput } from "./search-input";

beforeAll(() => {
  // Keep tests offline: force the FX fallback table.
  vi.stubGlobal("fetch", vi.fn(async () => { throw new Error("offline"); }));
});

const base: SearchInput = {
  studyCity: "gothenburg",
  homeCity: "thrissur",
  origins: ["GOT", "CPH", "OSL", "ARN"],
  dests: ["COK", "CCJ", "TRV", "MAA", "BLR"],
  outDate: "2026-12-19",
  retDate: "2027-01-11",
  flexDays: 0,
  mix: true,
  bags: 2,
  currency: "EUR",
};

describe("places and ground", () => {
  it("finds the Gothenburg corridor airports", () => {
    const codes = airportsNear(findCity("gothenburg")!, 450).map((a) => a.code);
    expect(codes).toEqual(expect.arrayContaining(["GOT", "CPH", "OSL", "ARN"]));
    expect(codes[0]).toBe("GOT");
  });
  it("uses known routes and models others", () => {
    expect(groundLeg(findCity("gothenburg")!, airport("CPH"))).toMatchObject({ mode: "Train", estimated: false });
    const est = groundLeg(findCity("kottayam")!, airport("TRV"));
    expect(est.estimated).toBe(true);
    expect(est.minutes).toBeGreaterThan(60);
  });
});

describe("helpers", () => {
  it("parses ISO durations", () => {
    expect(isoDurationToMin("PT13H5M")).toBe(785);
    expect(isoDurationToMin("P1DT2H")).toBe(1560);
  });
  it("round-trips the query encoding", () => {
    expect(decodeQuery(encodeQuery(base))).toEqual(base);
  });
  it("estimates calls", () => {
    expect(estimateCalls(base)).toBe(20 * 2 + 4 + 3);
    expect(estimateCalls({ ...base, flexDays: 1, mix: false })).toBe(20 * 3 * 2 + 4);
  });
});

describe("runSearch", () => {
  it("mixes airports and counts door-to-door cost", async () => {
    const r = await runSearch(base, new MockProvider());
    expect(r.trips.length).toBeGreaterThan(10);
    expect(r.callsMade).toBe(estimateCalls(base));
    const mixed = r.trips.filter((t) => t.out.slice.origin !== t.back.slice.destination || t.out.slice.destination !== t.back.slice.origin);
    expect(mixed.length).toBeGreaterThan(0);
    for (const t of r.trips) {
      expect(t.total).toBeCloseTo(t.flight + t.bagFee + t.groundAbroad + t.groundHome, 6);
      expect(t.back.date > t.out.date).toBe(true);
    }
    expect(r.trips.some((t) => t.kind === "return")).toBe(true);
    expect(r.trips.some((t) => t.kind === "openjaw")).toBe(true);
    expect(r.matrix.cells).toHaveLength(4);
  });

  it("keeps the same airports both ways when mixing is off", async () => {
    const r = await runSearch({ ...base, mix: false }, new MockProvider());
    for (const t of r.trips) {
      expect(t.back.slice.destination).toBe(t.out.slice.origin);
      expect(t.back.slice.origin).toBe(t.out.slice.destination);
    }
  });

  it("charges for missing bags and survives provider errors", async () => {
    let n = 0;
    const flaky: FlightProvider = {
      name: "mock",
      async search(slices: SliceQuery[]): Promise<Offer[]> {
        n++;
        if (n % 5 === 0) throw new Error("boom");
        return [{
          id: "x" + n, price: 200, currency: "EUR", owner: "Test Air", source: "mock",
          slices: slices.map((s) => ({ origin: s.origin, destination: s.destination, departAt: "", arriveAt: "", durationMin: 600, stops: 1, via: ["IST"], carriers: ["Test Air"], checkedBags: 1 })),
        }];
      },
    };
    const r = await runSearch({ ...base, origins: ["GOT", "CPH"], dests: ["COK", "BLR"], mix: false, currency: "EUR" }, flaky);
    expect(r.failedCalls).toBeGreaterThan(0);
    const t = r.trips.find((x) => x.kind === "separate")!;
    expect(t.bagFee).toBe(140);
  });
});

import { shouldNotify } from "./alerts";

describe("shouldNotify", () => {
  const now = new Date("2026-11-20T06:00:00Z");
  it("fires at or below the target", () => {
    expect(shouldNotify({ targetPrice: 900, lastBestTotal: 1000, lastNotifiedAt: null }, 900, now)).toBe(true);
    expect(shouldNotify({ targetPrice: 900, lastBestTotal: 1000, lastNotifiedAt: null }, 901, now)).toBe(false);
  });
  it("fires on a 3% drop without a target", () => {
    expect(shouldNotify({ targetPrice: null, lastBestTotal: 1000, lastNotifiedAt: null }, 970, now)).toBe(true);
    expect(shouldNotify({ targetPrice: null, lastBestTotal: 1000, lastNotifiedAt: null }, 980, now)).toBe(false);
  });
  it("waits a day between emails", () => {
    expect(shouldNotify({ targetPrice: 900, lastBestTotal: 1000, lastNotifiedAt: new Date("2026-11-20T01:00:00Z") }, 800, now)).toBe(false);
  });
});

import { defaultAirports } from "./places";

describe("defaultAirports", () => {
  it("picks the nearest airport plus hubs", () => {
    expect(defaultAirports(findCity("gothenburg")!, 550, 6)).toEqual(["GOT", "CPH", "OSL", "ARN"]);
    expect(defaultAirports(findCity("thrissur")!, 550, 6).sort()).toEqual(["BLR", "CCJ", "COK", "MAA", "TRV"]);
  });
});
