import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Check, Eye, Send, UtensilsCrossed } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import { StatTile } from "../../components/BarRows";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  PageHeader,
  SectionTitle,
  Skeleton,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import { formatDate } from "../../lib/format";
import type { StoreStatus } from "../../types/api";

/**
 * Everything a listing needs before it can go to review, in the order an owner
 * would naturally work through it, and where each one gets fixed.
 *
 * The server returns only what is still *missing*; keeping the full list here
 * lets the page show the work as a checklist with progress on it rather than as
 * a stack of complaints.
 */
const CHECKLIST: { key: string; to: string }[] = [
  { key: "name", to: "/store/dashboard/listing" },
  { key: "description", to: "/store/dashboard/listing" },
  { key: "address", to: "/store/dashboard/listing" },
  { key: "location", to: "/store/dashboard/listing" },
  { key: "phone", to: "/store/dashboard/listing" },
  { key: "categories", to: "/store/dashboard/listing" },
  { key: "hours", to: "/store/dashboard/hours" },
  { key: "cover", to: "/store/dashboard/photos" },
  { key: "venue_photos", to: "/store/dashboard/photos" },
];

/** A tinted edge on the status card, read before any of the text is. */
const STATUS_EDGE: Record<StoreStatus, string> = {
  draft: "",
  pending: "border-clay-200 dark:border-clay-500/30",
  approved: "border-emerald-200 dark:border-emerald-500/30",
  rejected: "border-amber-200 dark:border-amber-500/30",
  suspended: "border-red-200 dark:border-red-500/30",
};

const STATUS_DOT: Record<StoreStatus, string> = {
  draft: "bg-sand-500",
  pending: "bg-clay-500",
  approved: "bg-emerald-600 dark:bg-emerald-400",
  rejected: "bg-amber-600 dark:bg-amber-400",
  suspended: "bg-red-600 dark:bg-red-400",
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

  if (detail.isLoading) return <OverviewSkeleton />;
  if (detail.isError) return <ErrorNote message={t("error_generic")} />;
  if (!detail.data) return null;

  const { store, blockers, media } = detail.data;
  const sections = menu.data ?? [];
  const itemCount = sections.reduce(
    (total, section) => total + section.items.length,
    0,
  );

  const outstanding = new Set(blockers);
  const done = CHECKLIST.filter((entry) => !outstanding.has(entry.key)).length;
  const percent = Math.round((done / CHECKLIST.length) * 100);

  const isEditable = store.status === "draft" || store.status === "rejected";
  const canSubmit = isEditable && blockers.length === 0;
  const showChecklist = isEditable || blockers.length > 0;

  return (
    <div>
      <PageHeader
        title={t("portal_overview")}
        action={
          store.status === "approved" ? (
            <Link to={`/restaurants/${store.slug}`}>
              <Button variant="secondary" icon={<Eye className="h-4 w-4" />}>
                {t("action_view")}
              </Button>
            </Link>
          ) : undefined
        }
      />

      <div className="space-y-6">
        {/* The lead: where the listing stands, then what is left to do. */}
        <Card className={STATUS_EDGE[store.status]}>
          <div className="max-w-xl">
            <h2 className="flex items-center gap-2.5 font-display text-2xl font-semibold text-sand-900 dark:text-sand-50">
              <span
                aria-hidden
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[store.status]}`}
              />
              {t(`status_${store.status}` as TranslationKey)}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-sand-600 dark:text-sand-400">
              {t(`status_${store.status}_hint` as TranslationKey)}
            </p>
          </div>

          {store.rejectionReason && (
            <div className="mt-5 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
                {t("rejection_reason")}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                {store.rejectionReason}
              </p>
            </div>
          )}

          {showChecklist && (
            <div className="mt-6 border-t border-[var(--border-subtle)] pt-5">
              <SectionTitle
                title={t("required")}
                action={
                  <span className="text-sm font-semibold tabular-nums text-sand-700 dark:text-sand-300">
                    {done}/{CHECKLIST.length}
                  </span>
                }
              />

              <div
                role="progressbar"
                aria-label={t("required")}
                aria-valuemin={0}
                aria-valuemax={CHECKLIST.length}
                aria-valuenow={done}
                className="h-2 w-full overflow-hidden rounded-full bg-sand-200 dark:bg-sand-800"
              >
                <div
                  className="h-full rounded-full bg-clay-600 transition-[width] duration-700 ease-out-soft dark:bg-clay-400"
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Done items settle back; the ones still open stay a link with
                  somewhere to go. */}
              <ul className="mt-4 grid gap-1 sm:grid-cols-2">
                {CHECKLIST.map((entry) => {
                  const label = t(`blocker_${entry.key}` as TranslationKey);

                  if (!outstanding.has(entry.key)) {
                    return (
                      <li
                        key={entry.key}
                        className="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-sand-600 dark:text-sand-400"
                      >
                        <span
                          aria-hidden
                          className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-emerald-600 text-white dark:bg-emerald-500"
                        >
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                        <span className="truncate">{label}</span>
                      </li>
                    );
                  }

                  return (
                    <li key={entry.key}>
                      <Link
                        to={entry.to}
                        className="group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium text-sand-900 transition-colors duration-200 hover:bg-sand-100 hover:text-clay-700 dark:text-sand-100 dark:hover:bg-sand-800 dark:hover:text-clay-300"
                      >
                        <span
                          aria-hidden
                          className="h-5 w-5 shrink-0 rounded-full border-2 border-dashed border-sand-400 dark:border-sand-600"
                        />
                        <span className="truncate">{label}</span>
                        <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-sand-500 transition-transform duration-200 ease-out-soft group-hover:translate-x-0.5 group-hover:text-clay-600 dark:group-hover:text-clay-300" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {error && (
            <div className="mt-5">
              <ErrorNote message={error} />
            </div>
          )}

          {/* A footer bonded to the card rather than a button left floating in
              whitespace: this is the one action the page exists for. */}
          {isEditable && (
            <div className="surface-sunken -mx-5 -mb-5 mt-6 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-b-panel border-t border-[var(--border-subtle)] px-5 py-4 sm:-mx-6 sm:-mb-6 sm:px-6">
              <Button
                icon={<Send className="h-4 w-4" />}
                disabled={!canSubmit}
                loading={submit.isPending}
                onClick={() => submit.mutate()}
              >
                {store.status === "rejected"
                  ? t("resubmit_for_review")
                  : t("submit_for_review")}
              </Button>
              {!canSubmit && (
                <p className="text-sm text-sand-600 dark:text-sand-400">
                  {t("submit_blocked")}
                </p>
              )}
            </div>
          )}
        </Card>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatTile
            label={t("stats_total_views")}
            value={store.views}
            icon={<Eye className="h-4 w-4" />}
          />
          <StatTile
            label={t("stats_menu_items")}
            value={itemCount}
            icon={<UtensilsCrossed className="h-4 w-4" />}
          />
          <StatTile label={t("detail_gallery")} value={media.length} />
          <StatTile
            label={t("admin_when")}
            value={formatDate(store.submittedAt ?? store.createdAt, lang)}
          />
        </div>

        <section>
          <SectionTitle
            title={t("portal_menu")}
            rule
            action={
              sections.length > 0 ? (
                <Link to="/store/dashboard/menu">
                  <Button variant="secondary" size="sm">
                    {t("action_edit")}
                  </Button>
                </Link>
              ) : undefined
            }
          />

          {menu.isLoading ? (
            <Card>
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, i) => (
                  <Skeleton key={i} className="h-5 w-full" />
                ))}
              </div>
            </Card>
          ) : menu.isError ? (
            <ErrorNote message={t("error_generic")} />
          ) : sections.length === 0 ? (
            <EmptyState
              icon={<UtensilsCrossed className="h-6 w-6" />}
              title={t("menu_empty")}
              description={t("menu_empty_hint")}
              action={
                <Link to="/store/dashboard/menu">
                  <Button>{t("menu_add_section")}</Button>
                </Link>
              }
            />
          ) : (
            <Card>
              {/* Dotted leaders, as on the public menu, so a section and its
                  count read as a single line. */}
              <ul className="divide-y divide-[var(--border-subtle)]">
                {sections.map((section) => (
                  <li
                    key={section.id}
                    className="flex items-baseline gap-3 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="truncate text-sm text-sand-800 dark:text-sand-200">
                      {section.name[lang] ?? section.name[store.primaryLang] ?? "—"}
                    </span>
                    <span
                      aria-hidden
                      className="hidden h-px flex-1 border-b border-dotted border-sand-300 sm:block dark:border-sand-700"
                    />
                    <span className="ml-auto shrink-0 text-sm font-semibold tabular-nums text-sand-900 sm:ml-0 dark:text-sand-100">
                      {section.items.length}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}

/** Holds the page's shape while the first request is in flight. */
function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-56" />
      <Card>
        <Skeleton className="h-7 w-40" />
        <Skeleton className="mt-3 h-4 w-full max-w-md" />
        <Skeleton className="mt-6 h-2 w-full" />
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </div>
      </Card>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
    </div>
  );
}
