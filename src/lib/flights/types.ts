export interface SliceQuery {
  origin: string;
  destination: string;
  date: string; // YYYY-MM-DD
}

export interface OfferSlice {
  origin: string;
  destination: string;
  departAt: string; // local ISO datetime from the airline
  arriveAt: string;
  durationMin: number;
  stops: number;
  via: string[];
  carriers: string[];
  /** Checked bags included per passenger on this slice. */
  checkedBags: number;
}

export interface Offer {
  id: string;
  price: number;
  currency: string;
  owner: string;
  slices: OfferSlice[];
  source: "ignav" | "duffel" | "mock";
}

export interface FlightProvider {
  name: "ignav" | "duffel" | "mock";
  /** Returns the cheapest offers for the given slices, cheapest first. */
  search(slices: SliceQuery[], opts?: { maxResults?: number }): Promise<Offer[]>;
}
