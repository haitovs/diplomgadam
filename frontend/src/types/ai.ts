export interface AiPromptPayload {
  question: string;
  context?: Record<string, unknown>;
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
