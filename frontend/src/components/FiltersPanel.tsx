import { useFilters } from "../store/useFilters";
import type { PriceTier } from "../types/restaurant";
import FilterChip from "./FilterChip";
import { Slider } from "./Slider";

const cuisines = [
  "Modern Georgian",
  "Plant-based",
  "Smokehouse",
  "Pan-Asian",
  "Fusion",
  "Seafood",
  "Middle Eastern",
  "Cafe",
  "Experimental",
  "Farm-to-Table"
];
const dietary = ["Vegan", "Vegetarian", "Gluten-Free", "Halal", "Keto"];
const price: PriceTier[] = ["$", "$$", "$$$"];

export default function FiltersPanel() {
  const filters = useFilters();

  return (
    <section className="glass-panel p-6 space-y-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-full md:w-1/2">
          <label className="text-xs uppercase font-semibold text-slate-400 tracking-wide">Search</label>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => filters.setSearch(event.target.value)}
            placeholder="Search by name, cuisine, vibe..."
            className="w-full mt-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-200"
          />
        </div>
        <div className="flex gap-3 text-xs text-slate-500">
          <div>
            <p className="font-semibold text-slate-600">Active filters</p>
            <p>{filters.cuisines.length + filters.dietary.length + filters.price.length || "None"}</p>
          </div>
          <button className="underline" onClick={() => filters.reset()}>
            Reset
          </button>
        </div>
      </div>

      <div>
        <p className="text-xs uppercase font-semibold text-slate-400 mb-3">Cuisine style</p>
        <div className="flex flex-wrap gap-2">
          {cuisines.map((cuisine) => (
            <FilterChip
              key={cuisine}
              label={cuisine}
              active={filters.cuisines.includes(cuisine)}
              onToggle={() => filters.toggleItem("cuisines", cuisine)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase font-semibold text-slate-400 mb-3">Dietary</p>
        <div className="flex flex-wrap gap-2">
          {dietary.map((item) => (
            <FilterChip
              key={item}
              label={item}
              active={filters.dietary.includes(item)}
              onToggle={() => filters.toggleItem("dietary", item)}
            />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs uppercase font-semibold text-slate-400 mb-3">Price</p>
          <div className="flex flex-wrap gap-2">
            {price.map((tier) => (
              <FilterChip
                key={tier}
                label={tier}
                active={filters.price.includes(tier)}
                onToggle={() => filters.toggleItem("price", tier)}
              />
            ))}
          </div>
        </div>
        <div>
          <div className="flex justify-between text-xs uppercase font-semibold text-slate-400 mb-3">
            <span>Minimum rating</span>
            <span className="text-slate-600">{filters.rating.toFixed(1)}+</span>
          </div>
          <Slider value={filters.rating} onChange={filters.setRating} min={0} max={5} step={0.5} />
        </div>
      </div>
    </section>
  );
}
