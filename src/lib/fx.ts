// Currency conversion via the free ECB-based Frankfurter API, with a fallback table.
export const CURRENCIES = ["SEK", "EUR", "NOK", "DKK", "INR", "GBP", "USD"] as const;
export type Currency = (typeof CURRENCIES)[number];

// Approximate units per 1 EUR. Used only if the live lookup fails.
const FALLBACK: Record<string, number> = {
  EUR: 1, SEK: 11.2, NOK: 11.7, DKK: 7.46, INR: 97, GBP: 0.86, USD: 1.12,
};

let cache: { at: number; rates: Record<string, number> } | null = null;
const TTL_MS = 12 * 60 * 60 * 1000;

export async function eurRates(): Promise<{ rates: Record<string, number>; live: boolean }> {
  if (cache && Date.now() - cache.at < TTL_MS) return { rates: cache.rates, live: true };
  try {
    const res = await fetch("https://api.frankfurter.app/latest?from=EUR", { signal: AbortSignal.timeout(4000) });
    if (!res.ok) throw new Error(String(res.status));
    const body = (await res.json()) as { rates: Record<string, number> };
    const rates = { EUR: 1, ...body.rates };
    cache = { at: Date.now(), rates };
    return { rates, live: true };
  } catch {
    return { rates: FALLBACK, live: false };
  }
}

export function converter(rates: Record<string, number>, to: string) {
  return (amount: number, from: string): number => {
    const fromRate = rates[from] ?? FALLBACK[from];
    const toRate = rates[to] ?? FALLBACK[to];
    if (!fromRate || !toRate) throw new Error(`No rate for ${from} or ${to}`);
    return (amount / fromRate) * toRate;
  };
}
