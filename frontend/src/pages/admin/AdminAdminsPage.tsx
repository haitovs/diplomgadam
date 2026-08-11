import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { KeyRound, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  SectionTitle,
  Select,
  Spinner,
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

  if (admins.isLoading) return <Spinner />;

  return (
    <Card>
      <SectionTitle
        title={t("admin_admins")}
        action={
          <Button
            size="sm"
            icon={<Plus className="w-3.5 h-3.5" />}
            onClick={() =>
              setDraft({ username: "", name: "", role: "moderator", password: "" })
            }
          >
            {t("admin_add_admin")}
          </Button>
        }
      />

      {error && <ErrorNote message={error} />}

      {tempPassword && (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 dark:border-emerald-500/30 dark:bg-emerald-500/10">
          <p className="text-xs font-bold uppercase tracking-wide text-emerald-700 dark:text-emerald-300">
            {t("admin_temp_password")} · {tempPassword.username}
          </p>
          <p className="mt-1 font-mono text-lg font-bold text-emerald-900 dark:text-emerald-200">
            {tempPassword.password}
          </p>
          <p className="mt-1 text-xs text-emerald-700 dark:text-emerald-300">
            {t("admin_temp_password_hint")}
          </p>
        </div>
      )}

      {draft && (
        <div className="mb-4 grid gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 sm:grid-cols-2 dark:border-brand-500/30 dark:bg-brand-500/5">
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
          <div className="flex gap-2 sm:col-span-2">
            <Button size="sm" loading={create.isPending} onClick={() => create.mutate()}>
              {t("action_add")}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
              {t("action_cancel")}
            </Button>
          </div>
        </div>
      )}

      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {admins.data?.map((admin) => {
          const isSelf = admin.id === session.data?.id;
          return (
            <li key={admin.id} className="flex flex-wrap items-center gap-3 py-3">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-800 dark:text-slate-100">
                  {admin.name}
                  {isSelf && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">
                      ({t("portal_account")})
                    </span>
                  )}
                </p>
                <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                  {admin.username} · {formatDateTime(admin.lastLoginAt, lang)}
                </p>
              </div>

              <Badge tone={admin.role === "owner" ? "info" : "neutral"}>
                {t(`admin_role_${admin.role}`)}
              </Badge>

              <Toggle
                checked={admin.isActive ?? true}
                onChange={(isActive) =>
                  update.mutate({ id: admin.id, body: { isActive } })
                }
                label=""
              />

              <Button
                size="sm"
                variant="ghost"
                icon={<KeyRound className="w-3.5 h-3.5" />}
                onClick={() => reset.mutate(admin.id)}
              >
                {t("admin_reset_password")}
              </Button>

              <button
                type="button"
                onClick={() => remove.mutate(admin.id)}
                disabled={isSelf}
                className="rounded-lg p-1.5 text-slate-400 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-500/10"
                aria-label={t("action_delete")}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}
