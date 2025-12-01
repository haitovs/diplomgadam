import { useState } from "react";
import { Sparkles, Send, Clock } from "lucide-react";
import { useAiConcierge } from "../hooks/useAiConcierge";
import ErrorState from "../components/ErrorState";

const starterPrompts = [
  "Need a romantic dinner with vegan options tonight.",
  "Best spots for remote work brunch near Innovation Hub.",
  "Family-friendly restaurants with play areas on weekends."
];

export default function AiConciergePage() {
  const [question, setQuestion] = useState(starterPrompts[0]);
  const mutation = useAiConcierge();

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    mutation.mutate({ question });
  };

  return (
    <div className="space-y-8">
      <section className="glass-panel p-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-600 text-sm font-semibold">
          <Sparkles className="w-4 h-4" />
          TripAI concierge (public API proxy)
        </div>
        <h1 className="text-3xl font-semibold text-slate-900">Conversational itinerary planning</h1>
        <p className="text-slate-500 max-w-3xl">
          Responses are generated via a HuggingFace text-generation endpoint when an API key is provided. Otherwise, the
          backend returns template answers curated with faculty reviewers. Either way, latency metrics and confidence
          scores are displayed to simulate a live AI service.
        </p>
      </section>

      <section className="glass-panel p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <textarea
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            rows={4}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm focus:border-brand-400 focus:ring-2 focus:ring-brand-100"
            placeholder="Ask TripAI anything about dining in Gadam..."
          />
          <div className="flex flex-wrap gap-3">
            {starterPrompts.map((prompt) => (
              <button
                type="button"
                key={prompt}
                onClick={() => setQuestion(prompt)}
                className="px-3 py-1.5 rounded-full border border-slate-200 text-xs text-slate-500"
              >
                {prompt}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-slate-900 text-white px-5 py-2.5 text-sm font-semibold disabled:bg-slate-400"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? (
              <>
                <Clock className="w-4 h-4 animate-spin" />
                Thinking
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                Send to TripAI
              </>
            )}
          </button>
        </form>

        {mutation.isError && (
          <ErrorState
            message="AI service unreachable. Try again or provide a valid API key."
            action={() => mutation.reset()}
            actionLabel="Dismiss"
          />
        )}

        {mutation.data && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>Source: {mutation.data.source}</span>
              <span>Tokens: {mutation.data.tokensUsed}</span>
              <span>Latency: {mutation.data.latencyMs}ms</span>
            </div>
            <div className="grid gap-4">
              {mutation.data.suggestions.map((suggestion) => (
                <div key={suggestion.id} className="p-5 border border-slate-100 rounded-2xl bg-white space-y-2">
                  <div className="flex justify-between items-center">
                    <h3 className="font-semibold text-slate-900">{suggestion.title}</h3>
                    <span className="text-xs text-slate-400">Confidence: {Math.round(suggestion.confidence * 100)}%</span>
                  </div>
                  <p className="text-sm text-slate-600">{suggestion.recommendation}</p>
                  <p className="text-xs text-slate-400">{suggestion.reasoning}</p>
                  <div className="flex flex-wrap gap-2 text-xs text-brand-600">
                    {suggestion.restaurants.map((id) => (
                      <span key={id} className="px-2 py-1 rounded-full bg-brand-50">
                        #{id}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
