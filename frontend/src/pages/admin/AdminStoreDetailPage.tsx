import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Eye,
  ImageOff,
  KeyRound,
  Lock,
  MapPin,
  Pause,
  Phone,
  Play,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import MapView from "../../components/MapView";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  SectionTitle,
  Skeleton,
  Textarea,
} from "../../components/ui";
import { useAdminSession } from "../../hooks/useSessions";
import { useLanguage } from "../../i18n/LanguageContext";
import { LANGS, LANG_SHORT, type TranslationKey } from "../../i18n/translations";
import { formatDateTime, formatPhone, pickLocalized } from "../../lib/format";
import type { StoreStatus } from "../../types/api";

const STATUS_TONE: Record<StoreStatus, "neutral" | "accent" | "success" | "warning" | "danger"> =
  {
    draft: "neutral",
    pending: "accent",
    approved: "success",
    rejected: "warning",
    suspended: "danger",
  };

/** One label/value line in the facts column, with a dotted leader between. */
function Fact({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-baseline gap-2 py-1.5 text-sm">
      <span className="shrink-0 text-sand-600 dark:text-sand-400">{label}</span>
      <span className="h-px flex-1 border-b border-dotted border-sand-300 dark:border-sand-700" />
      <span className="shrink-0 tabular-nums text-sand-900 dark:text-sand-100">
        {value}
      </span>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-4 w-28" />
      <div className="grid gap-5 lg:grid-cols-[1.6fr,1fr]">
        <div className="panel space-y-4 p-5 sm:p-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
        <div className="panel space-y-3 p-5 sm:p-6">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-11 w-full" />
          <Skeleton className="h-11 w-full" />
        </div>
      </div>
      <div className="grid gap-5 lg:grid-cols-[1.2fr,1fr]">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}

export default function AdminStoreDetailPage() {
  const { storeId = "" } = useParams();
  const { t, lang } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useAdminSession();

  const [reason, setReason] = useState("");
  const [action, setAction] = useState<"reject" | "suspend" | null>(null);
  const [error, setError] = useState("");
  const [tempPassword, setTempPassword] = useState<{
    phone: string;
    password: string;
  } | null>(null);

  const detail = useQuery({
    queryKey: ["admin-store", storeId],
    queryFn: () => adminApi.store(storeId),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["admin-store", storeId] });
    await queryClient.invalidateQueries({ queryKey: ["admin-stores"] });
    await queryClient.invalidateQueries({ queryKey: ["admin-stats"] });
  };

  const fail = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : t("error_generic"));

  const moderate = useMutation({
    mutationFn: async (kind: "approve" | "reject" | "suspend" | "reinstate") => {
      if (kind === "approve") return adminApi.approve(storeId);
      if (kind === "reinstate") return adminApi.reinstate(storeId);
      if (kind === "reject") return adminApi.reject(storeId, reason);
      return adminApi.suspend(storeId, reason);
    },
    onSuccess: async () => {
      setError("");
      setAction(null);
      setReason("");
      await refresh();
    },
    onError: fail,
  });

  const impersonate = useMutation({
    mutationFn: () => adminApi.impersonate(storeId),
    onSuccess: () => navigate("/store/dashboard"),
    onError: fail,
  });

  const resetPassword = useMutation({
    mutationFn: (userId: string) => adminApi.resetOwnerPassword(storeId, userId),
    onSuccess: (result) =>
      setTempPassword({ phone: result.phone, password: result.temporaryPassword }),
    onError: fail,
  });

  const removeStore = useMutation({
    mutationFn: () => adminApi.deleteStore(storeId),
    onSuccess: async () => {
      await refresh();
      navigate("/admin/stores");
    },
    onError: fail,
  });

  if (detail.isLoading) return <DetailSkeleton />;
  if (detail.isError || !detail.data) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-6 w-6" />}
        title={t("detail_not_found")}
        action={
          <Link to="/admin/stores">
            <Button variant="secondary">{t("action_back")}</Button>
          </Link>
        }
      />
    );
  }

  const { store, owners, media, categories, hours, blockers } = detail.data;
  const venueProof = media.filter((image) => image.kind === "venue_proof");
  const publicImages = media.filter((image) => image.kind !== "venue_proof");
  const cover = media.find((image) => image.kind === "cover");
  const isOwnerRole = session.data?.role === "owner";
  const name = pickLocalized(store.name, lang, store.primaryLang);
  const hasModeration =
    store.status === "pending" ||
    store.status === "approved" ||
    store.status === "suspended";

  return (
    <div className="space-y-6">
      <Link
        to="/admin/stores"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sand-600 transition-colors hover:text-clay-700 dark:text-sand-400 dark:hover:text-clay-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("admin_stores")}
      </Link>

      {/* Identity on the left, the decision on the right. The decision column
          is its own track, so opening the reason field grows that card alone
          and nothing under it moves. */}
      <div className="grid gap-5 lg:grid-cols-[1.6fr,1fr] lg:items-start">
        <Card>
          <div className="flex gap-4">
            {cover ? (
              <picture>
                <source srcSet={cover.thumbUrl} type="image/webp" />
                <img
                  src={cover.thumbUrlJpeg}
                  alt=""
                  className="h-20 w-20 shrink-0 rounded-card object-cover shadow-soft sm:h-24 sm:w-24"
                />
              </picture>
            ) : (
              <div className="grid h-20 w-20 shrink-0 place-items-center rounded-card bg-sand-200 text-sand-500 sm:h-24 sm:w-24 dark:bg-sand-800 dark:text-sand-600">
                <ImageOff className="h-6 w-6" strokeWidth={1.5} />
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                <Badge tone={STATUS_TONE[store.status]}>
                  {t(`status_${store.status}` as TranslationKey)}
                </Badge>
                {categories.map((category) => (
                  <Badge key={category.id}>
                    {category.icon} {pickLocalized(category.name, lang)}
                  </Badge>
                ))}
              </div>

              <h1 className="font-display text-display-sm font-semibold leading-tight text-sand-900 dark:text-sand-50">
                {name}
              </h1>

              <p className="mt-1.5 flex items-start gap-1.5 text-sm text-sand-600 dark:text-sand-400">
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0">
                  {pickLocalized(store.address, lang, store.primaryLang)}
                  {store.neighborhood && ` · ${store.neighborhood}`}
                </span>
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                {store.status === "approved" && (
                  <Link to={`/restaurants/${store.slug}`} target="_blank">
                    <Button
                      variant="secondary"
                      size="sm"
                      icon={<Eye className="h-3.5 w-3.5" />}
                    >
                      {t("action_view")}
                    </Button>
                  </Link>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  icon={<Eye className="h-3.5 w-3.5" />}
                  loading={impersonate.isPending}
                  onClick={() => impersonate.mutate()}
                >
                  {t("admin_view_as_store")}
                </Button>
              </div>
            </div>
          </div>

          {store.rejectionReason && (
            <div className="mt-5 rounded-card border border-amber-200 bg-amber-50 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-amber-700 dark:text-amber-300">
                {t("rejection_reason")}
              </p>
              <p className="mt-1 text-sm leading-relaxed text-amber-900 dark:text-amber-200">
                {store.rejectionReason}
              </p>
            </div>
          )}

          {blockers.length > 0 && (
            <div className="surface-sunken mt-5 rounded-card px-4 py-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-sand-600 dark:text-sand-400">
                {t("submit_blocked")}
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {blockers.map((blocker) => (
                  <Badge key={blocker} tone="warning">
                    {t(`blocker_${blocker}` as TranslationKey)}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="lg:sticky lg:top-24">
          <Card className="border-clay-200 dark:border-clay-500/30">
            <SectionTitle title={t("admin_action")} />

            {error && (
              <div className="mb-4">
                <ErrorNote message={error} />
              </div>
            )}

            <div className="space-y-2.5">
              {store.status === "pending" && (
                <>
                  <Button
                    variant="success"
                    size="lg"
                    className="w-full"
                    icon={<Check className="h-4 w-4" />}
                    loading={moderate.isPending && moderate.variables === "approve"}
                    onClick={() => moderate.mutate("approve")}
                  >
                    {t("admin_approve")}
                  </Button>
                  <Button
                    variant="danger"
                    size="lg"
                    className="w-full"
                    icon={<X className="h-4 w-4" />}
                    aria-expanded={action === "reject"}
                    onClick={() => setAction(action === "reject" ? null : "reject")}
                  >
                    {t("admin_reject")}
                  </Button>
                </>
              )}

              {store.status === "approved" && (
                <Button
                  variant="danger"
                  size="lg"
                  className="w-full"
                  icon={<Pause className="h-4 w-4" />}
                  aria-expanded={action === "suspend"}
                  onClick={() => setAction(action === "suspend" ? null : "suspend")}
                >
                  {t("admin_suspend")}
                </Button>
              )}

              {store.status === "suspended" && (
                <Button
                  variant="success"
                  size="lg"
                  className="w-full"
                  icon={<Play className="h-4 w-4" />}
                  loading={moderate.isPending && moderate.variables === "reinstate"}
                  onClick={() => moderate.mutate("reinstate")}
                >
                  {t("admin_reinstate")}
                </Button>
              )}

              {!hasModeration && (
                <p className="text-sm text-sand-600 dark:text-sand-500">
                  {t("empty_none")}
                </p>
              )}
            </div>

            {/* The reason opens below the buttons, inside this card, so the
                buttons keep their place while you type. */}
            {action && (
              <div className="surface-sunken mt-4 space-y-3 rounded-card p-4">
                <Field
                  label={
                    action === "reject"
                      ? t("admin_reject_reason")
                      : t("admin_suspend_reason")
                  }
                  required
                >
                  <Textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    autoFocus
                  />
                </Field>
                <div className="flex gap-2">
                  <Button
                    variant="danger"
                    loading={moderate.isPending}
                    disabled={reason.trim().length < 3}
                    onClick={() => moderate.mutate(action)}
                  >
                    {t("action_confirm")}
                  </Button>
                  <Button variant="ghost" onClick={() => setAction(null)}>
                    {t("action_cancel")}
                  </Button>
                </div>
              </div>
            )}

            {isOwnerRole && (
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                <Button
                  variant="ghost"
                  size="sm"
                  icon={<Trash2 className="h-3.5 w-3.5" />}
                  loading={removeStore.isPending}
                  onClick={() => {
                    if (confirm(t("admin_delete_store_confirm"))) removeStore.mutate();
                  }}
                >
                  {t("admin_delete_store")}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* The evidence pair: what the venue looks like, and who to call about
          it. They belong side by side while you decide. */}
      <div className="grid gap-5 lg:grid-cols-[1.15fr,1fr] lg:items-start">
        <Card>
          <SectionTitle
            title={t("admin_venue_photos")}
            action={
              venueProof.length > 0 ? (
                <span className="text-sm font-semibold tabular-nums text-sand-600 dark:text-sand-400">
                  {venueProof.length}
                </span>
              ) : undefined
            }
          />

          <p className="surface-sunken mb-4 flex items-start gap-2 rounded-card px-3.5 py-2.5 text-xs leading-relaxed text-sand-700 dark:text-sand-300">
            <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-clay-600 dark:text-clay-400" />
            {t("media_venue_proof_hint")}
          </p>

          {venueProof.length === 0 ? (
            <p className="text-sm text-sand-600 dark:text-sand-500">{t("empty_none")}</p>
          ) : (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
              {venueProof.map((image, index) => (
                <a
                  key={image.id}
                  href={image.url}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`${t("admin_venue_photos")} ${index + 1}`}
                  className="photo-frame group aspect-square overflow-hidden rounded-card"
                >
                  <picture>
                    <source srcSet={image.thumbUrl} type="image/webp" />
                    <img
                      src={image.thumbUrlJpeg}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
                    />
                  </picture>
                </a>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <SectionTitle title={t("admin_owner_contact")} />

          <ul className="space-y-3">
            {owners.map((owner) => (
              <li
                key={owner.id}
                className="rounded-card border border-[var(--border-subtle)] p-4"
              >
                <div className="flex items-start gap-3">
                  <span
                    aria-hidden
                    className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-clay-50 font-display text-sm font-semibold text-clay-700 dark:bg-clay-500/10 dark:text-clay-300"
                  >
                    {owner.fullName.charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-sand-900 dark:text-sand-50">
                      {owner.fullName}
                    </p>
                    {owner.position && (
                      <p className="text-xs text-sand-600 dark:text-sand-500">
                        {owner.position}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 space-y-1">
                  {[owner.phone, owner.personalPhone]
                    .filter(Boolean)
                    .map((phone) => (
                      <a
                        key={phone as string}
                        href={`tel:${phone}`}
                        className="-mx-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm tabular-nums text-sand-800 transition-colors hover:bg-sand-100 hover:text-clay-700 dark:text-sand-200 dark:hover:bg-sand-800 dark:hover:text-clay-300"
                      >
                        <Phone className="h-3.5 w-3.5 shrink-0 text-sand-500" />
                        {formatPhone(phone)}
                      </a>
                    ))}
                </div>

                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border-subtle)] pt-3">
                  <p className="text-xs text-sand-600 dark:text-sand-500">
                    {t("admin_when")}: {formatDateTime(owner.lastLoginAt, lang)}
                  </p>
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<KeyRound className="h-3.5 w-3.5" />}
                    loading={resetPassword.isPending}
                    onClick={() => resetPassword.mutate(owner.id)}
                  >
                    {t("admin_reset_password")}
                  </Button>
                </div>
              </li>
            ))}
          </ul>

          {store.businessRegNo && (
            <p className="mt-4 flex flex-wrap items-baseline gap-x-2 text-sm text-sand-600 dark:text-sand-400">
              {t("form_business_reg")}
              <span className="font-mono text-sand-900 dark:text-sand-100">
                {store.businessRegNo}
              </span>
            </p>
          )}

          {tempPassword && (
            <div className="mt-4 rounded-card border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 dark:text-emerald-300">
                {t("admin_temp_password")}
              </p>
              <p className="mt-1 font-mono text-lg font-bold tracking-wide text-emerald-900 dark:text-emerald-200">
                {tempPassword.password}
              </p>
              <p className="mt-1.5 text-xs leading-relaxed text-emerald-800 dark:text-emerald-300">
                {formatPhone(tempPassword.phone)} · {t("admin_temp_password_hint")}
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2 lg:items-start">
        <Card>
          <SectionTitle title={t("portal_listing")} />

          <ul className="space-y-2.5">
            {LANGS.map((code) => {
              const isPrimary = code === store.primaryLang;
              return (
                <li key={code} className="flex gap-3 text-sm">
                  <span
                    className={`mt-0.5 h-5 shrink-0 rounded-md px-1.5 text-[11px] font-bold leading-5 ${
                      isPrimary
                        ? "bg-clay-100 text-clay-700 dark:bg-clay-500/15 dark:text-clay-300"
                        : "surface-sunken text-sand-600 dark:text-sand-400"
                    }`}
                    title={isPrimary ? t("translation_primary") : undefined}
                  >
                    {LANG_SHORT[code]}
                  </span>
                  <span className="min-w-0 flex-1 leading-relaxed">
                    {store.description[code] ? (
                      <span className="clamp-3 text-sand-700 dark:text-sand-300">
                        {store.description[code]}
                      </span>
                    ) : (
                      <span className="italic text-sand-500">
                        {t("translation_missing")}
                      </span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>

          <div className="mt-4 divide-y divide-[var(--border-subtle)] border-t border-[var(--border-subtle)] pt-1">
            <Fact label={t("store_phone")} value={formatPhone(store.phone)} />
            <Fact label={t("form_price_tier")} value={store.priceTier} />
            <Fact label={t("detail_hours")} value={hours.length} />
            <Fact label={t("detail_gallery")} value={publicImages.length} />
            <Fact label={t("insights_total_views")} value={store.views} />
            <Fact
              label={t("admin_when")}
              value={formatDateTime(store.submittedAt ?? store.createdAt, lang)}
            />
          </div>
        </Card>

        <Card>
          <SectionTitle title={t("detail_location")} />
          {store.lat !== null && store.lng !== null ? (
            <>
              <MapView
                className="h-56"
                center={[store.lng, store.lat]}
                zoom={15}
                markers={[{ id: store.id, lng: store.lng, lat: store.lat }]}
              />
              <p className="mt-3 text-sm text-sand-700 dark:text-sand-300">
                {pickLocalized(store.address, lang, store.primaryLang)}
              </p>
            </>
          ) : (
            <p className="text-sm text-sand-600 dark:text-sand-500">
              {t("map_no_location")}
            </p>
          )}
        </Card>
      </div>
    </div>
  );
}
