// Curated airports and cities for v1. Coordinates are WGS84 degrees.
// Region drives the ground-transport cost model in ground.ts.
// To support more corridors, add airports and cities here.

export type Region = "nordic" | "europe" | "india";

export interface Airport {
  code: string;
  name: string;
  city: string;
  country: string;
  region: Region;
  lat: number;
  lng: number;
  /** Major long-haul airport, preferred when picking default airports. */
  hub?: boolean;
}

export interface City {
  id: string;
  name: string;
  country: string;
  region: Region;
  lat: number;
  lng: number;
}

export const AIRPORTS: Airport[] = [
  // Nordics
  { code: "GOT", name: "Landvetter", city: "Gothenburg", country: "SE", region: "nordic", lat: 57.6628, lng: 12.2798 },
  { code: "ARN", name: "Arlanda", city: "Stockholm", country: "SE", region: "nordic", lat: 59.6519, lng: 17.9186 , hub: true },
  { code: "MMX", name: "Malmö", city: "Malmö", country: "SE", region: "nordic", lat: 55.5363, lng: 13.3762 },
  { code: "CPH", name: "Kastrup", city: "Copenhagen", country: "DK", region: "nordic", lat: 55.618, lng: 12.656 , hub: true },
  { code: "BLL", name: "Billund", city: "Billund", country: "DK", region: "nordic", lat: 55.7403, lng: 9.1518 },
  { code: "AAL", name: "Aalborg", city: "Aalborg", country: "DK", region: "nordic", lat: 57.0928, lng: 9.8492 },
  { code: "OSL", name: "Gardermoen", city: "Oslo", country: "NO", region: "nordic", lat: 60.1939, lng: 11.1004 , hub: true },
  { code: "BGO", name: "Flesland", city: "Bergen", country: "NO", region: "nordic", lat: 60.2934, lng: 5.2181 },
  { code: "HEL", name: "Helsinki-Vantaa", city: "Helsinki", country: "FI", region: "nordic", lat: 60.3172, lng: 24.9633 , hub: true },
  // Wider Europe hubs
  { code: "HAM", name: "Hamburg", city: "Hamburg", country: "DE", region: "europe", lat: 53.6304, lng: 9.9882 },
  { code: "BER", name: "Brandenburg", city: "Berlin", country: "DE", region: "europe", lat: 52.3667, lng: 13.5033 , hub: true },
  { code: "FRA", name: "Frankfurt", city: "Frankfurt", country: "DE", region: "europe", lat: 50.0379, lng: 8.5622 , hub: true },
  { code: "MUC", name: "Munich", city: "Munich", country: "DE", region: "europe", lat: 48.3538, lng: 11.7861 , hub: true },
  { code: "AMS", name: "Schiphol", city: "Amsterdam", country: "NL", region: "europe", lat: 52.3105, lng: 4.7683 , hub: true },
  { code: "EIN", name: "Eindhoven", city: "Eindhoven", country: "NL", region: "europe", lat: 51.4501, lng: 5.3745 },
  { code: "BRU", name: "Brussels", city: "Brussels", country: "BE", region: "europe", lat: 50.901, lng: 4.4844 , hub: true },
  { code: "CDG", name: "Charles de Gaulle", city: "Paris", country: "FR", region: "europe", lat: 49.0097, lng: 2.5479 , hub: true },
  { code: "LHR", name: "Heathrow", city: "London", country: "GB", region: "europe", lat: 51.47, lng: -0.4543 , hub: true },
  { code: "LGW", name: "Gatwick", city: "London", country: "GB", region: "europe", lat: 51.1537, lng: -0.1821 },
  { code: "MAN", name: "Manchester", city: "Manchester", country: "GB", region: "europe", lat: 53.3537, lng: -2.275 , hub: true },
  { code: "DUB", name: "Dublin", city: "Dublin", country: "IE", region: "europe", lat: 53.4264, lng: -6.2499 , hub: true },
  { code: "ZRH", name: "Zurich", city: "Zurich", country: "CH", region: "europe", lat: 47.4582, lng: 8.5555 , hub: true },
  { code: "VIE", name: "Vienna", city: "Vienna", country: "AT", region: "europe", lat: 48.1103, lng: 16.5697 , hub: true },
  { code: "MXP", name: "Malpensa", city: "Milan", country: "IT", region: "europe", lat: 45.6306, lng: 8.7281 },
  { code: "FCO", name: "Fiumicino", city: "Rome", country: "IT", region: "europe", lat: 41.8003, lng: 12.2389 , hub: true },
  { code: "MAD", name: "Barajas", city: "Madrid", country: "ES", region: "europe", lat: 40.4983, lng: -3.5676 , hub: true },
  { code: "WAW", name: "Chopin", city: "Warsaw", country: "PL", region: "europe", lat: 52.1657, lng: 20.9671 },
  // South India
  { code: "COK", name: "Cochin International", city: "Kochi", country: "IN", region: "india", lat: 10.152, lng: 76.4019 , hub: true },
  { code: "CCJ", name: "Calicut International", city: "Kozhikode", country: "IN", region: "india", lat: 11.1368, lng: 75.9553 , hub: true },
  { code: "TRV", name: "Trivandrum International", city: "Thiruvananthapuram", country: "IN", region: "india", lat: 8.4821, lng: 76.9201 , hub: true },
  { code: "CNN", name: "Kannur International", city: "Kannur", country: "IN", region: "india", lat: 11.9186, lng: 75.5472 },
  { code: "CJB", name: "Coimbatore International", city: "Coimbatore", country: "IN", region: "india", lat: 11.03, lng: 77.0434 },
  { code: "IXM", name: "Madurai", city: "Madurai", country: "IN", region: "india", lat: 9.8345, lng: 78.0934 },
  { code: "MAA", name: "Chennai International", city: "Chennai", country: "IN", region: "india", lat: 12.9941, lng: 80.1709 , hub: true },
  { code: "BLR", name: "Kempegowda International", city: "Bangalore", country: "IN", region: "india", lat: 13.1986, lng: 77.7066 , hub: true },
  { code: "IXE", name: "Mangaluru International", city: "Mangaluru", country: "IN", region: "india", lat: 12.9613, lng: 74.8901 },
  { code: "HYD", name: "Rajiv Gandhi International", city: "Hyderabad", country: "IN", region: "india", lat: 17.2403, lng: 78.4294 , hub: true },
  { code: "GOX", name: "Manohar International", city: "Goa", country: "IN", region: "india", lat: 15.7447, lng: 73.8606 },
  { code: "BOM", name: "Chhatrapati Shivaji Maharaj", city: "Mumbai", country: "IN", region: "india", lat: 19.0896, lng: 72.8656 , hub: true },
  { code: "DEL", name: "Indira Gandhi International", city: "Delhi", country: "IN", region: "india", lat: 28.5562, lng: 77.1 , hub: true },
];

export const STUDY_CITIES: City[] = [
  { id: "gothenburg", name: "Gothenburg", country: "SE", region: "nordic", lat: 57.7089, lng: 11.9746 },
  { id: "stockholm", name: "Stockholm", country: "SE", region: "nordic", lat: 59.3293, lng: 18.0686 },
  { id: "uppsala", name: "Uppsala", country: "SE", region: "nordic", lat: 59.8586, lng: 17.6389 },
  { id: "lund", name: "Lund", country: "SE", region: "nordic", lat: 55.7047, lng: 13.191 },
  { id: "linkoping", name: "Linköping", country: "SE", region: "nordic", lat: 58.4108, lng: 15.6214 },
  { id: "copenhagen", name: "Copenhagen", country: "DK", region: "nordic", lat: 55.6761, lng: 12.5683 },
  { id: "aarhus", name: "Aarhus", country: "DK", region: "nordic", lat: 56.1629, lng: 10.2039 },
  { id: "oslo", name: "Oslo", country: "NO", region: "nordic", lat: 59.9139, lng: 10.7522 },
  { id: "trondheim", name: "Trondheim", country: "NO", region: "nordic", lat: 63.4305, lng: 10.3951 },
  { id: "helsinki", name: "Helsinki", country: "FI", region: "nordic", lat: 60.1699, lng: 24.9384 },
  { id: "berlin", name: "Berlin", country: "DE", region: "europe", lat: 52.52, lng: 13.405 },
  { id: "munich", name: "Munich", country: "DE", region: "europe", lat: 48.1351, lng: 11.582 },
  { id: "aachen", name: "Aachen", country: "DE", region: "europe", lat: 50.7753, lng: 6.0839 },
  { id: "delft", name: "Delft", country: "NL", region: "europe", lat: 52.0116, lng: 4.3571 },
  { id: "eindhoven", name: "Eindhoven", country: "NL", region: "europe", lat: 51.4416, lng: 5.4697 },
  { id: "london", name: "London", country: "GB", region: "europe", lat: 51.5072, lng: -0.1276 },
  { id: "paris", name: "Paris", country: "FR", region: "europe", lat: 48.8566, lng: 2.3522 },
  { id: "dublin", name: "Dublin", country: "IE", region: "europe", lat: 53.3498, lng: -6.2603 },
];

export const HOME_CITIES: City[] = [
  { id: "thrissur", name: "Thrissur", country: "IN", region: "india", lat: 10.5276, lng: 76.2144 },
  { id: "kochi", name: "Kochi", country: "IN", region: "india", lat: 9.9312, lng: 76.2673 },
  { id: "kottayam", name: "Kottayam", country: "IN", region: "india", lat: 9.5916, lng: 76.5222 },
  { id: "idukki", name: "Idukki (Painavu)", country: "IN", region: "india", lat: 9.85, lng: 76.97 },
  { id: "kozhikode", name: "Kozhikode", country: "IN", region: "india", lat: 11.2588, lng: 75.7804 },
  { id: "kannur", name: "Kannur", country: "IN", region: "india", lat: 11.8745, lng: 75.3704 },
  { id: "palakkad", name: "Palakkad", country: "IN", region: "india", lat: 10.7867, lng: 76.6548 },
  { id: "thiruvananthapuram", name: "Thiruvananthapuram", country: "IN", region: "india", lat: 8.5241, lng: 76.9366 },
  { id: "kollam", name: "Kollam", country: "IN", region: "india", lat: 8.8932, lng: 76.6141 },
  { id: "coimbatore", name: "Coimbatore", country: "IN", region: "india", lat: 11.0168, lng: 76.9558 },
  { id: "madurai", name: "Madurai", country: "IN", region: "india", lat: 9.9252, lng: 78.1198 },
  { id: "chennai", name: "Chennai", country: "IN", region: "india", lat: 13.0827, lng: 80.2707 },
  { id: "bangalore", name: "Bangalore", country: "IN", region: "india", lat: 12.9716, lng: 77.5946 },
  { id: "mangaluru", name: "Mangaluru", country: "IN", region: "india", lat: 12.9141, lng: 74.856 },
  { id: "hyderabad", name: "Hyderabad", country: "IN", region: "india", lat: 17.385, lng: 78.4867 },
];

export function airport(code: string): Airport {
  const a = AIRPORTS.find((x) => x.code === code);
  if (!a) throw new Error(`Unknown airport ${code}`);
  return a;
}

export function findCity(id: string): City | undefined {
  return [...STUDY_CITIES, ...HOME_CITIES].find((c) => c.id === id);
}

export function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

/** Airports within `radiusKm` straight-line distance of a city, nearest first. */
export function airportsNear(city: City, radiusKm: number): (Airport & { km: number })[] {
  return AIRPORTS.map((a) => ({ ...a, km: haversineKm(city, a) }))
    .filter((a) => a.km <= radiusKm)
    .sort((x, y) => x.km - y.km);
}

/** Default airports for a city: the nearest one plus long-haul hubs in range. */
export function defaultAirports(city: City, radiusKm: number, max: number): string[] {
  const near = airportsNear(city, radiusKm);
  if (!near.length) return [];
  const picks = [near[0], ...near.slice(1).filter((a) => a.hub)];
  return picks.slice(0, max).map((a) => a.code);
}
