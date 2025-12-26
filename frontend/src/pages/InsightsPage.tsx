import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import LoadingState from "../components/LoadingState";
import ErrorState from "../components/ErrorState";
import MetricCard from "../components/MetricCard";
import { fetchCuisineDemand, fetchInsightMetrics, fetchRestaurants } from "../api/restaurants";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  Legend,
  ComposedChart,
  Line,
  CartesianGrid
} from "recharts";

export default function InsightsPage() {
  const metricsQuery = useQuery({
    queryKey: ["insights-metrics"],
    queryFn: fetchInsightMetrics
  });

  const cuisineDemandQuery = useQuery({
    queryKey: ["cuisine-demand"],
    queryFn: fetchCuisineDemand
  });

  const restaurantsQuery = useQuery({
    queryKey: ["restaurants"],
    queryFn: fetchRestaurants
  });

  const metrics = metricsQuery.data ?? [];
  const cuisineDemand = cuisineDemandQuery.data ?? [];
  const restaurants = restaurantsQuery.data ?? [];

  const priceDistribution = useMemo(() => {
    const tiers = ["$", "$$", "$$$"] as const;
    return tiers.map((tier) => ({
      tier,
      count: restaurants.filter((restaurant) => restaurant.priceTier === tier).length
    }));
  }, [restaurants]);

  const lateNightData = useMemo(() => {
    const lateRegex = /01:00|02:00|00:30|24:00/i;
    const counts: Record<string, number> = {};
    restaurants.forEach((restaurant) => {
      const openLate = restaurant.schedule.some((slot) => lateRegex.test(slot.hours));
      if (openLate) {
        counts[restaurant.location.neighborhood] = (counts[restaurant.location.neighborhood] ?? 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([neighborhood, count]) => ({ neighborhood, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [restaurantsQuery.data]);

  const sustainabilityData = useMemo(() => {
    return restaurants
      .slice()
      .sort((a, b) => b.sustainabilityScore - a.sustainabilityScore)
      .slice(0, 8)
      .map((restaurant) => ({
        name: restaurant.name,
        sustainability: restaurant.sustainabilityScore,
        rating: restaurant.rating
      }));
  }, [restaurants]);

  if (metricsQuery.isLoading || cuisineDemandQuery.isLoading || restaurantsQuery.isLoading) {
    return <LoadingState label="Crunching food intelligence..." />;
  }

  if (metricsQuery.isError || cuisineDemandQuery.isError || restaurantsQuery.isError) {
    return (
      <ErrorState
        message="Unable to fetch analytics"
        action={() => {
          metricsQuery.refetch();
          cuisineDemandQuery.refetch();
          restaurantsQuery.refetch();
        }}
      />
    );
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
        {metrics.map((metric) => (
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
            <BarChart data={cuisineDemand}>
              <XAxis dataKey="cuisine" stroke="#94a3b8" />
              <Tooltip cursor={{ fill: "rgba(148,163,184,0.2)" }} />
              <Bar dataKey="demandScore" fill="#1198ff" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="grid lg:grid-cols-3 gap-6">
        <div className="glass-panel p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Price tier mix</h2>
            <p className="text-sm text-slate-500">How the catalog balances casual, mid-market, and premium venues.</p>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={priceDistribution} dataKey="count" nameKey="tier" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {priceDistribution.map((entry, index) => {
                    const colors = ["#35b9ff", "#6ee7b7", "#c084fc"];
                    return <Cell key={entry.tier} fill={colors[index % colors.length]} />;
                  })}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Late-night coverage</h2>
            <p className="text-sm text-slate-500">Neighborhoods with venues operating past midnight.</p>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <BarChart data={lateNightData} layout="vertical" margin={{ left: 60 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="neighborhood" type="category" tick={{ fill: "#94a3b8" }} />
                <Tooltip />
                <Bar dataKey="count" fill="#6ee7b7" radius={[6, 6, 6, 6]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass-panel p-6 space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Sustainability vs. ratings</h2>
            <p className="text-sm text-slate-500">Top venues with high eco scores still maintain strong guest ratings.</p>
          </div>
          <div className="w-full h-64">
            <ResponsiveContainer>
              <ComposedChart data={sustainabilityData} margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b22" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={70} />
                <YAxis yAxisId="left" domain={[60, 100]} tick={{ fill: "#94a3b8" }} />
                <YAxis yAxisId="right" orientation="right" domain={[3.8, 5]} tick={{ fill: "#94a3b8" }} />
                <Tooltip />
                <Legend />
                <Bar yAxisId="left" dataKey="sustainability" fill="#22d3ee" radius={[6, 6, 0, 0]} name="Sustainability" />
                <Line yAxisId="right" type="monotone" dataKey="rating" stroke="#818cf8" strokeWidth={2} name="Rating" />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </div>
  );
}
