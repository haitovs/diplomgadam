import { useState, useMemo } from "react";
import { Sparkles, Send, Clock, ListChecks, MessageSquare, Bot, User } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAiConcierge } from "../hooks/useAiConcierge";
import ErrorState from "../components/ErrorState";
import { useQuery } from "@tanstack/react-query";
import { fetchRestaurants } from "../api/restaurants";

const starterPrompts = [
  "Need a romantic dinner with vegan options tonight.",
  "Best spots for remote work brunch near Innovation Hub.",
  "Family-friendly restaurants with play areas on weekends."
];

function ThinkingDots() {
  return (
    <div className="flex items-center gap-1 py-2">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-brand-500 dark:bg-brand-400"
          animate={{ y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ repeat: Infinity, duration: 0.8, delay: i * 0.2 }}
        />
      ))}
    </div>
  );
}

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color = pct >= 75 ? "from-emerald-500 to-emerald-400" : pct >= 50 ? "from-amber-500 to-amber-400" : "from-rose-500 to-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <motion.div
          className={`h-full rounded-full bg-gradient-to-r ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
      <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 tabular-nums">{pct}%</span>
    </div>
  );
}

export default function AiConciergePage() {
  const [question, setQuestion] = useState(starterPrompts[0]);
  const mutation = useAiConcierge();
  const restaurantsQuery = useQuery({ queryKey: ["restaurants"], queryFn: fetchRestaurants });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    mutation.mutate({ question });
  };

  const suggestionRestaurants = useMemo(() => {
    if (!mutation.data || !restaurantsQuery.data) return [];
    const ids = Array.from(new Set(mutation.data.suggestions.flatMap((s) => s.restaurants)));
    return ids
      .map((id) => restaurantsQuery.data?.find((restaurant) => restaurant.id === id))
      .filter(Boolean);
  }, [mutation.data, restaurantsQuery.data]);

  return (
    <motion.div
      className="space-y-8"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      {/* Header */}
      <section className="glass-panel p-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 dark:bg-brand-400/15 text-brand-600 dark:text-brand-300 text-sm font-semibold border border-brand-200/50 dark:border-brand-500/30">
          <Sparkles className="w-4 h-4" />
          TripAI concierge (public API proxy)
        </div>
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Conversational itinerary planning</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
          Responses are generated via a HuggingFace text-generation endpoint when an API key is provided. Otherwise, the
          backend returns template answers curated with faculty reviewers. Either way, latency metrics and confidence
          scores are displayed to simulate a live AI service.
        </p>
      </section>

      {/* Chat area */}
      <section className="glass-panel p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-400 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder="Ask TripAI anything about dining in Ashgabat..."
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {starterPrompts.map((prompt) => (
              <button
                type="button"
                key={prompt}
                onClick={() => setQuestion(prompt)}
                className="px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700 text-xs text-slate-500 dark:text-slate-400 hover:border-brand-400 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-slate-900 to-slate-700 dark:from-brand-600 dark:to-brand-500 text-white px-6 py-2.5 text-sm font-semibold disabled:opacity-40 hover:shadow-lg transition-all duration-200 hover:scale-[1.02]"
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

        {/* Thinking animation */}
        <AnimatePresence>
          {mutation.isPending && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="flex items-start gap-3 p-4 rounded-2xl bg-brand-50/50 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/20"
            >
              <Bot className="w-5 h-5 text-brand-500 dark:text-brand-400 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">TripAI is analyzing your request...</p>
                <ThinkingDots />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Suggested restaurants */}
        {mutation.data && suggestionRestaurants.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="border border-slate-200 dark:border-slate-700/50 rounded-2xl p-4 space-y-3 bg-white/60 dark:bg-slate-800/40"
          >
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <ListChecks className="w-4 h-4 text-brand-500" />
              Suggested restaurants
            </div>
            <div className="flex flex-wrap gap-2">
              {suggestionRestaurants.map((restaurant) => (
                <Link
                  key={restaurant!.id}
                  to={`/restaurants/${restaurant!.id}`}
                  className="px-3 py-1.5 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300 text-xs font-semibold border border-brand-100 dark:border-brand-500/20 hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                >
                  {restaurant!.name}
                </Link>
              ))}
            </div>
          </motion.div>
        )}

        {mutation.isError && (
          <ErrorState
            message="AI service unreachable. Try again or provide a valid API key."
            action={() => mutation.reset()}
            actionLabel="Dismiss"
          />
        )}

        {/* Results */}
        {mutation.data && (
          <motion.div
            className="space-y-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Stats bar */}
            <div className="flex flex-wrap gap-4 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                Source: <span className="font-semibold text-slate-700 dark:text-slate-300">{mutation.data.source}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                Tokens: <span className="font-semibold text-slate-700 dark:text-slate-300">{mutation.data.tokensUsed}</span>
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-medium">
                Latency: <span className="font-semibold text-slate-700 dark:text-slate-300">{mutation.data.latencyMs}ms</span>
              </span>
            </div>

            {/* Suggestion cards */}
            <div className="grid gap-4">
              {mutation.data.suggestions.map((suggestion, i) => (
                <motion.div
                  key={suggestion.id}
                  className="p-5 border border-slate-100 dark:border-slate-700/50 rounded-2xl bg-white/80 dark:bg-slate-800/50 backdrop-blur space-y-3 hover:shadow-lg transition-shadow duration-200"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                >
                  <div className="flex justify-between items-start gap-4">
                    <h3 className="font-bold text-slate-900 dark:text-white">{suggestion.title}</h3>
                    <div className="w-24 flex-shrink-0">
                      <ConfidenceBar value={suggestion.confidence} />
                    </div>
                  </div>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{suggestion.recommendation}</p>
                  <p className="text-xs text-slate-400 dark:text-slate-500 italic">{suggestion.reasoning}</p>
                  <div className="flex flex-wrap gap-2">
                    {suggestion.restaurants.map((rid) => (
                      <Link
                        key={rid}
                        to={`/restaurants/${rid}`}
                        className="px-2 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                      >
                        #{rid}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}
