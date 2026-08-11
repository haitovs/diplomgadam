import { useMutation, useQuery } from "@tanstack/react-query";
import { KeyRound } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import {
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  SectionTitle,
  Spinner,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatDateTime, formatPhone } from "../../lib/format";

export default function StoreAccountPage() {
  const { t, lang } = useLanguage();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const detail = useQuery({ queryKey: ["store-detail"], queryFn: () => storeApi.detail() });

  const change = useMutation({
    mutationFn: () => storeApi.changePassword(current, next),
    onSuccess: () => {
      setError("");
      setDone(true);
      setCurrent("");
      setNext("");
      setConfirm("");
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : t("error_generic")),
  });

  if (detail.isLoading || !detail.data) return <Spinner />;

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle title={t("admin_owner_accounts")} />
        <ul className="divide-y divide-sand-100 dark:divide-sand-800">
          {detail.data.owners.map((owner) => (
            <li key={owner.id} className="py-3">
              <p className="font-semibold text-sand-800 dark:text-sand-100">
                {owner.fullName}
              </p>
              <p className="text-sm text-sand-600 dark:text-sand-500">
                {formatPhone(owner.phone)}
                {owner.position && ` · ${owner.position}`}
              </p>
              <p className="text-xs text-sand-500">
                {t("admin_when")}: {formatDateTime(owner.lastLoginAt, lang)}
              </p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <SectionTitle title={t("auth_change_password")} />
        <form
          className="max-w-sm space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            setDone(false);
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
          {done && (
            <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
              {t("auth_password_changed")}
            </p>
          )}

          <Button
            type="submit"
            loading={change.isPending}
            icon={<KeyRound className="w-4 h-4" />}
          >
            {t("auth_change_password")}
          </Button>
        </form>
      </Card>
    </div>
  );
}
