import { motion } from "framer-motion";
import { TrendingUp, TrendingDown } from "lucide-react";

interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
  description: string;
}

export default function MetricCard({ title, value, trend, description }: MetricCardProps) {
  const pos = trend >= 0;
  return (
    <motion.div
      className="p-5 border border-slate-100 dark:border-slate-700/50 rounded-2xl bg-white/80 dark:bg-slate-800/60 backdrop-blur space-y-3 hover:shadow-lg hover:scale-[1.02] transition-all duration-200"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <p className="text-xs uppercase tracking-wide text-slate-400 dark:text-slate-500 font-semibold">{title}</p>
      <p className="text-3xl font-bold text-slate-900 dark:text-white">{value}</p>
      <div className="flex items-center gap-1.5">
        {pos ? (
          <TrendingUp className="w-4 h-4 text-emerald-500" />
        ) : (
          <TrendingDown className="w-4 h-4 text-rose-500" />
        )}
        <span className={`text-sm font-bold ${pos ? "text-emerald-500" : "text-rose-500"}`}>
          {pos ? "+" : ""}{trend}%
        </span>
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{description}</p>
    </motion.div>
  );
}
