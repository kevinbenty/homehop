import { z } from "zod";
import { CURRENCIES } from "./fx";
import { AIRPORTS, findCity } from "./places";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const airportCode = z.string().refine((c) => AIRPORTS.some((a) => a.code === c), "Unknown airport");

export const SearchInputSchema = z
  .object({
    studyCity: z.string().refine((id) => !!findCity(id), "Unknown city"),
    homeCity: z.string().refine((id) => !!findCity(id), "Unknown city"),
    origins: z.array(airportCode).min(1).max(6),
    dests: z.array(airportCode).min(1).max(6),
    outDate: isoDate,
    retDate: isoDate,
    flexDays: z.number().int().min(0).max(2),
    mix: z.boolean(),
    bags: z.number().int().min(0).max(2),
    currency: z.enum(CURRENCIES),
  })
  .refine((v) => v.retDate > v.outDate, { message: "Return must be after departure", path: ["retDate"] });

export type SearchInput = z.infer<typeof SearchInputSchema>;

export const MAX_CALLS = 150;

export function shiftDate(date: string, days: number): string {
  const d = new Date(date + "T00:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function dateRange(date: string, flex: number): string[] {
  const out: string[] = [];
  for (let i = -flex; i <= flex; i++) out.push(shiftDate(date, i));
  return out;
}

export const RETURN_TICKET_CHECKS = 4;
export const OPEN_JAW_CHECKS = 3;

/** How many flight searches one HomeHop search will make. */
export function estimateCalls(v: Pick<SearchInput, "origins" | "dests" | "flexDays" | "mix">): number {
  const n = 2 * v.flexDays + 1;
  const pairs = v.origins.length * v.dests.length;
  return pairs * n * 2 + Math.min(RETURN_TICKET_CHECKS, pairs) + (v.mix ? OPEN_JAW_CHECKS : 0);
}

export function encodeQuery(v: SearchInput): string {
  const json = JSON.stringify(v);
  if (typeof window === "undefined") return Buffer.from(json).toString("base64url");
  return btoa(json).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function decodeQuery(s: string): SearchInput | null {
  try {
    const json = typeof window === "undefined" ? Buffer.from(s, "base64url").toString() : atob(s.replace(/-/g, "+").replace(/_/g, "/"));
    const parsed = SearchInputSchema.safeParse(JSON.parse(json));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}
