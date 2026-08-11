import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, MapPin, Phone, Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin";
import {
  Badge,
  Button,
  CheckboxPill,
  EmptyState,
  ErrorNote,
  PageHeader,
  Skeleton,
  inputClass,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import { formatDate, formatPhone, pickLocalized } from "../../lib/format";
import type { StoreStatus } from "../../types/api";

const STATUSES: StoreStatus[] = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "suspended",
];

const STATUS_TONE: Record<StoreStatus, "neutral" | "accent" | "success" | "warning" | "danger"> =
  {
    draft: "neutral",
    pending: "accent",
    approved: "success",
    rejected: "warning",
    suspended: "danger",
  };

/** The stripe down the left of each row. The badge carries the same meaning in
    words, so colour is never doing the work alone. */
const STATUS_STRIPE: Record<StoreStatus, string> = {
  draft: "bg-sand-400 dark:bg-sand-600",
  pending: "bg-clay-500",
  approved: "bg-emerald-600 dark:bg-emerald-500",
  rejected: "bg-amber-500",
  suspended: "bg-red-600 dark:bg-red-500",
};

/** Shared by the "all stores" view and the review queue. */
export default function AdminStoresPage({
  queueOnly = false,
}: {
  queueOnly?: boolean;
}) {
  const { t, lang } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const status = queueOnly
    ? "pending"
    : ((searchParams.get("status") as StoreStatus | null) ?? undefined);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-stores", status, search, page],
    queryFn: () =>
      adminApi.stores({ status, search: search || undefined, page, perPage: 20 }),
  });

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;
  const total = data?.total ?? 0;

  const selectStatus = (next: StoreStatus | undefined) => {
    setSearchParams(next ? { status: next } : {});
    setPage(1);
  };

  return (
    <div className="space-y-5">
      <PageHeader title={queueOnly ? t("admin_queue") : t("admin_stores")} />

      <div className="space-y-4">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-sand-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("admin_search_stores")}
            aria-label={t("admin_search_stores")}
            className={`${inputClass} pl-10`}
          />
        </div>

        {/* Status as chips rather than a dropdown: five options are worth
            showing, and the current filter stays visible. */}
        {!queueOnly && (
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
            <CheckboxPill checked={!status} onChange={() => selectStatus(undefined)}>
              {t("filter_all")}
            </CheckboxPill>
            {STATUSES.map((value) => (
              <CheckboxPill
                key={value}
                checked={status === value}
                onChange={(on) => selectStatus(on ? value : undefined)}
              >
                <span className="whitespace-nowrap">
                  {t(`status_${value}` as TranslationKey)}
                </span>
              </CheckboxPill>
            ))}
          </div>
        )}
      </div>

      {!isLoading && !isError && total > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
          <p className="text-sm text-sand-600 dark:text-sand-400">
            <span className="font-semibold tabular-nums text-sand-900 dark:text-sand-100">
              {total}
            </span>{" "}
            {queueOnly ? t("admin_pending_count") : t("home_results")}
          </p>
          {pageCount > 1 && (
            <p className="text-xs tabular-nums text-sand-600 dark:text-sand-500">
              {page} / {pageCount}
            </p>
          )}
        </div>
      )}

      {isError ? (
        <ErrorNote message={t("error_generic")} />
      ) : isLoading ? (
        <div className="panel divide-y divide-[var(--border-subtle)] overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="flex items-center gap-3 px-4 py-4 sm:px-5">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-2/3" />
              </div>
              <Skeleton className="h-5 w-20 shrink-0 rounded-full" />
            </div>
          ))}
        </div>
      ) : !data || data.stores.length === 0 ? (
        <EmptyState
          icon={<Search className="h-6 w-6" />}
          title={queueOnly ? t("admin_no_pending") : t("home_no_results")}
          description={queueOnly ? undefined : t("home_no_results_hint")}
        />
      ) : (
        <div className="panel divide-y divide-[var(--border-subtle)] overflow-hidden">
          {data.stores.map((store) => {
            const name = pickLocalized(store.name, lang, store.primaryLang);
            return (
              <Link
                key={store.id}
                to={`/admin/stores/${store.id}`}
                className="group relative flex items-center gap-3 px-4 py-4 transition-colors duration-200 hover:bg-sand-100 sm:gap-4 sm:px-5 dark:hover:bg-sand-800/50"
              >
                <span
                  aria-hidden
                  className={`absolute inset-y-0 left-0 w-1 ${STATUS_STRIPE[store.status]}`}
                />

                <span
                  aria-hidden
                  className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-sand-200 font-display text-base font-semibold text-sand-700 dark:bg-sand-800 dark:text-sand-300"
                >
                  {name.charAt(0).toUpperCase()}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold text-sand-900 transition-colors group-hover:text-clay-700 dark:text-sand-100 dark:group-hover:text-clay-300">
                    {name}
                  </p>
                  <span className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-sand-600 dark:text-sand-500">
                    <span className="inline-flex min-w-0 items-center gap-1">
                      <MapPin className="h-3 w-3 shrink-0" />
                      <span className="truncate">{store.neighborhood ?? "—"}</span>
                    </span>
                    {store.phone && (
                      <span className="inline-flex items-center gap-1 tabular-nums">
                        <Phone className="h-3 w-3 shrink-0" />
                        {formatPhone(store.phone)}
                      </span>
                    )}
                    <span className="hidden tabular-nums sm:inline">
                      {store.submittedAt
                        ? formatDate(store.submittedAt, lang)
                        : formatDate(store.createdAt, lang)}
                    </span>
                  </span>
                </div>

                {store.views > 0 && (
                  <span className="hidden shrink-0 items-center gap-1 text-xs tabular-nums text-sand-600 lg:inline-flex dark:text-sand-500">
                    <Eye className="h-3.5 w-3.5" />
                    {store.views}
                  </span>
                )}

                <Badge
                  tone={STATUS_TONE[store.status]}
                  className="shrink-0 whitespace-nowrap"
                >
                  {t(`status_${store.status}` as TranslationKey)}
                </Badge>

                <ChevronRight className="h-4 w-4 shrink-0 text-sand-400 transition-transform duration-200 ease-out-soft group-hover:translate-x-0.5 dark:text-sand-600" />
              </Link>
            );
          })}
        </div>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3 pt-1">
          <Button
            variant="secondary"
            size="sm"
            aria-label={t("action_back")}
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            icon={<ChevronLeft className="h-4 w-4" />}
          />
          <span className="text-sm tabular-nums text-sand-600 dark:text-sand-400">
            {page} / {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            aria-label={t("action_continue")}
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
            icon={<ChevronRight className="h-4 w-4" />}
          />
        </div>
      )}
    </div>
  );
}
