import { useQuery } from "@tanstack/react-query";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import MetricCard from "../components/MetricCard";
import { fetchCuisineDemand, fetchInsightMetrics } from "../api/restaurants";
import { ResponsiveContainer, BarChart, Bar, XAxis, Tooltip } from "recharts";

export default function InsightsPage() {
  const metricsQuery = useQuery({
    queryKey: ["insights-metrics"],
    queryFn: fetchInsightMetrics
  });

  const cuisineDemandQuery = useQuery({
    queryKey: ["cuisine-demand"],
    queryFn: fetchCuisineDemand
  });

  if (metricsQuery.isLoading || cuisineDemandQuery.isLoading) {
    return <LoadingState label="Crunching food intelligence..." />;
  }

  if (metricsQuery.isError || cuisineDemandQuery.isError) {
    return <ErrorState message="Unable to fetch analytics" action={() => { metricsQuery.refetch(); cuisineDemandQuery.refetch(); }} />;
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-3xl font-semibold text-slate-900">City dining intelligence</h1>
        <p className="text-slate-500 max-w-3xl">
          Derived from ethnographic studies of Gadam residents, aggregated delivery-platform data, and on-site observations.
          Values are static for the diploma template but can be replaced by live analytics feeds.
        </p>
      </section>

      <section className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
        {metricsQuery.data?.map((metric) => (
          <MetricCard key={metric.title} {...metric} />
        ))}
      </section>

      <section className="glass-panel p-6 space-y-4">
        <div>
          <h2 className="text-xl font-semibold text-slate-900">Cuisine demand heatmap</h2>
          <p className="text-sm text-slate-500">
            Demand scores (0-100) represent weighted sentiment (social + surveys + search intent). Use this to plan pop-ups.
          </p>
        </div>
        <div className="w-full h-72">
          <ResponsiveContainer>
            <BarChart data={cuisineDemandQuery.data}>
              <XAxis dataKey="cuisine" stroke="#94a3b8" />
              <Tooltip cursor={{ fill: "rgba(148,163,184,0.2)" }} />
              <Bar dataKey="demandScore" fill="#1198ff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
