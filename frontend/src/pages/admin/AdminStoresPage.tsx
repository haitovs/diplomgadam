import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { adminApi } from "../../api/admin";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Select,
  Spinner,
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

const STATUS_TONE: Record<StoreStatus, "neutral" | "info" | "success" | "warning" | "danger"> =
  {
    draft: "neutral",
    pending: "info",
    approved: "success",
    rejected: "warning",
    suspended: "danger",
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

  const { data, isLoading } = useQuery({
    queryKey: ["admin-stores", status, search, page],
    queryFn: () =>
      adminApi.stores({ status, search: search || undefined, page, perPage: 20 }),
  });

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-sand-500" />
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t("admin_search_stores")}
            className={`${inputClass} pl-10`}
          />
        </div>

        {!queueOnly && (
          <Select
            value={status ?? ""}
            onChange={(e) => {
              const next = e.target.value;
              setSearchParams(next ? { status: next } : {});
              setPage(1);
            }}
            className="sm:w-48"
          >
            <option value="">{t("filter_all")}</option>
            {STATUSES.map((value) => (
              <option key={value} value={value}>
                {t(`status_${value}` as TranslationKey)}
              </option>
            ))}
          </Select>
        )}
      </div>

      {isLoading ? (
        <Spinner />
      ) : !data || data.stores.length === 0 ? (
        <EmptyState
          title={queueOnly ? t("admin_no_pending") : t("home_no_results")}
        />
      ) : (
        <Card className="!p-0 overflow-hidden">
          <ul className="divide-y divide-sand-100 dark:divide-sand-800">
            {data.stores.map((store) => (
              <li key={store.id}>
                <Link
                  to={`/admin/stores/${store.id}`}
                  className="flex flex-wrap items-center gap-3 px-4 py-3.5 transition hover:bg-sand-50 dark:hover:bg-sand-800/60"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-sand-800 dark:text-sand-100">
                      {pickLocalized(store.name, lang, store.primaryLang)}
                    </p>
                    <p className="truncate text-xs text-sand-600 dark:text-sand-500">
                      {store.neighborhood ?? "—"}
                      {store.phone && ` · ${formatPhone(store.phone)}`}
                    </p>
                  </div>

                  <span className="text-xs text-sand-600 dark:text-sand-500">
                    {store.submittedAt
                      ? formatDate(store.submittedAt, lang)
                      : formatDate(store.createdAt, lang)}
                  </span>

                  <Badge tone={STATUS_TONE[store.status]}>
                    {t(`status_${store.status}` as TranslationKey)}
                  </Badge>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ‹
          </Button>
          <span className="text-sm text-sand-600 dark:text-sand-500">
            {page} / {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pageCount}
            onClick={() => setPage((p) => p + 1)}
          >
            ›
          </Button>
        </div>
      )}
    </div>
  );
}
