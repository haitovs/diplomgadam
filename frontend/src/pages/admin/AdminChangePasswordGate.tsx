import { useMutation, useQueryClient } from "@tanstack/react-query";
import { KeyRound, ShieldAlert } from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import { Button, ErrorNote, Field, Input } from "../../components/ui";
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
    <div className="grid min-h-screen place-items-center bg-sand-50 p-4 dark:bg-sand-950">
      <div className="glass-panel w-full max-w-sm space-y-5 p-7">
        <div className="space-y-2 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-500/15 dark:text-amber-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h1 className="text-lg font-bold text-sand-900 dark:text-white">
            {t("auth_change_password")}
          </h1>
          <p className="text-sm text-sand-600 dark:text-sand-500">
            {t("auth_must_change_password")}
          </p>
        </div>

        <form
          className="space-y-4"
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
          <Field label={t("auth_password_new")} hint={t("auth_password_hint")} required>
            <Input
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label={t("auth_password_confirm")} required>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>

          {error && <ErrorNote message={error} />}

          <Button
            type="submit"
            loading={change.isPending}
            icon={<KeyRound className="w-4 h-4" />}
            className="w-full"
          >
            {t("auth_change_password")}
          </Button>
        </form>
      </div>
    </div>
  );
}
