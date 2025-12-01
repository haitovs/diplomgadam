import { Sparkles, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

export default function HeroBanner() {
  return (
    <section className="glass-panel p-8 md:p-10 mb-8">
      <div className="flex flex-col md:flex-row gap-6 items-center">
        <div className="flex-1 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-50 text-brand-700 text-sm font-medium">
            <Sparkles className="w-4 h-4" />
            AI-assisted gastronomy planning
          </div>
          <h1 className="text-3xl md:text-4xl font-semibold text-slate-900 leading-tight">
            Design & Implementation of a Web Platform for Discovering Gadam City&apos;s Restaurants
          </h1>
          <p className="text-slate-500 text-lg">
            A diploma-project-ready template combining curated datasets, interactive visualization, and privacy-first AI
            concierge to simulate a production-ready experience.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/concierge"
              className="inline-flex items-center gap-2 rounded-full bg-brand-600 text-white px-5 py-2.5 shadow-lg shadow-brand-600/30"
            >
              Try TripAI
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/insights"
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 px-5 py-2.5 text-slate-600 hover:border-slate-400"
            >
              Research insights
            </Link>
          </div>
        </div>
        <div className="flex-1 grid grid-cols-2 gap-4 w-full">
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-brand-50 border border-slate-100">
            <p className="text-sm text-slate-500">Cuisines curated</p>
            <p className="text-3xl font-semibold text-slate-900">24</p>
            <p className="text-xs text-slate-400">sourced from city ethnographic study</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-amber-50 border border-slate-100">
            <p className="text-sm text-slate-500">Sustainability tier</p>
            <p className="text-3xl font-semibold text-slate-900">A-</p>
            <p className="text-xs text-slate-400">avg. kitchen footprint</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-emerald-50 border border-slate-100">
            <p className="text-sm text-slate-500">AI response</p>
            <p className="text-3xl font-semibold text-slate-900">1.3s</p>
            <p className="text-xs text-slate-400">median latency (template)</p>
          </div>
          <div className="p-4 rounded-2xl bg-gradient-to-br from-white to-indigo-50 border border-slate-100">
            <p className="text-sm text-slate-500">Field interviews</p>
            <p className="text-3xl font-semibold text-slate-900">42</p>
            <p className="text-xs text-slate-400">informing persona boards</p>
          </div>
        </div>
      </div>
    </section>
  );
}
