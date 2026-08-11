import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  KeyRound,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  Users,
} from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  Toggle,
} from "../../components/ui";
import { useAdminSession } from "../../hooks/useSessions";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatDateTime } from "../../lib/format";
import type { AdminRole } from "../../types/api";

export default function AdminAdminsPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const session = useAdminSession();
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState<string | null>(null);
  const [tempPassword, setTempPassword] = useState<{
    username: string;
    password: string;
  } | null>(null);
  const [draft, setDraft] = useState<{
    username: string;
    name: string;
    role: AdminRole;
    password: string;
  } | null>(null);

  const admins = useQuery({ queryKey: ["admin-admins"], queryFn: () => adminApi.admins() });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["admin-admins"] });
  const fail = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : t("error_generic"));

  const create = useMutation({
    mutationFn: () => adminApi.createAdmin(draft!),
    onSuccess: async () => {
      setDraft(null);
      setError("");
      await refresh();
    },
    onError: fail,
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Record<string, unknown> }) =>
      adminApi.updateAdmin(id, body),
    onSuccess: async () => {
      setError("");
      await refresh();
    },
    onError: fail,
  });

  const reset = useMutation({
    mutationFn: (id: string) => adminApi.resetAdminPassword(id),
    onSuccess: (result) =>
      setTempPassword({
        username: result.username,
        password: result.temporaryPassword,
      }),
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteAdmin(id),
    onSuccess: async () => {
      setError("");
      await refresh();
    },
    onError: fail,
  });

  const list = admins.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin_admins")}
        action={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setConfirming(null);
              setDraft({ username: "", name: "", role: "moderator", password: "" });
            }}
          >
            {t("admin_add_admin")}
          </Button>
        }
      />

      {error && <ErrorNote message={error} />}

      {/* Shown once and never again, so it gets the weight of a notice rather
          than a toast: labelled, monospaced, and selectable in one gesture. */}
      {tempPassword && (
        <div className="rounded-panel border border-emerald-200 bg-emerald-50 p-5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-emerald-800 dark:text-emerald-300">
            {t("admin_temp_password")}
          </p>
          <p className="mt-3 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <code className="select-all rounded-card border border-emerald-200 bg-[var(--surface-card)] px-3 py-2 font-mono text-lg font-bold tracking-wider text-emerald-900 dark:border-emerald-500/30 dark:bg-sand-950/40 dark:text-emerald-200">
              {tempPassword.password}
            </code>
            <span className="font-mono text-sm text-emerald-800 dark:text-emerald-300">
              {tempPassword.username}
            </span>
          </p>
          <p className="mt-3 text-sm leading-relaxed text-emerald-800 dark:text-emerald-300">
            {t("admin_temp_password_hint")}
          </p>
        </div>
      )}

      {draft && (
        <div className="panel border-clay-200 p-5 sm:p-6 dark:border-clay-500/30">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("auth_username")} required>
              <Input
                value={draft.username}
                onChange={(e) => setDraft({ ...draft, username: e.target.value })}
                autoComplete="off"
              />
            </Field>
            <Field label={t("store_owner_name")} required>
              <Input
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              />
            </Field>
            <Field label={t("admin_role")}>
              <Select
                value={draft.role}
                onChange={(e) => setDraft({ ...draft, role: e.target.value as AdminRole })}
              >
                <option value="moderator">{t("admin_role_moderator")}</option>
                <option value="owner">{t("admin_role_owner")}</option>
              </Select>
            </Field>
            <Field label={t("auth_password")} hint={t("auth_password_hint")} required>
              <Input
                type="password"
                value={draft.password}
                onChange={(e) => setDraft({ ...draft, password: e.target.value })}
                autoComplete="new-password"
              />
            </Field>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              {t("action_add")}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {t("action_cancel")}
            </Button>
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        {admins.isLoading ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 4 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-28" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
              </li>
            ))}
          </ul>
        ) : admins.isError ? (
          <div className="p-5">
            <ErrorNote message={t("error_generic")} />
          </div>
        ) : list.length === 0 ? (
          <div className="p-5">
            <EmptyState icon={<Users className="h-6 w-6" />} title={t("empty_none")} />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {list.map((admin) => {
              const isSelf = admin.id === session.data?.id;
              const isOwner = admin.role === "owner";
              const isActive = admin.isActive ?? true;
              const isConfirming = confirming === admin.id;
              const RoleIcon = isOwner ? ShieldCheck : Shield;

              return (
                <li
                  key={admin.id}
                  className={`px-4 py-4 transition-colors duration-200 sm:px-5 ${
                    isConfirming
                      ? "bg-red-50/70 dark:bg-red-500/5"
                      : "hover:bg-sand-100/60 dark:hover:bg-sand-900/40"
                  }`}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
                    <span
                      aria-hidden
                      className={`grid h-11 w-11 shrink-0 place-items-center rounded-full border font-display text-lg font-semibold ${
                        isActive
                          ? "border-clay-200 bg-clay-50 text-clay-700 dark:border-clay-500/30 dark:bg-clay-500/10 dark:text-clay-300"
                          : "border-[var(--border-subtle)] bg-[var(--surface-sunken)] text-sand-500"
                      }`}
                    >
                      {(admin.name || admin.username).trim().charAt(0).toUpperCase()}
                    </span>

                    <div className="min-w-0 flex-1 basis-48">
                      <p className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                        <span
                          className={`truncate font-medium ${
                            isActive
                              ? "text-sand-900 dark:text-sand-50"
                              : "text-sand-600 line-through decoration-sand-400 dark:text-sand-400"
                          }`}
                        >
                          {admin.name}
                        </span>
                        {isSelf && (
                          <Badge tone="accent">{t("portal_account")}</Badge>
                        )}
                      </p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-sand-600 dark:text-sand-500">
                        <span className="truncate font-mono">{admin.username}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock aria-hidden className="h-3 w-3 shrink-0" />
                          <span className="tabular-nums">
                            {formatDateTime(admin.lastLoginAt, lang)}
                          </span>
                        </span>
                      </p>
                    </div>

                    <Badge tone={isOwner ? "accent" : "neutral"} className="shrink-0">
                      <RoleIcon aria-hidden className="h-3 w-3" />
                      {t(`admin_role_${admin.role}`)}
                    </Badge>

                    <div className="w-32 shrink-0">
                      <Toggle
                        checked={isActive}
                        onChange={(next) =>
                          update.mutate({ id: admin.id, body: { isActive: next } })
                        }
                        label={t("portal_account")}
                        hint={isActive ? undefined : t("status_suspended")}
                      />
                    </div>

                    {isConfirming ? (
                      <div className="ml-auto flex shrink-0 items-center gap-1.5">
                        <AlertTriangle
                          aria-hidden
                          className="h-4 w-4 text-red-700 dark:text-red-400"
                        />
                        <Button
                          size="sm"
                          variant="danger"
                          loading={remove.isPending}
                          onClick={() => {
                            setConfirming(null);
                            remove.mutate(admin.id);
                          }}
                        >
                          {t("action_delete")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirming(null)}
                        >
                          {t("action_cancel")}
                        </Button>
                      </div>
                    ) : (
                      <div className="ml-auto flex shrink-0 items-center gap-1.5">
                        <Button
                          size="sm"
                          variant="secondary"
                          icon={<KeyRound className="h-3.5 w-3.5" />}
                          loading={reset.isPending && reset.variables === admin.id}
                          aria-label={t("admin_reset_password")}
                          onClick={() => reset.mutate(admin.id)}
                        >
                          <span className="hidden sm:inline">
                            {t("admin_reset_password")}
                          </span>
                        </Button>

                        <button
                          type="button"
                          onClick={() => setConfirming(admin.id)}
                          disabled={isSelf}
                          aria-label={t("action_delete")}
                          title={isSelf ? t("portal_account") : t("action_delete")}
                          className="rounded-lg p-2 text-sand-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-sand-600 dark:text-sand-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Spelled out rather than left to the red button alone. */}
                  {isConfirming && (
                    <p className="mt-3 text-sm font-medium text-red-800 dark:text-red-300">
                      {t("action_delete")} · {admin.name} ({admin.username})
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
