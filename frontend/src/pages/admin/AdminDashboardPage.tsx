import { useQuery } from "@tanstack/react-query";
import { ChevronRight, Eye, HardDrive, Store, UtensilsCrossed } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api/admin";
import {
  Badge,
  Card,
  ErrorNote,
  PageHeader,
  SectionTitle,
  Skeleton,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import { formatBytes, formatDate, pickLocalized } from "../../lib/format";
import type { StoreStatus } from "../../types/api";

/* Pending reads as clay rather than the old blue: this palette has no blue in
   it, and the accent is exactly what "needs your attention" should look like. */
const STATUS_TONE: Record<StoreStatus, "neutral" | "accent" | "success" | "warning" | "danger"> =
  {
    draft: "neutral",
    pending: "accent",
    approved: "success",
    rejected: "warning",
    suspended: "danger",
  };

/** Bar fill per status. Never the only signal — every tile is labelled too. */
const STATUS_FILL: Record<StoreStatus, string> = {
  draft: "bg-sand-400 dark:bg-sand-600",
  pending: "bg-clay-500",
  approved: "bg-emerald-600 dark:bg-emerald-500",
  rejected: "bg-amber-500",
  suspended: "bg-red-600 dark:bg-red-500",
};

const STATUS_ORDER: StoreStatus[] = [
  "pending",
  "approved",
  "draft",
  "rejected",
  "suspended",
];

/** Headline figure with its label, matching the editorial tiles on the site. */
function Tile({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: ReactNode;
}) {
  return (
    <div className="panel p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sand-600 dark:text-sand-400">
          {label}
        </p>
        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-clay-50 text-clay-600 dark:bg-clay-500/10 dark:text-clay-300">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-display text-display-sm font-semibold tabular-nums text-sand-900 dark:text-sand-50">
        {value}
      </p>
      <p className="mt-1 h-4 text-xs text-sand-600 dark:text-sand-500">{hint ?? ""}</p>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="panel space-y-3 p-5">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
      <div className="panel space-y-4 p-5 sm:p-6">
        <Skeleton className="h-5 w-40" />
        <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-5">
          {Array.from({ length: 5 }, (_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
      <div className="panel space-y-3 p-5 sm:p-6">
        <Skeleton className="h-5 w-40" />
        {Array.from({ length: 5 }, (_, i) => (
          <Skeleton key={i} className="h-10" />
        ))}
      </div>
    </div>
  );
}

export default function AdminDashboardPage() {
  const { t, lang } = useLanguage();
  const stats = useQuery({ queryKey: ["admin-stats"], queryFn: () => adminApi.stats() });

  if (stats.isLoading) return <DashboardSkeleton />;
  if (stats.isError || !stats.data) return <ErrorNote message={t("error_generic")} />;

  const { statusCounts, totals, recent } = stats.data;
  const totalStores = Object.values(statusCounts).reduce((a, b) => a + b, 0);
  const pending = statusCounts.pending ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin_dashboard")}
        description={t("insights_subtitle")}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Tile
          label={t("admin_total_stores")}
          value={totalStores}
          hint={pending > 0 ? `${pending} ${t("admin_pending_count")}` : undefined}
          icon={<Store className="h-4 w-4" />}
        />
        <Tile
          label={t("insights_menu_items")}
          value={totals.menuItems}
          icon={<UtensilsCrossed className="h-4 w-4" />}
        />
        <Tile
          label={t("insights_total_views")}
          value={totals.totalViews}
          icon={<Eye className="h-4 w-4" />}
        />
        <Tile
          label={t("admin_storage_used")}
          value={formatBytes(totals.storageBytes)}
          hint={`${totals.images} ${t("detail_gallery").toLowerCase()}`}
          icon={<HardDrive className="h-4 w-4" />}
        />
      </div>

      {/* Status breakdown. Each tile is a filter link, so the count is also the
          way into the list it describes. */}
      <Card>
        <SectionTitle
          title={t("admin_stores")}
          description={
            pending > 0 ? `${pending} ${t("admin_pending_count")}` : undefined
          }
          action={
            pending > 0 ? (
              <Link
                to="/admin/queue"
                className="inline-flex items-center gap-1 text-sm font-semibold text-clay-700 transition-colors hover:text-clay-800 dark:text-clay-300 dark:hover:text-clay-200"
              >
                {t("admin_queue")}
                <ChevronRight className="h-4 w-4" />
              </Link>
            ) : undefined
          }
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
          {STATUS_ORDER.map((status) => {
            const count = statusCounts[status] ?? 0;
            const share = totalStores > 0 ? (count / totalStores) * 100 : 0;
            const needsAttention = status === "pending" && count > 0;
            return (
              <Link
                key={status}
                to={`/admin/stores?status=${status}`}
                className={`group rounded-card border p-4 transition-all duration-200 ease-out-soft hover:-translate-y-0.5 hover:shadow-soft ${
                  needsAttention
                    ? "border-clay-300 bg-clay-50/60 dark:border-clay-500/40 dark:bg-clay-500/10"
                    : "border-[var(--border-subtle)] bg-[var(--surface-card)] hover:border-sand-400"
                }`}
              >
                <Badge tone={STATUS_TONE[status]}>
                  {t(`status_${status}` as TranslationKey)}
                </Badge>
                <p className="mt-3 font-display text-2xl font-semibold tabular-nums text-sand-900 dark:text-sand-50">
                  {count}
                </p>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-sand-200 dark:bg-sand-800">
                  <div
                    className={`h-full rounded-full transition-[width] duration-700 ease-out-soft ${STATUS_FILL[status]}`}
                    style={{ width: `${share}%` }}
                  />
                </div>
                <p className="mt-1.5 text-[11px] tabular-nums text-sand-600 dark:text-sand-500">
                  {Math.round(share)}%
                </p>
              </Link>
            );
          })}
        </div>
      </Card>

      <Card>
        <SectionTitle title={t("insights_newest")} />
        {recent.length === 0 ? (
          <p className="text-sm text-sand-600 dark:text-sand-500">
            {t("insights_empty")}
          </p>
        ) : (
          <ul className="-mx-2 divide-y divide-[var(--border-subtle)]">
            {recent.map((store) => {
              const name = pickLocalized(store.name, lang);
              return (
              <li key={store.id}>
                <Link
                  to={`/admin/stores/${store.id}`}
                  className="group flex items-center gap-3 rounded-lg px-2 py-3 transition-colors duration-200 hover:bg-sand-100 dark:hover:bg-sand-800/60"
                >
                  {/* A monogram instead of an icon: it distinguishes the rows
                      from one another at a glance. */}
                  <span
                    aria-hidden
                    className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sand-200 font-display text-sm font-semibold text-sand-700 dark:bg-sand-800 dark:text-sand-300"
                  >
                    {name.charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-medium text-sand-800 transition-colors group-hover:text-clay-700 dark:text-sand-200 dark:group-hover:text-clay-300">
                    {name}
                  </span>
                  <Badge
                    tone={STATUS_TONE[store.status]}
                    className="shrink-0 whitespace-nowrap"
                  >
                    {t(`status_${store.status}` as TranslationKey)}
                  </Badge>
                  <span className="hidden shrink-0 text-xs tabular-nums text-sand-600 sm:block dark:text-sand-500">
                    {formatDate(store.createdAt, lang)}
                  </span>
                  <ChevronRight className="h-4 w-4 shrink-0 text-sand-400 transition-transform duration-200 ease-out-soft group-hover:translate-x-0.5 dark:text-sand-600" />
                </Link>
              </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
