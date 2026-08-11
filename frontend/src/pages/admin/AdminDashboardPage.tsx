import { useQuery } from "@tanstack/react-query";
import { Eye, HardDrive, Store, UtensilsCrossed } from "lucide-react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { StatTile } from "../../components/BarRows";
import { Badge, Card, SectionTitle, Spinner } from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import { formatBytes, formatDate, pickLocalized } from "../../lib/format";
import type { StoreStatus } from "../../types/api";

const STATUS_TONE: Record<StoreStatus, "neutral" | "info" | "success" | "warning" | "danger"> =
  {
    draft: "neutral",
    pending: "info",
    approved: "success",
    rejected: "warning",
    suspended: "danger",
  };

const STATUS_ORDER: StoreStatus[] = [
  "pending",
  "approved",
  "draft",
  "rejected",
  "suspended",
];

export default function AdminDashboardPage() {
  const { t, lang } = useLanguage();
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminApi.stats() });

  if (stats.isLoading || !stats.data) return <Spinner />;

  const { statusCounts, totals, recent } = stats.data;
  const totalStores = Object.values(statusCounts).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          label={t("admin_total_stores")}
          value={totalStores}
          icon={<Store className="w-4 h-4" />}
        />
        <StatTile
          label={t("insights_menu_items")}
          value={totals.menuItems}
          icon={<UtensilsCrossed className="w-4 h-4" />}
        />
        <StatTile
          label={t("insights_total_views")}
          value={totals.totalViews}
          icon={<Eye className="w-4 h-4" />}
        />
        <StatTile
          label={t("admin_storage_used")}
          value={formatBytes(totals.storageBytes)}
          hint={`${totals.images} ${t("detail_gallery").toLowerCase()}`}
          icon={<HardDrive className="w-4 h-4" />}
        />
      </div>

      <Card>
        <SectionTitle title={t("admin_stores")} />
        <div className="flex flex-wrap gap-2">
          {STATUS_ORDER.map((status) => (
            <Link key={status} to={`/admin/stores?status=${status}`}>
              <span className="inline-flex items-center gap-2 rounded-xl border border-sand-200 px-3.5 py-2 transition hover:border-brand-300 dark:border-sand-700">
                <Badge tone={STATUS_TONE[status]}>
                  {t(`status_${status}` as TranslationKey)}
                </Badge>
                <span className="text-lg font-bold tabular-nums text-sand-900 dark:text-white">
                  {statusCounts[status] ?? 0}
                </span>
              </span>
            </Link>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title={t("insights_newest")} />
        {recent.length === 0 ? (
          <p className="text-sm text-sand-600 dark:text-sand-500">
            {t("insights_empty")}
          </p>
        ) : (
          <ul className="divide-y divide-sand-100 dark:divide-sand-800">
            {recent.map((store) => (
              <li
                key={store.id}
                className="flex items-center justify-between gap-3 py-2.5"
              >
                <Link
                  to={`/admin/stores/${store.id}`}
                  className="truncate font-medium text-sand-700 hover:text-brand-600 dark:text-sand-200 dark:hover:text-brand-300"
                >
                  {pickLocalized(store.name, lang)}
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <Badge tone={STATUS_TONE[store.status]}>
                    {t(`status_${store.status}` as TranslationKey)}
                  </Badge>
                  <span className="text-sm text-sand-600 dark:text-sand-500">
                    {formatDate(store.createdAt, lang)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
