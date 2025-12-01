import type { AiResponse, Restaurant } from "../types.js";
import { loadRestaurants } from "./data-loader.js";

const apiKey = process.env.HUGGINGFACE_API_KEY;
const modelId = process.env.HUGGINGFACE_MODEL ?? "mistralai/Mistral-7B-Instruct-v0.2";

type IntentFlags = {
  vegan: boolean;
  romantic: boolean;
  family: boolean;
  work: boolean;
  night: boolean;
  halal: boolean;
  seafood: boolean;
  experimental: boolean;
};

function deriveIntent(question: string): IntentFlags {
  const text = question.toLowerCase();
  return {
    vegan: /vegan|plant|herbivore|green/.test(text),
    romantic: /romantic|date|anniversary|proposal/.test(text),
    family: /family|kids|children|stroller/.test(text),
    work: /remote|work|laptop|focus|cowork|brunch/.test(text),
    night: /night|late|after|club|cocktail/.test(text),
    halal: /halal|muslim|zabiha/.test(text),
    seafood: /seafood|fish|oyster|pescatarian/.test(text),
    experimental: /experimental|innovative|fine dining|tasting|degustation/.test(text)
  };
}

function scoreRestaurant(restaurant: Restaurant, intent: IntentFlags) {
  let score = restaurant.rating;
  const reasons: string[] = [];

  if (intent.vegan) {
    if (restaurant.dietary.includes("Vegan")) {
      score += 1.2;
      reasons.push("verified vegan options");
    } else {
      score -= 0.4;
    }
  }

  if (intent.romantic && restaurant.tags.some((tag) => /panoramic|rooftop|tasting/i.test(tag))) {
    score += 0.8;
    reasons.push("romantic ambiance cues");
  }

  if (intent.family && restaurant.tags.some((tag) => /family|children/i.test(tag))) {
    score += 0.6;
    reasons.push("family-friendly infrastructure");
  }

  if (intent.work && restaurant.tags.some((tag) => /work|focus|makerspace|remote/i.test(tag))) {
    score += 0.7;
    reasons.push("work-friendly amenities");
  }

  if (intent.night && restaurant.schedule.some((slot) => /02:00|24:00/.test(slot.hours))) {
    score += 0.5;
    reasons.push("extended late-night hours");
  }

  if (intent.halal) {
    if (restaurant.dietary.includes("Halal")) {
      score += 1;
      reasons.push("halal-certified kitchen");
    } else {
      score -= 0.5;
    }
  }

  if (intent.seafood && restaurant.cuisines.some((cuisine) => /seafood|pescatarian/i.test(cuisine))) {
    score += 0.6;
    reasons.push("specialized seafood menu");
  }

  if (intent.experimental && restaurant.tags.some((tag) => /lab|test|immersi|tasting/i.test(tag))) {
    score += 0.9;
    reasons.push("experimental formats");
  }

  score += Math.random() * 0.1;

  return { score, reasons };
}

function createTemplateResponse(question: string, fallback = false): AiResponse {
  const restaurants = loadRestaurants();
  const intent = deriveIntent(question);
  const scored = restaurants
    .map((restaurant) => {
      const { score, reasons } = scoreRestaurant(restaurant, intent);
      return { restaurant, score, reasons };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  const suggestions = scored.map((entry, index) => ({
    id: `${entry.restaurant.id}-${index}`,
    title: entry.restaurant.name,
    recommendation: entry.restaurant.aiSummary,
    confidence: Math.max(0.6 - index * 0.1, 0.4),
    restaurants: [entry.restaurant.id],
    reasoning:
      entry.reasons.length > 0
        ? `Matched cues: ${entry.reasons.join(", ")}`
        : "Selected based on overall visitor satisfaction and rating."
  }));

  return {
    suggestions,
    tokensUsed: 0,
    latencyMs: Math.floor(500 + Math.random() * 400),
    source: fallback ? "template" : "template"
  };
}

async function callHuggingFace(question: string): Promise<string | null> {
  if (!apiKey) return null;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`https://api-inference.huggingface.co/models/${modelId}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ inputs: question }),
      signal: controller.signal
    });
    clearTimeout(timeout);
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HuggingFace request failed: ${errorText}`);
    }
    const json = (await response.json()) as Array<{ generated_text?: string }>;
    return json[0]?.generated_text ?? null;
  } catch (error) {
    console.warn("AI proxy fallback", error);
    return null;
  }
}

export async function generateAiResponse(question: string): Promise<AiResponse> {
  const start = Date.now();
  const huggingText = await callHuggingFace(question);

  if (!huggingText) {
    return createTemplateResponse(question, true);
  }

  const template = createTemplateResponse(question);
  return {
    ...template,
    tokensUsed: Math.min(huggingText.length, 512),
    latencyMs: Date.now() - start,
    source: "huggingface",
    suggestions: template.suggestions.map((suggestion, index) => ({
      ...suggestion,
      reasoning: index === 0 ? huggingText : suggestion.reasoning
    }))
  };
}
