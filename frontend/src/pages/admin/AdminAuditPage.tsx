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
              <thead className="bg-sand-50 text-left text-xs uppercase tracking-wide text-sand-600 dark:bg-sand-800/60">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">{t("admin_when")}</th>
                  <th className="px-4 py-2.5 font-semibold">{t("admin_actor")}</th>
                  <th className="px-4 py-2.5 font-semibold">{t("admin_action")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-sand-100 dark:divide-sand-800">
                {data.entries.map((entry) => (
                  <tr key={entry.id}>
                    <td className="whitespace-nowrap px-4 py-2.5 text-sand-600 dark:text-sand-500">
                      {formatDateTime(entry.createdAt, lang)}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className="font-medium text-sand-700 dark:text-sand-200">
                        {entry.actorLabel ?? "—"}
                      </span>
                      <span className="ml-1.5 text-xs text-sand-500">
                        {entry.actorType}
                      </span>
                      {entry.impersonatedByAdminId && (
                        <Badge tone="warning" className="ml-1.5">
                          <Eye className="w-3 h-3" />
                        </Badge>
                      )}
                    </td>
                    <td className="px-4 py-2.5">
                      <code className="rounded bg-sand-100 px-1.5 py-0.5 text-xs text-sand-700 dark:bg-sand-800 dark:text-sand-300">
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
