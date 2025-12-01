interface MetricCardProps {
  title: string;
  value: string;
  trend: number;
  description: string;
}

export default function MetricCard({ title, value, trend, description }: MetricCardProps) {
  const trendColor = trend >= 0 ? "text-emerald-500" : "text-rose-500";
  const trendLabel = `${trend >= 0 ? "+" : ""}${trend}%`;
  return (
    <div className="p-5 border border-slate-100 rounded-2xl bg-white space-y-2">
      <p className="text-xs uppercase tracking-wide text-slate-400">{title}</p>
      <p className="text-2xl font-semibold text-slate-900">{value}</p>
      <p className={`text-sm font-semibold ${trendColor}`}>{trendLabel}</p>
      <p className="text-sm text-slate-500">{description}</p>
    </div>
  );
}
