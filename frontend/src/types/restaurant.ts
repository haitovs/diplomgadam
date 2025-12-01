export type PriceTier = "$" | "$$" | "$$$";

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Restaurant {
  id: string;
  name: string;
  description: string;
  heroImage: string;
  cuisines: string[];
  tags: string[];
  dietary: string[];
  priceTier: PriceTier;
  rating: number;
  reviewCount: number;
  location: {
    address: string;
    neighborhood: string;
    city: string;
    coordinates: Coordinates;
  };
  contact: {
    phone: string;
    website: string;
  };
  schedule: {
    days: string;
    hours: string;
  }[];
  amenities: string[];
  menuHighlights: {
    name: string;
    price: string;
    description: string;
  }[];
  gallery: string[];
  sustainabilityScore: number;
  aiSummary: string;
}

export interface InsightMetric {
  title: string;
  value: string;
  trend: number;
  description: string;
}

export interface CuisineDemand {
  cuisine: string;
  demandScore: number;
}
