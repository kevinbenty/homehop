import { Airport, City, haversineKm, Region } from "./places";

export interface GroundLeg {
  mode: string;
  minutes: number;
  /** Estimated one-way cost in EUR. */
  costEur: number;
  km: number;
  estimated: boolean;
}

// Known routes, one-way, from public timetables at the time of writing.
// Keyed `${cityId}:${airportCode}`. Values are rough and should be checked.
const KNOWN: Record<string, Omit<GroundLeg, "km" | "estimated">> = {
  "gothenburg:GOT": { mode: "Airport bus", minutes: 30, costEur: 12 },
  "gothenburg:CPH": { mode: "Train", minutes: 220, costEur: 32 },
  "gothenburg:OSL": { mode: "Bus", minutes: 230, costEur: 28 },
  "gothenburg:ARN": { mode: "Train", minutes: 195, costEur: 40 },
  "gothenburg:MMX": { mode: "Train", minutes: 180, costEur: 30 },
  "thrissur:COK": { mode: "Taxi", minutes: 90, costEur: 16 },
  "thrissur:CCJ": { mode: "Train + taxi", minutes: 150, costEur: 8 },
  "thrissur:TRV": { mode: "Train", minutes: 360, costEur: 11 },
  "thrissur:CJB": { mode: "Bus", minutes: 180, costEur: 6 },
  "thrissur:MAA": { mode: "Night train", minutes: 600, costEur: 20 },
  "thrissur:BLR": { mode: "Night bus", minutes: 600, costEur: 27 },
};

const MODEL: Record<Region, { perKm: number; min: number; local: number }> = {
  nordic: { perKm: 0.13, min: 10, local: 12 },
  europe: { perKm: 0.11, min: 8, local: 10 },
  india: { perKm: 0.025, min: 3, local: 12 },
};

/** One-way ground leg between a city and an airport, using known routes or a distance model. */
export function groundLeg(city: City, ap: Airport): GroundLeg {
  const km = haversineKm(city, ap);
  const known = KNOWN[`${city.id}:${ap.code}`];
  if (known) return { ...known, km, estimated: false };
  const road = km * 1.25;
  const m = MODEL[ap.region];
  if (road <= 45) {
    return { mode: "Local transport", minutes: 45, costEur: m.local, km, estimated: true };
  }
  const minutes = Math.round(30 + (road / 70) * 60);
  const costEur = Math.max(m.min, Math.round(road * m.perKm));
  const mode = minutes > 480 ? "Overnight train or bus" : "Train or bus";
  return { mode, minutes, costEur, km, estimated: true };
}
