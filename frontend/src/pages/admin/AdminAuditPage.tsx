import { useQuery } from "@tanstack/react-query";
import { Eye } from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api/admin";
import { Badge, Button, Card, EmptyState, SectionTitle, Spinner } from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatDateTime } from "../../lib/format";

export default function AdminAuditPage() {
  const { t, lang } = useLanguage();
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit", page],
    queryFn: () => adminApi.audit({ page, perPage: 40 }),
  });

  if (isLoading) return <Spinner />;

  const pageCount = data ? Math.max(1, Math.ceil(data.total / data.perPage)) : 1;

  return (
    <div className="space-y-4">
      <Card className="!p-0 overflow-hidden">
        <div className="p-5 pb-3">
          <SectionTitle title={t("admin_audit")} />
        </div>

        {!data || data.entries.length === 0 ? (
          <div className="p-5">
            <EmptyState title={t("empty_none")} />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800/60">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">{t("admin_when")}</th>
                  <th className="px-4 py-2.5 font-semibold">{t("admin_actor")}</th>
                  <th className="px-4 py-2.5 font-semibold">{t("admin_action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {data.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-slate-500 dark:text-slate-400">
                      {formatDateTime(entry.createdAt, lang)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {entry.actorLabel ?? "—"}
                      </span>
                      <span className="ml-1.5 text-xs text-slate-400">
                        {entry.actorType}
                      </span>
                      {entry.impersonatedByAdminId && (
                        <Badge tone="warning" className="ml-1.5">
                          <Eye className="w-3 h-3" />
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                        {entry.action}
                      </code>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

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
          <span className="text-sm text-slate-500 dark:text-slate-400">
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
