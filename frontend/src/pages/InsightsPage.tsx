import { useQuery } from "@tanstack/react-query";
import { Eye, Truck, Utensils, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { publicApi } from "../api/public";
import BarRows, { StatTile } from "../components/BarRows";
import { Card, EmptyState, SectionTitle, Spinner } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import { formatDate, formatPrice } from "../lib/format";

export default function InsightsPage() {
  const { t, lang } = useLanguage();

  const { data, isLoading } = useQuery({
    queryKey: ["insights", lang],
    queryFn: () => publicApi.insights(lang),
  });

  if (isLoading) return <Spinner />;
  if (!data) return <EmptyState title={t("error_generic")} />;

  const hasData = data.totals.stores > 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-sand-900 dark:text-white">
          {t("insights_title")}
        </h1>
        <p className="text-sm text-sand-600 dark:text-sand-500">
          {t("insights_subtitle")}
        </p>
      </header>

      {!hasData ? (
        <EmptyState
          title={t("insights_empty")}
          description={t("home_empty_platform_hint")}
        />
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile
              label={t("insights_total_stores")}
              value={data.totals.stores}
              icon={<Utensils className="w-4 h-4" />}
            />
            <StatTile
              label={t("insights_menu_items")}
              value={data.totals.menuItems}
              icon={<UtensilsCrossed className="w-4 h-4" />}
              hint={
                data.menuPrices.avgMinor > 0
                  ? `${t("insights_avg_price")}: ${formatPrice(data.menuPrices.avgMinor, lang)} TMT`
                  : undefined
              }
            />
            <StatTile
              label={t("insights_total_views")}
              value={data.totals.totalViews}
              icon={<Eye className="w-4 h-4" />}
            />
            <StatTile
              label={t("insights_with_delivery")}
              value={data.totals.withDelivery}
              icon={<Truck className="w-4 h-4" />}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card>
              <SectionTitle title={t("insights_by_category")} />
              <BarRows
                emptyLabel={t("insights_empty")}
                data={data.byCategory.map((row) => ({
                  key: row.slug,
                  label: row.name,
                  value: row.count,
                  prefix: row.icon,
                }))}
              />
            </Card>

            <Card>
              <SectionTitle title={t("insights_by_neighborhood")} />
              <BarRows
                emptyLabel={t("insights_empty")}
                data={data.byNeighborhood.map((row) => ({
                  key: row.neighborhood,
                  label: row.neighborhood,
                  value: row.count,
                }))}
              />
            </Card>

            <Card>
              <SectionTitle title={t("insights_by_price")} />
              <BarRows
                emptyLabel={t("insights_empty")}
                data={data.byPriceTier.map((row) => ({
                  key: row.priceTier,
                  label: row.priceTier,
                  value: row.count,
                }))}
              />
            </Card>

            <Card>
              <SectionTitle title={t("insights_most_viewed")} />
              <BarRows
                emptyLabel={t("insights_empty")}
                data={data.mostViewed.map((row) => ({
                  key: row.slug,
                  label: row.name,
                  value: row.views,
                }))}
              />
            </Card>
          </div>

          {data.newest.length > 0 && (
            <Card>
              <SectionTitle title={t("insights_newest")} />
              <ul className="divide-y divide-sand-100 dark:divide-sand-800">
                {data.newest.map((store) => (
                  <li
                    key={store.slug}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <Link
                      to={`/restaurants/${store.slug}`}
                      className="truncate font-medium text-sand-700 dark:text-sand-200 hover:text-brand-600 dark:hover:text-brand-300"
                    >
                      {store.name}
                    </Link>
                    <span className="shrink-0 text-sand-600 dark:text-sand-500">
                      {formatDate(store.createdAt, lang)}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
