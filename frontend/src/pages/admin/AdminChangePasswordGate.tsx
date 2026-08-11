import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { Button, ErrorNote, Field, Input } from "../../components/ui";
import logo from "../../assets/logo.svg";
import { useLanguage } from "../../i18n/LanguageContext";

/**
 * Shown when an admin still has a generated or reset password. The server
 * refuses every other admin route until this is done, so the UI presents the
 * form rather than a series of 403s.
 */
export default function AdminChangePasswordGate() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");

  const change = useMutation({
    mutationFn: () => adminApi.changePassword(current, next),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-session"] }),
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : t("error_generic")),
  });

  return (
    <div className="relative grid min-h-screen place-items-center overflow-hidden bg-[var(--surface-page)] px-4 py-10">
      {/* The same warm wash the public hero uses, so the gate still feels like
          part of the site rather than a bare system prompt. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-clay-200/40 blur-3xl dark:bg-clay-900/20"
      />

      <div className="relative w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <img src={logo} alt="" className="h-7 w-7 rounded-lg" />
          <span className="text-xs font-bold uppercase tracking-[0.14em] text-sand-600 dark:text-sand-400">
            {t("admin_panel")}
          </span>
        </div>

        <div className="panel p-6 shadow-lifted sm:p-8">
          <div className="space-y-3 text-center">
            <div className="mx-auto grid h-14 w-14 place-items-center rounded-card border border-clay-200 bg-clay-50 text-clay-700 dark:border-clay-500/30 dark:bg-clay-500/10 dark:text-clay-300">
              <ShieldAlert className="h-6 w-6" strokeWidth={1.75} />
            </div>
            <h1 className="font-display text-display-sm font-semibold text-sand-900 dark:text-sand-50">
              {t("auth_change_password")}
            </h1>
            <p className="text-sm leading-relaxed text-sand-600 dark:text-sand-400">
              {t("auth_must_change_password")}
            </p>
          </div>

          <form
            className="mt-7 space-y-5"
            onSubmit={(e) => {
              e.preventDefault();
              setError("");
              if (next !== confirm) {
                setError(t("auth_password_mismatch"));
                return;
              }
              change.mutate();
            }}
          >
            <Field label={t("auth_password_current")} required>
              <Input
                type="password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
                autoComplete="current-password"
                required
              />
            </Field>

            {/* The two new-password fields are grouped away from the current
                one, which is what the form is actually asking for. */}
            <div className="space-y-5 border-t border-[var(--border-subtle)] pt-5">
              <Field label={t("auth_password_new")} hint={t("auth_password_hint")} required>
                <Input
                  type="password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
              <Field
                label={t("auth_password_confirm")}
                error={
                  confirm && next !== confirm ? t("auth_password_mismatch") : undefined
                }
                required
              >
                <Input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoComplete="new-password"
                  required
                />
              </Field>
            </div>

            {error && <ErrorNote message={error} />}

            <Button
              type="submit"
              size="lg"
              loading={change.isPending}
              icon={<KeyRound className="h-4 w-4" />}
              className="w-full"
            >
              {t("auth_change_password")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
