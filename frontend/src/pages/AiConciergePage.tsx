import { useState, useMemo, useEffect, useRef } from "react";
import { Sparkles, Send, Clock, ListChecks, MessageSquare, Bot, User, Check, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useAiConcierge } from "../hooks/useAiConcierge";
import ErrorState from "../components/ErrorState";
import { useQuery } from "@tanstack/react-query";
import { fetchRestaurants } from "../api/restaurants";
import { useLanguage } from "../i18n/LanguageContext";

// Staged "reasoning" UI: reveals steps one at a time with randomized pauses
// so the assistant appears to think through the request.
function ThinkingSteps({ steps }: { steps: string[] }) {
  const [revealed, setRevealed] = useState(1);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    setRevealed(1);
    timers.current.forEach((id) => clearTimeout(id));
    timers.current = [];
    let cumulative = 0;
    // Reveal each subsequent step after a random pause (humans never think
    // at a constant rate).
    for (let i = 1; i < steps.length; i++) {
      cumulative += 420 + Math.random() * 620;
      const id = window.setTimeout(() => setRevealed((r) => Math.max(r, i + 1)), cumulative);
      timers.current.push(id);
    }
    return () => {
      timers.current.forEach((id) => clearTimeout(id));
      timers.current = [];
    };
  }, [steps]);

  return (
    <div className="space-y-2">
      {steps.slice(0, revealed).map((step, i) => {
        const isCurrent = i === revealed - 1;
        return (
          <motion.div
            key={step}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.25 }}
            className="flex items-center gap-2 text-sm"
          >
            {isCurrent ? (
              <Loader2 className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400 animate-spin flex-shrink-0" />
            ) : (
              <Check className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
            )}
            <span className={isCurrent ? "text-slate-700 dark:text-slate-200" : "text-slate-400 dark:text-slate-500"}>
              {step}
            </span>
          </motion.div>
        );
      })}
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
  const { t, lang } = useLanguage();

  const starterPrompts = [
    t("ai_starter1"),
    t("ai_starter2"),
    t("ai_starter3"),
  ];

  const [question, setQuestion] = useState(starterPrompts[0]);
  const mutation = useAiConcierge();
  const restaurantsQuery = useQuery({ queryKey: ["restaurants"], queryFn: fetchRestaurants });

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!question.trim()) return;
    mutation.mutate({ question, lang });
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
      <section className="glass-panel p-5 sm:p-8 space-y-4">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 dark:bg-brand-400/15 text-brand-600 dark:text-brand-300 text-sm font-semibold border border-brand-200/50 dark:border-brand-500/30">
          <Sparkles className="w-4 h-4" />
          {t("ai_badge")}
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{t("ai_title")}</h1>
        <p className="text-slate-500 dark:text-slate-400 max-w-3xl leading-relaxed">
          {t("ai_desc")}
        </p>
      </section>

      {/* Chat area */}
      <section className="glass-panel p-4 sm:p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              rows={4}
              className="w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-4 py-3 text-sm text-slate-900 dark:text-slate-100 focus:border-brand-400 dark:focus:border-brand-500 focus:ring-2 focus:ring-brand-100 dark:focus:ring-brand-500/20 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-500"
              placeholder={t("ai_placeholder")}
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
                {t("ai_thinking")}
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {t("ai_send")}
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
              <div className="min-w-0 space-y-2">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">{t("ai_analyzing")}</p>
                <ThinkingSteps
                  steps={[
                    t("ai_step1"),
                    `${restaurantsQuery.data?.length ?? 30} ${t("ai_step2")}`,
                    t("ai_step3"),
                    t("ai_step4"),
                    t("ai_step5"),
                  ]}
                />
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
              {t("ai_suggested")}
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
            message={t("ai_error")}
            action={() => mutation.reset()}
            actionLabel={t("ai_dismiss")}
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
            {/* AI answer + understood intent */}
            <div className="flex items-start gap-3 p-4 rounded-2xl bg-brand-50/60 dark:bg-brand-500/5 border border-brand-100 dark:border-brand-500/20">
              <Bot className="w-5 h-5 text-brand-500 dark:text-brand-400 mt-0.5 flex-shrink-0" />
              <div className="space-y-2 min-w-0">
                <p className="text-sm text-slate-700 dark:text-slate-200 leading-relaxed">{mutation.data.answer}</p>
                {mutation.data.understood.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{t("ai_understood")}</span>
                    {mutation.data.understood.map((chip) => (
                      <span
                        key={chip}
                        className="px-2 py-0.5 rounded-full bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-300 text-xs font-semibold border border-brand-100 dark:border-brand-500/20"
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                )}
              </div>
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
                  <p className="text-xs text-slate-500 dark:text-slate-400">{suggestion.reasoning}</p>
                  {suggestion.matchTags && suggestion.matchTags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {suggestion.matchTags.map((tag) => (
                        <span
                          key={tag}
                          className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-medium border border-emerald-100 dark:border-emerald-500/20"
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2">
                    {suggestion.restaurants.map((rid) => {
                      const r = restaurantsQuery.data?.find((x) => x.id === rid);
                      return (
                        <Link
                          key={rid}
                          to={`/restaurants/${rid}`}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-300 text-xs font-semibold hover:bg-brand-100 dark:hover:bg-brand-500/20 transition-colors"
                        >
                          {r?.heroImage && (
                            <img src={r.heroImage} alt="" className="w-4 h-4 rounded-full object-cover" />
                          )}
                          {r?.name ?? rid}
                        </Link>
                      );
                    })}
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
