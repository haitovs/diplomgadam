import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Eye, Send, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import { StatTile } from "../../components/BarRows";
import { Button, Card, ErrorNote, SectionTitle } from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import { formatDate } from "../../lib/format";

/** Where each blocker sends the owner to fix it. */
const BLOCKER_TARGET: Record<string, string> = {
  name: "/store/dashboard/listing",
  description: "/store/dashboard/listing",
  address: "/store/dashboard/listing",
  location: "/store/dashboard/listing",
  phone: "/store/dashboard/listing",
  categories: "/store/dashboard/listing",
  cover: "/store/dashboard/photos",
  venue_photos: "/store/dashboard/photos",
  hours: "/store/dashboard/hours",
};

export default function StoreOverviewPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const detail = useQuery({
    queryKey: ["store-detail"],
    queryFn: () => storeApi.detail(),
  });

  const menu = useQuery({
    queryKey: ["store-menu"],
    queryFn: () => storeApi.menu(),
  });

  const submit = useMutation({
    mutationFn: () => storeApi.submit(),
    onSuccess: async () => {
      setError("");
      await queryClient.invalidateQueries({ queryKey: ["store-detail"] });
      await queryClient.invalidateQueries({ queryKey: ["store-session"] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : t("error_generic"));
    },
  });

  if (!detail.data) return null;

  const { store, blockers, media } = detail.data;
  const itemCount = (menu.data ?? []).reduce(
    (total, section) => total + section.items.length,
    0,
  );

  const canSubmit =
    (store.status === "draft" || store.status === "rejected") &&
    blockers.length === 0;

  const statusTone =
    store.status === "approved"
      ? "border-emerald-200 dark:border-emerald-500/30"
      : store.status === "suspended"
        ? "border-rose-200 dark:border-rose-500/30"
        : store.status === "rejected"
          ? "border-amber-200 dark:border-amber-500/30"
          : "";

  return (
    <div className="space-y-5">
      <Card className={statusTone}>
        <SectionTitle
          title={t(`status_${store.status}` as TranslationKey)}
          description={t(`status_${store.status}_hint` as TranslationKey)}
          action={
            store.status === "approved" ? (
              <Link to={`/restaurants/${store.slug}`}>
                <Button variant="secondary" size="sm" icon={<Eye className="w-4 h-4" />}>
                  {t("action_view")}
                </Button>
              </Link>
            ) : undefined
          }
        />

        {store.rejectionReason && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {t("rejection_reason")}
            </p>
            <p className="mt-0.5 text-sm text-amber-800 dark:text-amber-200">
              {store.rejectionReason}
            </p>
          </div>
        )}

        {blockers.length > 0 ? (
          <div className="space-y-2">
            <p className="flex items-center gap-1.5 text-sm font-semibold text-slate-700 dark:text-slate-200">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              {t("submit_blocked")}
            </p>
            <ul className="flex flex-wrap gap-2">
              {blockers.map((blocker) => (
                <li key={blocker}>
                  <Link
                    to={BLOCKER_TARGET[blocker] ?? "/store/dashboard/listing"}
                    className="inline-flex items-center gap-1.5 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800 transition hover:bg-amber-100 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200"
                  >
                    {t(`blocker_${blocker}` as TranslationKey)}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          store.status !== "approved" && (
            <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="w-4 h-4" />
              {t("translation_complete")}
            </p>
          )
        )}

        {error && <div className="mt-3">
          <ErrorNote message={error} />
        </div>}

        {(store.status === "draft" || store.status === "rejected") && (
          <div className="mt-4">
            <Button
              icon={<Send className="w-4 h-4" />}
              disabled={!canSubmit}
              loading={submit.isPending}
              onClick={() => submit.mutate()}
            >
              {store.status === "rejected"
                ? t("resubmit_for_review")
                : t("submit_for_review")}
            </Button>
          </div>
        )}
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label={t("insights_total_views")} value={store.views} />
        <StatTile
          label={t("insights_menu_items")}
          value={itemCount}
          icon={<UtensilsCrossed className="w-4 h-4" />}
        />
        <StatTile label={t("detail_gallery")} value={media.length} />
        <StatTile
          label={t("admin_when")}
          value={formatDate(store.submittedAt ?? store.createdAt, lang)}
        />
      </div>

      <Card>
        <SectionTitle title={t("portal_menu")} />
        {itemCount === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">
            {t("menu_empty_hint")}{" "}
            <Link
              to="/store/dashboard/menu"
              className="font-semibold text-brand-600 hover:underline dark:text-brand-300"
            >
              {t("menu_add_section")}
            </Link>
          </p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {(menu.data ?? []).map((section) => (
              <li key={section.id} className="flex justify-between gap-3">
                <span className="truncate text-slate-600 dark:text-slate-300">
                  {section.name[lang] ?? section.name[store.primaryLang] ?? "—"}
                </span>
                <span className="shrink-0 tabular-nums text-slate-500">
                  {section.items.length}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
