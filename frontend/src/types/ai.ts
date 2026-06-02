export interface AiPromptPayload {
  question: string;
  lang?: "tk" | "en";
  context?: Record<string, unknown>;
}

export interface AiSuggestion {
  id: string;
  title: string;
  recommendation: string;
  confidence: number;
  restaurants: string[];
  reasoning: string;
  matchTags: string[];
}

export interface AiResponse {
  answer: string;
  understood: string[];
  suggestions: AiSuggestion[];
  tokensUsed: number;
  latencyMs: number;
  source: "huggingface" | "template";
}
