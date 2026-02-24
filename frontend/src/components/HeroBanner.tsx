import { Sparkles, ArrowRight, MapPin, Utensils, Star, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";

const stats = [
  { icon: Utensils, label: "Cuisines curated", value: "24", sub: "sourced from city ethnographic study", gradient: "from-brand-500/20 to-brand-600/10" },
  { icon: Star, label: "Sustainability tier", value: "A-", sub: "avg. kitchen footprint", gradient: "from-amber-500/20 to-amber-600/10" },
  { icon: Clock, label: "AI response", value: "1.3s", sub: "median latency (template)", gradient: "from-emerald-500/20 to-emerald-600/10" },
  { icon: MapPin, label: "Field interviews", value: "42", sub: "informing persona boards", gradient: "from-indigo-500/20 to-indigo-600/10" },
];

const floatingEmojis = ["🍜", "🍕", "🥗", "☕", "🥩", "🍣"];

export default function HeroBanner() {
  return (
    <section className="relative glass-panel p-8 md:p-10 mb-8 overflow-hidden">
      {/* Floating emojis */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden>
        {floatingEmojis.map((emoji, i) => (
          <motion.span
            key={i}
            className="absolute text-2xl opacity-[0.12] dark:opacity-[0.08] select-none"
            style={{ left: `${10 + i * 15}%`, top: `${15 + (i % 3) * 25}%` }}
            animate={{ y: [0, -18, 0], rotate: [0, 8, -8, 0] }}
            transition={{ repeat: Infinity, duration: 4 + i * 0.7, ease: "easeInOut" }}
          >
            {emoji}
          </motion.span>
        ))}
      </div>

      <div className="relative flex flex-col md:flex-row gap-8 items-center">
        <motion.div
          className="flex-1 space-y-5"
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 dark:bg-brand-400/15 text-brand-600 dark:text-brand-300 text-sm font-medium border border-brand-200/50 dark:border-brand-500/30">
            <Sparkles className="w-4 h-4" />
            AI-assisted gastronomy planning
          </div>
          <h1 className="text-3xl md:text-4xl font-bold leading-tight">
            <span className="bg-gradient-to-r from-slate-900 via-brand-700 to-brand-500 dark:from-white dark:via-brand-200 dark:to-brand-400 bg-clip-text text-transparent">
              Design & Implementation of a Web Platform for Discovering Ashgabat's Restaurants
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-lg leading-relaxed">
            A diploma-project-ready template combining curated datasets, interactive visualization, and privacy-first AI
            concierge to simulate a production-ready experience.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            <Link
              to="/concierge"
              className="group inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 text-white px-6 py-3 shadow-lg shadow-brand-600/30 hover:shadow-brand-500/50 hover:scale-[1.03] transition-all duration-200 font-semibold"
            >
              Try TripAI
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              to="/insights"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-6 py-3 text-slate-600 dark:text-slate-300 hover:border-brand-400 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-300 transition-colors font-semibold"
            >
              Research insights
            </Link>
          </div>
        </motion.div>

        <motion.div
          className="flex-1 grid grid-cols-2 gap-4 w-full"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 + i * 0.1 }}
              className={`group p-4 rounded-2xl bg-gradient-to-br ${stat.gradient} dark:from-slate-800/80 dark:to-slate-800/40 border border-slate-100/80 dark:border-slate-700/50 hover:shadow-lg hover:scale-[1.02] transition-all duration-200 cursor-default`}
            >
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <p className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</p>
              </div>
              <p className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
              <p className="text-xs text-slate-400 dark:text-slate-500">{stat.sub}</p>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
