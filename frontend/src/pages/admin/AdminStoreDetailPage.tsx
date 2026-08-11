import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  Eye,
  KeyRound,
  Lock,
  Pause,
  Play,
  Trash2,
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
  ErrorNote,
  Field,
  Input,
  SectionTitle,
  Spinner,
} from "../../components/ui";
import { useAdminSession } from "../../hooks/useSessions";
import { useLanguage } from "../../i18n/LanguageContext";
import { LANGS, LANG_SHORT, type TranslationKey } from "../../i18n/translations";
import { formatDateTime, formatPhone, pickLocalized } from "../../lib/format";
import type { StoreStatus } from "../../types/api";

const STATUS_TONE: Record<StoreStatus, "neutral" | "info" | "success" | "warning" | "danger"> =
  {
    draft: "neutral",
    pending: "info",
    approved: "success",
    rejected: "warning",
    suspended: "danger",
  };

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

  if (detail.isLoading || !detail.data) return <Spinner />;

  const { store, owners, media, categories, hours, blockers } = detail.data;
  const venueProof = media.filter((image) => image.kind === "venue_proof");
  const publicImages = media.filter((image) => image.kind !== "venue_proof");
  const isOwnerRole = session.data?.role === "owner";

  return (
    <div className="space-y-5">
      <Link
        to="/admin/stores"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sand-600 hover:text-brand-600 dark:text-sand-500"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("admin_stores")}
      </Link>

      <Card>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge tone={STATUS_TONE[store.status]}>
                {t(`status_${store.status}` as TranslationKey)}
              </Badge>
              {categories.map((category) => (
                <Badge key={category.id}>
                  {category.icon} {pickLocalized(category.name, lang)}
                </Badge>
              ))}
            </div>
            <h1 className="text-xl font-bold text-sand-900 dark:text-white">
              {pickLocalized(store.name, lang, store.primaryLang)}
            </h1>
            <p className="text-sm text-sand-600 dark:text-sand-500">
              {pickLocalized(store.address, lang, store.primaryLang)}
              {store.neighborhood && ` · ${store.neighborhood}`}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            {store.status === "approved" && (
              <Link to={`/restaurants/${store.slug}`} target="_blank">
                <Button variant="secondary" size="sm" icon={<Eye className="w-4 h-4" />}>
                  {t("action_view")}
                </Button>
              </Link>
            )}
            <Button
              variant="secondary"
              size="sm"
              icon={<Eye className="w-4 h-4" />}
              loading={impersonate.isPending}
              onClick={() => impersonate.mutate()}
            >
              {t("admin_view_as_store")}
            </Button>
          </div>
        </div>

        {store.rejectionReason && (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 dark:border-amber-500/30 dark:bg-amber-500/10">
            <p className="text-xs font-bold uppercase tracking-wide text-amber-700 dark:text-amber-300">
              {t("rejection_reason")}
            </p>
            <p className="text-sm text-amber-800 dark:text-amber-200">
              {store.rejectionReason}
            </p>
          </div>
        )}

        {blockers.length > 0 && (
          <p className="mt-3 text-sm text-sand-600 dark:text-sand-500">
            {t("submit_blocked")}:{" "}
            {blockers.map((b) => t(`blocker_${b}` as TranslationKey)).join(", ")}
          </p>
        )}

        {error && (
          <div className="mt-3">
            <ErrorNote message={error} />
          </div>
        )}

        <div className="mt-4 flex flex-wrap gap-2">
          {store.status === "pending" && (
            <>
              <Button
                variant="success"
                icon={<Check className="w-4 h-4" />}
                loading={moderate.isPending}
                onClick={() => moderate.mutate("approve")}
              >
                {t("admin_approve")}
              </Button>
              <Button
                variant="secondary"
                icon={<X className="w-4 h-4" />}
                onClick={() => setAction(action === "reject" ? null : "reject")}
              >
                {t("admin_reject")}
              </Button>
            </>
          )}

          {store.status === "approved" && (
            <Button
              variant="danger"
              icon={<Pause className="w-4 h-4" />}
              onClick={() => setAction(action === "suspend" ? null : "suspend")}
            >
              {t("admin_suspend")}
            </Button>
          )}

          {store.status === "suspended" && (
            <Button
              variant="success"
              icon={<Play className="w-4 h-4" />}
              loading={moderate.isPending}
              onClick={() => moderate.mutate("reinstate")}
            >
              {t("admin_reinstate")}
            </Button>
          )}

          {isOwnerRole && (
            <Button
              variant="ghost"
              icon={<Trash2 className="w-4 h-4" />}
              onClick={() => {
                if (confirm(t("admin_delete_store_confirm"))) removeStore.mutate();
              }}
            >
              {t("admin_delete_store")}
            </Button>
          )}
        </div>

        {action && (
          <div className="mt-4 space-y-3 rounded-xl border border-sand-200 p-4 dark:border-sand-700">
            <Field
              label={
                action === "reject" ? t("admin_reject_reason") : t("admin_suspend_reason")
              }
              required
            >
              <Input
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                autoFocus
              />
            </Field>
            <div className="flex gap-2">
              <Button
                variant={action === "reject" ? "secondary" : "danger"}
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
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle title={t("admin_venue_photos")} />
          <p className="mb-3 flex items-center gap-1.5 text-xs text-amber-700 dark:text-amber-300">
            <Lock className="w-3.5 h-3.5" />
            {t("media_venue_proof_hint")}
          </p>
          {venueProof.length === 0 ? (
            <p className="text-sm text-sand-600 dark:text-sand-500">{t("empty_none")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {venueProof.map((image) => (
                <a key={image.id} href={image.url} target="_blank" rel="noreferrer">
                  <img
                    src={image.thumbUrl}
                    alt=""
                    className="h-24 w-24 rounded-xl object-cover"
                  />
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
                className="rounded-xl border border-sand-200 p-3.5 dark:border-sand-700"
              >
                <p className="font-semibold text-sand-800 dark:text-sand-100">
                  {owner.fullName}
                  {owner.position && (
                    <span className="ml-1.5 text-xs font-normal text-sand-600">
                      {owner.position}
                    </span>
                  )}
                </p>
                <p className="text-sm text-sand-600 dark:text-sand-300">
                  <a href={`tel:${owner.phone}`} className="hover:text-brand-600">
                    {formatPhone(owner.phone)}
                  </a>
                  {owner.personalPhone && (
                    <>
                      {" · "}
                      <a
                        href={`tel:${owner.personalPhone}`}
                        className="hover:text-brand-600"
                      >
                        {formatPhone(owner.personalPhone)}
                      </a>
                    </>
                  )}
                </p>
                <p className="text-xs text-sand-500">
                  {t("admin_when")}: {formatDateTime(owner.lastLoginAt, lang)}
                </p>
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1.5"
                  icon={<KeyRound className="w-3.5 h-3.5" />}
                  loading={resetPassword.isPending}
                  onClick={() => resetPassword.mutate(owner.id)}
                >
                  {t("admin_reset_password")}
                </Button>
              </li>
            ))}
          </ul>

          {store.businessRegNo && (
            <p className="mt-3 text-sm text-sand-600 dark:text-sand-300">
              {t("form_business_reg")}:{" "}
              <span className="font-mono">{store.businessRegNo}</span>
            </p>
          )}

          {tempPassword && (
            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
              <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
                {t("admin_temp_password")}
              </p>
              <p className="mt-1 font-mono text-lg font-bold text-emerald-900 dark:text-emerald-200">
                {tempPassword.password}
              </p>
              <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
                {formatPhone(tempPassword.phone)} · {t("admin_temp_password_hint")}
              </p>
            </div>
          )}
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <SectionTitle title={t("portal_listing")} />
          <dl className="space-y-2 text-sm">
            {LANGS.map((code) => (
              <div key={code} className="flex gap-2">
                <dt className="w-8 shrink-0 font-mono text-xs text-sand-500">
                  {LANG_SHORT[code]}
                </dt>
                <dd className="text-sand-600 dark:text-sand-300">
                  {store.description[code] ?? (
                    <span className="text-sand-500">{t("translation_missing")}</span>
                  )}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-4 space-y-1 text-sm text-sand-600 dark:text-sand-300">
            <p>
              {t("store_phone")}: {formatPhone(store.phone)}
            </p>
            <p>
              {t("form_price_tier")}: {store.priceTier}
            </p>
            <p>
              {t("detail_hours")}: {hours.length}
            </p>
            <p>
              {t("detail_gallery")}: {publicImages.length}
            </p>
          </div>
        </Card>

        <Card>
          <SectionTitle title={t("detail_location")} />
          {store.lat !== null && store.lng !== null ? (
            <MapView
              className="h-56"
              center={[store.lng, store.lat]}
              zoom={15}
              markers={[{ id: store.id, lng: store.lng, lat: store.lat }]}
            />
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
