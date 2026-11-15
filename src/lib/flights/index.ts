import { DuffelProvider } from "./duffel";
import { MockProvider } from "./mock";
import { FlightProvider, Offer, SliceQuery } from "./types";

export * from "./types";

export function getProvider(): FlightProvider {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token || process.env.MOCK_FLIGHTS === "1") return new MockProvider();
  return new DuffelProvider(token);
}

// In-memory cache per server instance. Fares move, so keep it short.
const TTL_MS = 30 * 60 * 1000;
type Cache = Map<string, { at: number; offers: Offer[] }>;
const caches = new Map<string, Cache>();

// One shared provider per kind so the cache survives across requests on the same instance.
let shared: FlightProvider | null = null;
export function sharedProvider(): FlightProvider {
  if (!shared) shared = getProvider();
  return shared;
}

export async function cachedSearch(provider: FlightProvider, slices: SliceQuery[]): Promise<Offer[]> {
  // Only the shared provider is cached; ad-hoc providers (tests, scripts) always hit the source.
  if (provider !== shared) return provider.search(slices, { maxResults: 5 });
  if (!caches.has(provider.name)) caches.set(provider.name, new Map());
  const cache = caches.get(provider.name)!;
  const key = slices.map((s) => `${s.origin}-${s.destination}-${s.date}`).join("|");
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.offers;
  const offers = await provider.search(slices, { maxResults: 5 });
  cache.set(key, { at: Date.now(), offers });
  if (cache.size > 2000) {
    const oldest = [...cache.entries()].sort((a, b) => a[1].at - b[1].at).slice(0, 500);
    oldest.forEach(([k]) => cache.delete(k));
  }
  return offers;
}
