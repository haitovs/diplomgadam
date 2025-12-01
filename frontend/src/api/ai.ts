import { post } from "./client";
import { AiPromptPayload, AiResponse } from "../types/ai";

export async function requestAiSuggestions(payload: AiPromptPayload) {
  return post<AiResponse, AiPromptPayload>("/ai/suggest", payload);
}
