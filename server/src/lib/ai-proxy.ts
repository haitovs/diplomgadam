import type { AiResponse, Restaurant } from "../types.js";
import { loadRestaurants } from "./data-loader.js";

type BudgetTier = "$" | "$$" | "$$$" | null;

type IntentProfile = {
  vegan: boolean;
  romantic: boolean;
  family: boolean;
  work: boolean;
  night: boolean;
  halal: boolean;
  seafood: boolean;
  experimental: boolean;
  budget: BudgetTier;
  cuisineHints: string[];
  neighborhoodHints: string[];
};

const BUDGET_KEYWORDS: Array<{ pattern: RegExp; value: BudgetTier }> = [
  { pattern: /(cheap|budget|student|affordable|under\s?\d+)/i, value: "$" },
  { pattern: /(mid|casual|weekday|lunch)/i, value: "$$" },
  { pattern: /(fancy|premium|anniversary|splurge|tasting|rooftop|fine)/i, value: "$$$" }
];

const CUISINE_HINTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /ramen|noodle|tonkotsu|umami/i, label: "Japanese" },
  { pattern: /bbq|smokehouse|brisket|smoked/i, label: "Smokehouse" },
  { pattern: /oyster|seafood|fish|pescatarian/i, label: "Seafood" },
  { pattern: /brunch|bakery|pastry|pancake/i, label: "Bakery" },
  { pattern: /vegan|plant|vegetarian|green/i, label: "Plant-based" },
  { pattern: /coffee|espresso|latte|cafe/i, label: "Cafe" },
  { pattern: /georgian|supra|khachapuri|kinkhali|khinkali/i, label: "Modern Georgian" },
  { pattern: /family|kids|children/i, label: "Family" }
];

const AMENITY_MATCHERS: Record<keyof Omit<IntentProfile, "budget" | "cuisineHints" | "neighborhoodHints">, RegExp> = {
  vegan: /vegan|plant/i,
  romantic: /rooftop|panoramic|date|candle/i,
  family: /family|kids|play/i,
  work: /remote|work|laptop|cowork|focus/i,
  night: /night|late|after|club|midnight|02:00|24:00/i,
  halal: /halal/i,
  seafood: /seafood|oyster|fish|raw bar/i,
  experimental: /lab|test|immersive|tasting/i
};

function deriveIntent(question: string, restaurants: Restaurant[]): IntentProfile {
  const text = question.toLowerCase();

  const budget = BUDGET_KEYWORDS.find((entry) => entry.pattern.test(question))?.value ?? null;

  const cuisineHints = CUISINE_HINTS.filter((entry) => entry.pattern.test(question)).map((entry) => entry.label);

  const neighborhoodHints = restaurants
    .map((restaurant) => restaurant.location.neighborhood)
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((neighborhood) => text.includes(neighborhood.toLowerCase()));

  return {
    vegan: /vegan|plant|herbivore|green/.test(text),
    romantic: /romantic|date|anniversary|proposal/.test(text),
    family: /family|kids|children|stroller|play/i.test(text),
    work: /remote|work|laptop|focus|cowork|brunch|meeting/i.test(text),
    night: /night|late|after|club|cocktail|midnight/i.test(text),
    halal: /halal|muslim|zabiha/.test(text),
    seafood: /seafood|fish|oyster|pescatarian/.test(text),
    experimental: /experimental|innovative|fine dining|tasting|degustation|lab/.test(text),
    budget,
    cuisineHints,
    neighborhoodHints
  };
}

function matchList(values: string[], intentLabels: string[]): number {
  const normalized = values.map((value) => value.toLowerCase());
  return intentLabels.reduce((score, label) => (normalized.some((value) => value.includes(label.toLowerCase())) ? score + 1 : score), 0);
}

function scoreRestaurant(restaurant: Restaurant, intent: IntentProfile) {
  let score = restaurant.rating * 1.1 + Math.min(restaurant.reviewCount, 400) / 400;
  const reasons: string[] = [];

  if (intent.budget) {
    if (restaurant.priceTier === intent.budget) {
      score += 0.9;
      reasons.push("fits stated budget");
    } else if (intent.budget === "$" && restaurant.priceTier === "$$$") {
      score -= 0.9;
    } else if (intent.budget === "$" && restaurant.priceTier === "$$") {
      score -= 0.3;
    } else if (intent.budget === "$$$" && restaurant.priceTier === "$") {
      score -= 0.3;
    }
  }

  const cuisineMatches = matchList(restaurant.cuisines, intent.cuisineHints);
  if (cuisineMatches > 0) {
    score += 0.5 * cuisineMatches;
    reasons.push(`matches cuisine intent (${intent.cuisineHints.join(", ")})`);
  }

  if (intent.neighborhoodHints.length > 0 && intent.neighborhoodHints.includes(restaurant.location.neighborhood)) {
    score += 0.6;
    reasons.push(`in requested area (${restaurant.location.neighborhood})`);
  }

  if (intent.vegan) {
    if (restaurant.dietary.includes("Vegan")) {
      score += 1.2;
      reasons.push("verified vegan options");
    } else {
      score -= 0.5;
    }
  }

  if (intent.halal) {
    if (restaurant.dietary.includes("Halal")) {
      score += 1;
      reasons.push("halal-friendly kitchen");
    } else {
      score -= 0.4;
    }
  }

  if (intent.romantic && restaurant.tags.some((tag) => AMENITY_MATCHERS.romantic.test(tag))) {
    score += 0.7;
    reasons.push("romantic ambiance");
  }

  if (intent.family && (restaurant.tags.some((tag) => AMENITY_MATCHERS.family.test(tag)) || restaurant.amenities.some((amenity) => AMENITY_MATCHERS.family.test(amenity)))) {
    score += 0.7;
    reasons.push("family-friendly amenities");
  }

  if (intent.work && (restaurant.tags.some((tag) => AMENITY_MATCHERS.work.test(tag)) || restaurant.amenities.some((amenity) => /wifi|outlets|meeting|booths|usb/i.test(amenity)))) {
    score += 0.8;
    reasons.push("reliable for remote work");
  }

  if (intent.night && restaurant.schedule.some((slot) => /02:00|24:00|00:30|01:00/.test(slot.hours))) {
    score += 0.6;
    reasons.push("open late");
  }

  if (intent.seafood && restaurant.cuisines.some((cuisine) => /seafood|pescatarian|raw bar/i.test(cuisine))) {
    score += 0.6;
    reasons.push("seafood-forward menu");
  }

  if (intent.experimental && restaurant.tags.some((tag) => AMENITY_MATCHERS.experimental.test(tag))) {
    score += 0.7;
    reasons.push("experiential format");
  }

  if (restaurant.sustainabilityScore >= 80) {
    score += 0.25;
  }

  score += Math.random() * 0.05;

  return { score, reasons };
}

function formatReasoning(reasons: string[], restaurant: Restaurant, intent: IntentProfile) {
  if (reasons.length > 0) {
    return `Matched cues: ${reasons.join(", ")}.`;
  }

  const fallbacks = [`Rating ${restaurant.rating.toFixed(1)} with ${restaurant.reviewCount} reviews`];
  if (intent.budget) {
    fallbacks.push(`within ${intent.budget} budget band`);
  }
  if (restaurant.sustainabilityScore >= 80) {
    fallbacks.push("high sustainability score");
  }

  return fallbacks.join("; ");
}

function buildSuggestions(question: string) {
  const restaurants = loadRestaurants();
  const intent = deriveIntent(question, restaurants);

  const scored = restaurants
    .map((restaurant) => {
      const { score, reasons } = scoreRestaurant(restaurant, intent);
      return { restaurant, score, reasons };
    })
    .sort((a, b) => b.score - a.score);

  const shortlist = scored.slice(0, 3);

  const suggestions = shortlist.map((entry, index) => {
    const confidenceBase = 0.8 - index * 0.12 + Math.min(entry.score / 100, 0.08);
    return {
      id: `${entry.restaurant.id}-${index}`,
      title: entry.restaurant.name,
      recommendation: entry.restaurant.aiSummary,
      confidence: Math.max(0.45, Math.min(0.92, confidenceBase)),
      restaurants: [entry.restaurant.id],
      reasoning: formatReasoning(entry.reasons, entry.restaurant, intent)
    };
  });

  const tokensUsed = Math.min(question.length * 4 + suggestions.length * 80, 640);

  return { suggestions, tokensUsed };
}

function calculateThinkingTime(question: string) {
  const base = 650 + Math.random() * 250;
  const complexity = Math.min(question.split(/\s+/).length * 35, 650);
  const jitter = 120 + Math.random() * 180;
  return Math.round(base + complexity + jitter);
}

export async function generateAiResponse(question: string): Promise<AiResponse> {
  const start = Date.now();
  const { suggestions, tokensUsed } = buildSuggestions(question);
  const targetLatency = calculateThinkingTime(question);

  const elapsed = Date.now() - start;
  if (elapsed < targetLatency) {
    await new Promise((resolve) => setTimeout(resolve, targetLatency - elapsed));
  }

  return {
    suggestions,
    tokensUsed,
    latencyMs: Math.max(targetLatency, Date.now() - start),
    source: "template"
  };
}
