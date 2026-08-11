import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, ChevronRight, Eye, ScrollText } from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api/admin";
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  PageHeader,
  Skeleton,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatDateTime } from "../../lib/format";

const HEAD_CELL =
  "px-4 py-3 text-left text-[11px] font-bold uppercase tracking-[0.12em] text-sand-600 dark:text-sand-400";

export default function AdminAuditPage() {
  const { t, lang } = useLanguage();
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: () => adminApi.audit({ page, perPage: 40 }),
  });

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <div className="space-y-6">
      <PageHeader title={t("admin_audit")} />

      <div className="panel overflow-hidden">
        {isLoading ? (
          <div className="space-y-4 p-5">
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-4 w-32 shrink-0" />
                <Skeleton className="h-4 w-28 shrink-0" />
                <Skeleton className="h-4 flex-1" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="p-5">
            <ErrorNote message={t("error_generic")} />
          </div>
        ) : !data || data.entries.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<ScrollText className="h-6 w-6" />}
              title={t("empty_none")}
            />
          </div>
        ) : (
          /* The table keeps its column rhythm below 640px by scrolling inside
             this box rather than reflowing into unreadable stacks. */
          <div className="overflow-x-auto">
            <table className="w-full min-w-[38rem] border-collapse text-sm">
              <thead>
                <tr className="surface-sunken border-b border-[var(--border-subtle)]">
                  <th scope="col" className={`${HEAD_CELL} w-px whitespace-nowrap`}>
                    {t("admin_when")}
                  </th>
                  <th scope="col" className={HEAD_CELL}>
                    {t("admin_actor")}
                  </th>
                  <th scope="col" className={HEAD_CELL}>
                    {t("admin_action")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {data.entries.map((entry) => {
                  const impersonated = Boolean(entry.impersonatedByAdminId);
                  return (
                    <tr
                      key={entry.id}
                      className={`transition-colors duration-200 ${
                        impersonated
                          ? "bg-amber-50/60 hover:bg-amber-50 dark:bg-amber-500/5 dark:hover:bg-amber-500/10"
                          : "hover:bg-sand-100/60 dark:hover:bg-sand-900/40"
                      }`}
                    >
                      {/* An action taken while impersonating carries a standing
                          rule down the left edge as well as its own badge. */}
                      <td
                        className={`whitespace-nowrap border-l-2 px-4 py-3 align-top ${
                          impersonated
                            ? "border-amber-500"
                            : "border-transparent"
                        }`}
                      >
                        <span className="block tabular-nums text-sand-800 dark:text-sand-200">
                          {formatDateTime(entry.createdAt, lang)}
                        </span>
                        {entry.ip && (
                          <span className="mt-0.5 block font-mono text-[11px] tabular-nums text-sand-500">
                            {entry.ip}
                          </span>
                        )}
                      </td>

                      <td className="px-4 py-3 align-top">
                        <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                          <span className="font-medium text-sand-900 dark:text-sand-100">
                            {entry.actorLabel ?? "—"}
                          </span>
                          {impersonated && (
                            <Badge tone="warning">
                              <Eye aria-hidden className="h-3 w-3" />
                              <span className="hidden sm:inline">
                                {t("admin_view_as_store")}
                              </span>
                              <span className="sr-only">{t("admin_impersonating")}</span>
                            </Badge>
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs uppercase tracking-wide text-sand-600 dark:text-sand-500">
                          {entry.actorType}
                        </span>
                      </td>

                      <td className="px-4 py-3 align-top">
                        <code className="inline-block max-w-full truncate rounded-lg bg-sand-100 px-2 py-1 font-mono text-xs text-sand-800 dark:bg-sand-800 dark:text-sand-200">
                          {entry.action}
                        </code>
                        {entry.targetType && (
                          <span className="mt-1 block truncate font-mono text-[11px] text-sand-500">
                            {entry.targetType}
                            {entry.targetId ? ` · ${entry.targetId}` : ""}
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {pageCount > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="sm"
            disabled={page === 1}
            aria-label={t("action_back")}
            icon={<ChevronLeft className="h-4 w-4" />}
            onClick={() => setPage((p) => p - 1)}
          />
          <span className="text-sm tabular-nums text-sand-600 dark:text-sand-400">
            {page} / {pageCount}
          </span>
          <Button
            variant="secondary"
            size="sm"
            disabled={page >= pageCount}
            aria-label={t("action_continue")}
            icon={<ChevronRight className="h-4 w-4" />}
            onClick={() => setPage((p) => p + 1)}
          />
        </div>
      )}
    </div>
  );
}
