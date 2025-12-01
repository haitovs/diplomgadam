import { useMutation } from "@tanstack/react-query";
import { requestAiSuggestions } from "../api/ai";
import type { AiPromptPayload } from "../types/ai";

export function useAiConcierge() {
  return useMutation({
    mutationKey: ["ai-suggestions"],
    mutationFn: (payload: AiPromptPayload) => requestAiSuggestions(payload)
  });
}
