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
  priceTier: string;
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

export interface AiSuggestion {
  id: string;
  title: string;
  recommendation: string;
  confidence: number;
  restaurants: string[];
  reasoning: string;
}

export interface AiResponse {
  suggestions: AiSuggestion[];
  tokensUsed: number;
  latencyMs: number;
  source: "huggingface" | "template";
}
