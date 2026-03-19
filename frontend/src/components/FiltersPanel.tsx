import { useFilters } from "../store/useFilters";
import type { PriceTier } from "../types/restaurant";
import FilterChip from "./FilterChip";
import { Slider } from "./Slider";
import { SlidersHorizontal, X } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";

const cuisineKeys: { key: TranslationKey; value: string }[] = [
  { key: "cuisine_turkmen_traditional", value: "Türkmen milli" },
  { key: "cuisine_plov", value: "Palaw we tüwi" },
  { key: "cuisine_turkish", value: "Türk" },
  { key: "cuisine_international", value: "Halkara" },
  { key: "cuisine_steakhouse", value: "Steýkhaus" },
  { key: "cuisine_seafood", value: "Deňiz önümleri" },
  { key: "cuisine_italian", value: "Italýan" },
  { key: "cuisine_european", value: "Ýewropa" },
  { key: "cuisine_coffee", value: "Kofe we kafe" },
  { key: "cuisine_bakery", value: "Çörek öýi" },
  { key: "cuisine_asian", value: "Aziýa garyndy" },
  { key: "cuisine_grill", value: "Gril" },
  { key: "cuisine_fine_dining", value: "Kaşaň nahar" },
  { key: "cuisine_royal", value: "Şa tagamlary" },
  { key: "cuisine_turkmen_modern", value: "Häzirki zaman türkmen" },
];

const dietaryKeys: { key: TranslationKey; value: string }[] = [
  { key: "dietary_halal", value: "Halal" },
  { key: "dietary_vegetarian", value: "Wegetarian saýlawlar" },
  { key: "dietary_vegan", value: "Wegan saýlawlar" },
  { key: "dietary_pescatarian", value: "Peşketarian" },
];

const price: PriceTier[] = ["$", "$$", "$$$"];

export default function FiltersPanel() {
  const filters = useFilters();
  const { t } = useLanguage();
  const activeCount = filters.cuisines.length + filters.dietary.length + filters.price.length;

  return (
    <section className="glass-panel p-6 space-y-6 mb-8">
      <div className="flex flex-col md:flex-row md:items-center gap-4">
        <div className="w-full md:w-1/2">
          <label className="text-xs uppercase font-semibold text-slate-400 dark:text-slate-500 tracking-wide">{t("filter_search")}</label>
          <input
            type="search"
            value={filters.search}
            onChange={(event) => filters.setSearch(event.target.value)}
            placeholder={t("filter_search_placeholder")}
            className="w-full mt-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/60 px-4 py-2.5 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-brand-200 dark:focus:ring-brand-500/20 focus:border-brand-400 dark:focus:border-brand-500 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors"
          />
        </div>
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-slate-400 dark:text-slate-500" />
            <div>
              <p className="font-semibold text-slate-600 dark:text-slate-300">{t("filter_active")}</p>
              <p className="text-slate-500 dark:text-slate-400">{activeCount || t("filter_none")}</p>
            </div>
          </div>
          {activeCount > 0 && (
            <button
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-500/10 text-rose-500 dark:text-rose-400 text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors"
              onClick={() => filters.reset()}
            >
              <X className="w-3 h-3" />
              {t("filter_clear")}
            </button>
          )}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase font-semibold text-slate-400 dark:text-slate-500 mb-3">{t("filter_cuisine")}</p>
        <div className="flex flex-wrap gap-2">
          {cuisineKeys.map((cuisine) => (
            <FilterChip
              key={cuisine.value}
              label={t(cuisine.key)}
              active={filters.cuisines.includes(cuisine.value)}
              onToggle={() => filters.toggleItem("cuisines", cuisine.value)}
            />
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs uppercase font-semibold text-slate-400 dark:text-slate-500 mb-3">{t("filter_dietary")}</p>
        <div className="flex flex-wrap gap-2">
          {dietaryKeys.map((item) => (
            <FilterChip
              key={item.value}
              label={t(item.key)}
              active={filters.dietary.includes(item.value)}
              onToggle={() => filters.toggleItem("dietary", item.value)}
            />
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <p className="text-xs uppercase font-semibold text-slate-400 dark:text-slate-500 mb-3">{t("filter_price")}</p>
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
          <div className="flex justify-between text-xs uppercase font-semibold text-slate-400 dark:text-slate-500 mb-3">
            <span>{t("filter_min_rating")}</span>
            <span className="text-slate-600 dark:text-slate-300">{filters.rating.toFixed(1)}+</span>
          </div>
          <Slider value={filters.rating} onChange={filters.setRating} min={0} max={5} step={0.5} />
        </div>
      </div>
    </section>
  );
}
