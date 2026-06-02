import type { AiResponse, Restaurant } from "../types.js";
import { loadRestaurants } from "./data-loader.js";

type Lang = "tk" | "en";
type BudgetTier = "$" | "$$" | "$$$" | null;

type ReasonTag =
  | "budget"
  | "cuisine"
  | "area"
  | "vegan"
  | "vegetarian"
  | "halal"
  | "seafood"
  | "romantic"
  | "family"
  | "work"
  | "night"
  | "breakfast"
  | "experimental"
  | "topRated"
  | "sustainable";

type IntentFlag =
  | "vegan"
  | "vegetarian"
  | "romantic"
  | "family"
  | "work"
  | "night"
  | "halal"
  | "seafood"
  | "breakfast"
  | "experimental";

interface IntentProfile {
  flags: Record<IntentFlag, boolean>;
  budget: BudgetTier;
  cuisineHints: string[]; // Turkmen cuisine labels present in the dataset
  neighborhoodHints: string[];
}

// ── Bilingual keyword tables (TK + EN) ─────────────────────────────
const BUDGET_KEYWORDS: Array<{ pattern: RegExp; value: BudgetTier }> = [
  { pattern: /(arzan|amatly baha|talyp|student|cheap|budget|affordable)/i, value: "$" },
  { pattern: /(orta|gündelik|günortanlyk|casual|weekday|lunch|mid)/i, value: "$$" },
  { pattern: /(kaşaň|gymmat|premium|lýuks|baýramçylyk|toý|fancy|luxury|splurge|tasting|fine|rooftop)/i, value: "$$$" }
];

// Map query keywords to the Turkmen cuisine labels used in the dataset.
const CUISINE_HINTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /türkmen milli|milli|türkmen tagam|national|turkmen/i, label: "Türkmen milli" },
  { pattern: /palaw|plow|plov|tüwi|pilaf/i, label: "Palaw we tüwi" },
  { pattern: /türk\b|turkish|kebap|dürüm/i, label: "Türk" },
  { pattern: /steýk|steak|et\b|beef|grill et/i, label: "Steýkhaus" },
  { pattern: /deňiz|balyk|krewet|seafood|fish|oyster/i, label: "Deňiz önümleri" },
  { pattern: /italýan|italian|pasta|pizza|risotto/i, label: "Italýan" },
  { pattern: /ýewropa|europe|european|french|kontinental/i, label: "Ýewropa" },
  { pattern: /kofe|coffee|espresso|latte|kafe|cafe|kapuçino/i, label: "Kofe we kafe" },
  { pattern: /çörek|bakery|köke|pastry|kruassan|brunch|branç|ertirlik/i, label: "Çörek öýi" },
  { pattern: /aziýa|asian|sushi|noodle|ramen|wok/i, label: "Aziýa garyndy" },
  { pattern: /gril|grill|mangal|bbq|gowurma/i, label: "Gril" },
  { pattern: /halkara|international|fusion/i, label: "Halkara" }
];

const FLAG_KEYWORDS: Record<IntentFlag, RegExp> = {
  vegan: /(wegan|vegan|ösümlik|plant)/i,
  vegetarian: /(wegetarian|vegetarian|et iýmeýän|veggie|otjul)/i,
  romantic: /(romantik|romantic|söýgüli|duşuşyk|date|anniversary|ýyl dönümi|swidaniýe|şem)/i,
  family: /(maşgala|family|çaga|kids|children|çagalar|oýun meýdança|play)/i,
  work: /(iş|work|uzakdan|remote|laptop|noutbuk|kowork|cowork|meeting|duşuşyk|wifi|wi-fi)/i,
  night: /(gije|night|giç|late|agşam|öýlän soň|after|cocktail|kokteýl|klub|club)/i,
  halal: /(halal|halal sertifikat|musulman|muslim)/i,
  seafood: /(deňiz önüm|balyk|krewet|seafood|fish|oyster|pescatarian|peşketarian)/i,
  breakfast: /(ertirlik|breakfast|brunch|branç|säher|irden)/i,
  experimental: /(eksperiment|experimental|innowasion|innovative|täzeçil|tasting|degustasiýa|nepis|fine dining)/i
};

// Turkmen dietary labels in the dataset
const DIETARY_LABELS = {
  vegan: "Wegan saýlawlar",
  vegetarian: "Wegetarian saýlawlar",
  halal: "Halal",
  pescatarian: "Peşketarian"
};

// Tag/amenity matchers (work against Turkmen dataset values)
const TAG_MATCHERS = {
  romantic: /(romantik|şem|panoram|söýgüli|nepis|owadan|kaşaň|janly saz|çardak|bag jenneti)/i,
  family: /(maşgala|çaga|oýun|play|family|öý nahary|home-like|large portion)/i,
  work: /(iş|work|kowork|cowork|wifi|noutbuk|öý kabina|merkezi|espresso|branç|brunch)/i,
  breakfast: /(ertirlik|branç|brunch|ir açyl|köke|kruassan|smoothi)/i,
  experimental: /(häzirki zaman|döwrebap|döredijilik|nepis|premium|çeperçilik|modern)/i,
  seafood: /(deňiz|balyk|krewet|işbil|täze balyk)/i
};

function detectLatePattern(hours: string): boolean {
  // Open at/after midnight: 00:xx, 01:xx, 02:xx, or explicit 24:00
  return /(^|[^\d])(0[0-2]:\d{2}|24:00|23:[3-5]\d)/.test(hours);
}

function deriveIntent(question: string, restaurants: Restaurant[]): IntentProfile {
  const text = question.toLowerCase();

  const budget = BUDGET_KEYWORDS.find((entry) => entry.pattern.test(question))?.value ?? null;

  const cuisineHints = Array.from(
    new Set(CUISINE_HINTS.filter((entry) => entry.pattern.test(question)).map((entry) => entry.label))
  );

  const neighborhoodHints = restaurants
    .map((restaurant) => restaurant.location.neighborhood)
    .filter((value, index, array) => array.indexOf(value) === index)
    .filter((neighborhood) => text.includes(neighborhood.toLowerCase()));

  const flags = {} as Record<IntentFlag, boolean>;
  (Object.keys(FLAG_KEYWORDS) as IntentFlag[]).forEach((flag) => {
    flags[flag] = FLAG_KEYWORDS[flag].test(question);
  });

  return { flags, budget, cuisineHints, neighborhoodHints };
}

interface ScoreResult {
  score: number;
  tags: ReasonTag[];
}

function scoreRestaurant(restaurant: Restaurant, intent: IntentProfile): ScoreResult {
  let score = restaurant.rating * 1.1 + Math.min(restaurant.reviewCount, 400) / 400;
  const tags: ReasonTag[] = [];

  if (intent.budget) {
    if (restaurant.priceTier === intent.budget) {
      score += 1.1;
      tags.push("budget");
    } else if (intent.budget === "$" && restaurant.priceTier === "$$$") {
      score -= 1.0;
    } else if (intent.budget === "$" && restaurant.priceTier === "$$") {
      score -= 0.3;
    } else if (intent.budget === "$$$" && restaurant.priceTier === "$") {
      score -= 0.4;
    }
  }

  if (intent.cuisineHints.length > 0) {
    const matches = intent.cuisineHints.filter((label) =>
      restaurant.cuisines.some((c) => c.toLowerCase().includes(label.toLowerCase()))
    );
    if (matches.length > 0) {
      score += 0.8 * matches.length;
      tags.push("cuisine");
    }
  }

  if (intent.neighborhoodHints.length > 0 && intent.neighborhoodHints.includes(restaurant.location.neighborhood)) {
    score += 0.9;
    tags.push("area");
  }

  if (intent.flags.vegan) {
    if (restaurant.dietary.includes(DIETARY_LABELS.vegan)) {
      score += 1.4;
      tags.push("vegan");
    } else {
      score -= 0.7;
    }
  }

  if (intent.flags.vegetarian) {
    if (
      restaurant.dietary.includes(DIETARY_LABELS.vegetarian) ||
      restaurant.dietary.includes(DIETARY_LABELS.vegan)
    ) {
      score += 1.0;
      tags.push("vegetarian");
    } else {
      score -= 0.4;
    }
  }

  if (intent.flags.halal) {
    if (restaurant.dietary.includes(DIETARY_LABELS.halal)) {
      score += 1.1;
      tags.push("halal");
    } else {
      score -= 0.5;
    }
  }

  if (intent.flags.seafood) {
    const seafoodMenu =
      restaurant.cuisines.some((c) => /deňiz|balyk|seafood/i.test(c)) ||
      restaurant.tags.some((tg) => TAG_MATCHERS.seafood.test(tg)) ||
      restaurant.dietary.includes(DIETARY_LABELS.pescatarian);
    if (seafoodMenu) {
      score += 0.9;
      tags.push("seafood");
    } else {
      score -= 0.3;
    }
  }

  if (intent.flags.romantic && restaurant.tags.some((tg) => TAG_MATCHERS.romantic.test(tg))) {
    score += 0.9;
    tags.push("romantic");
  }

  if (
    intent.flags.family &&
    (restaurant.tags.some((tg) => TAG_MATCHERS.family.test(tg)) ||
      restaurant.amenities.some((a) => TAG_MATCHERS.family.test(a)))
  ) {
    score += 0.9;
    tags.push("family");
  }

  if (
    intent.flags.work &&
    (restaurant.tags.some((tg) => TAG_MATCHERS.work.test(tg)) ||
      restaurant.amenities.some((a) => /wifi|wi-fi|internet|kabina|otag|merkez/i.test(a)))
  ) {
    score += 0.9;
    tags.push("work");
  }

  if (intent.flags.night && restaurant.schedule.some((slot) => detectLatePattern(slot.hours))) {
    score += 0.8;
    tags.push("night");
  }

  if (
    intent.flags.breakfast &&
    (restaurant.tags.some((tg) => TAG_MATCHERS.breakfast.test(tg)) ||
      restaurant.cuisines.some((c) => /çörek|kofe/i.test(c)))
  ) {
    score += 0.8;
    tags.push("breakfast");
  }

  if (intent.flags.experimental && restaurant.tags.some((tg) => TAG_MATCHERS.experimental.test(tg))) {
    score += 0.8;
    tags.push("experimental");
  }

  if (restaurant.sustainabilityScore >= 82) {
    score += 0.3;
    tags.push("sustainable");
  }

  // Tiny deterministic-ish nudge by id so equal scores have stable variety
  score += (restaurant.id.charCodeAt(0) % 7) * 0.01;

  return { score, tags };
}

// ── Localized phrasing ─────────────────────────────────────────────
const REASON_LABEL: Record<Lang, Record<ReasonTag, string>> = {
  tk: {
    budget: "býujetiňize laýyk",
    cuisine: "soran tagamyňyz bar",
    area: "soran etrabyňyzda",
    vegan: "wegan saýlawlary bar",
    vegetarian: "wegetarian saýlawlary bar",
    halal: "halal aşhana",
    seafood: "deňiz önümlerine baý menýu",
    romantic: "romantik atmosfera",
    family: "maşgala üçin amatly",
    work: "uzakdan iş üçin oňaýly",
    night: "giç wagta çenli açyk",
    breakfast: "ertirlik/branç üçin gowy",
    experimental: "döwrebap, täzeçil format",
    topRated: "ýokary reýtingli",
    sustainable: "ýokary ekologiýa derejesi"
  },
  en: {
    budget: "fits your budget",
    cuisine: "serves the cuisine you asked for",
    area: "in the area you mentioned",
    vegan: "has verified vegan options",
    vegetarian: "has vegetarian options",
    halal: "halal-friendly kitchen",
    seafood: "seafood-forward menu",
    romantic: "romantic ambiance",
    family: "family-friendly",
    work: "great for remote work",
    night: "open late",
    breakfast: "good for breakfast/brunch",
    experimental: "modern, experimental format",
    topRated: "top-rated",
    sustainable: "high sustainability score"
  }
};

const UNDERSTOOD_LABEL: Record<Lang, Partial<Record<IntentFlag | "budget" | "cuisine" | "area", string>>> = {
  tk: {
    vegan: "Wegan",
    vegetarian: "Wegetarian",
    romantic: "Romantik",
    family: "Maşgala",
    work: "Iş / uzakdan",
    night: "Giç agşam",
    halal: "Halal",
    seafood: "Deňiz önümleri",
    breakfast: "Ertirlik",
    experimental: "Döwrebap",
    area: "Ýerleşiş"
  },
  en: {
    vegan: "Vegan",
    vegetarian: "Vegetarian",
    romantic: "Romantic",
    family: "Family",
    work: "Work / remote",
    night: "Late night",
    halal: "Halal",
    seafood: "Seafood",
    breakfast: "Breakfast",
    experimental: "Modern",
    area: "Location"
  }
};

function buildUnderstood(intent: IntentProfile, lang: Lang): string[] {
  const chips: string[] = [];
  (Object.keys(intent.flags) as IntentFlag[]).forEach((flag) => {
    if (intent.flags[flag] && UNDERSTOOD_LABEL[lang][flag]) {
      chips.push(UNDERSTOOD_LABEL[lang][flag]!);
    }
  });
  if (intent.budget) chips.push(intent.budget);
  if (intent.cuisineHints.length > 0) chips.push(...intent.cuisineHints);
  if (intent.neighborhoodHints.length > 0) chips.push(...intent.neighborhoodHints);
  return Array.from(new Set(chips));
}

function buildAnswer(intent: IntentProfile, count: number, lang: Lang): string {
  const understood = buildUnderstood(intent, lang);
  if (lang === "en") {
    if (understood.length === 0) {
      return `Here are ${count} highly rated places I'd recommend right now.`;
    }
    return `Based on what you asked (${understood.join(", ")}), here are my top ${count} picks:`;
  }
  if (understood.length === 0) {
    return `Häzirki wagtda maslahat berýän ýokary reýtingli ${count} ýerim:`;
  }
  return `Islegiňize görä (${understood.join(", ")}) iň gowy ${count} ýeri saýladym:`;
}

function buildReasoning(tags: ReasonTag[], restaurant: Restaurant, lang: Lang): string {
  const dict = REASON_LABEL[lang];
  const list = tags.length > 0 ? tags : (["topRated"] as ReasonTag[]);
  const phrases = list.slice(0, 4).map((tag) => dict[tag]);
  const ratingNote =
    lang === "en"
      ? `${restaurant.rating.toFixed(1)}★ (${restaurant.reviewCount} reviews)`
      : `${restaurant.rating.toFixed(1)}★ (${restaurant.reviewCount} syn)`;
  const lead = lang === "en" ? "Why: " : "Sebäbi: ";
  return `${lead}${phrases.join(", ")} · ${ratingNote}`;
}

function localizedTags(tags: ReasonTag[], lang: Lang): string[] {
  const list = tags.length > 0 ? tags : (["topRated"] as ReasonTag[]);
  return list.slice(0, 4).map((tag) => REASON_LABEL[lang][tag]);
}

function buildSuggestions(question: string, lang: Lang) {
  const restaurants = loadRestaurants();
  const intent = deriveIntent(question, restaurants);

  const scored = restaurants
    .map((restaurant) => {
      const { score, tags } = scoreRestaurant(restaurant, intent);
      return { restaurant, score, tags };
    })
    .sort((a, b) => b.score - a.score);

  const shortlist = scored.slice(0, 3);

  const suggestions = shortlist.map((entry, index) => {
    const confidenceBase = 0.82 - index * 0.11 + Math.min(entry.tags.length * 0.03, 0.1);
    return {
      id: `${entry.restaurant.id}-${index}`,
      title: entry.restaurant.name,
      recommendation: entry.restaurant.aiSummary,
      confidence: Math.max(0.5, Math.min(0.95, confidenceBase)),
      restaurants: [entry.restaurant.id],
      reasoning: buildReasoning(entry.tags, entry.restaurant, lang),
      matchTags: localizedTags(entry.tags, lang)
    };
  });

  const answer = buildAnswer(intent, suggestions.length, lang);
  const understood = buildUnderstood(intent, lang);
  const tokensUsed = Math.min(question.length * 4 + suggestions.length * 80, 640);

  return { suggestions, answer, understood, tokensUsed };
}

function calculateThinkingTime(question: string) {
  // Longer, varied "thinking" window so the staged reasoning steps in the UI
  // have time to play out and the response feels considered.
  const base = 1500 + Math.random() * 600;
  const complexity = Math.min(question.split(/\s+/).length * 45, 900);
  const jitter = 200 + Math.random() * 400;
  return Math.round(base + complexity + jitter);
}

export async function generateAiResponse(question: string, lang: Lang = "tk"): Promise<AiResponse> {
  const start = Date.now();
  const { suggestions, answer, understood, tokensUsed } = buildSuggestions(question, lang);
  const targetLatency = calculateThinkingTime(question);

  const elapsed = Date.now() - start;
  if (elapsed < targetLatency) {
    await new Promise((resolve) => setTimeout(resolve, targetLatency - elapsed));
  }

  return {
    answer,
    understood,
    suggestions,
    tokensUsed,
    latencyMs: Math.max(targetLatency, Date.now() - start),
    source: "template"
  };
}
