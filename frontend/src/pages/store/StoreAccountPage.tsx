import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, KeyRound, Phone } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  SectionTitle,
  Skeleton,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatDateTime, formatPhone } from "../../lib/format";

/** First letters of the owner's name, as a stand-in for an avatar. */
function initials(fullName: string): string {
  return fullName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

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

  if (detail.isLoading) return <AccountSkeleton />;

  if (detail.isError || !detail.data) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("portal_account")} />
        <ErrorNote message={t("error_network")} />
      </div>
    );
  }

  const owners = detail.data.owners;

  return (
    <div className="space-y-6 pb-4">
      <PageHeader title={t("portal_account")} />

      <Card>
        <SectionTitle title={t("admin_owner_accounts")} rule />

        {owners.length === 0 ? (
          <p className="rounded-card border border-dashed border-sand-300 px-4 py-6 text-center text-sm text-sand-600 dark:border-sand-700 dark:text-sand-500">
            {t("empty_none")}
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {owners.map((owner) => (
              <li key={owner.id} className="flex items-start gap-4 py-4 first:pt-0 last:pb-0">
                <span
                  aria-hidden
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-clay-100 font-display text-sm font-semibold text-clay-700 dark:bg-clay-500/15 dark:text-clay-300"
                >
                  {initials(owner.fullName)}
                </span>

                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                    <p className="truncate font-display text-base font-semibold text-sand-900 dark:text-sand-50">
                      {owner.fullName}
                    </p>
                    <Badge tone="accent">
                      {owner.position || t("admin_role_owner")}
                    </Badge>
                  </div>

                  <p className="mt-1 flex items-center gap-1.5 text-sm text-sand-600 dark:text-sand-400">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-sand-500" />
                    <span className="truncate tabular-nums">
                      {formatPhone(owner.phone)}
                    </span>
                  </p>

                  <p className="mt-0.5 text-xs text-sand-600 dark:text-sand-500">
                    {t("admin_when")}:{" "}
                    <span className="tabular-nums">
                      {formatDateTime(owner.lastLoginAt, lang)}
                    </span>
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <SectionTitle
          title={t("auth_change_password")}
          description={t("auth_password_hint")}
          rule
        />

        <form
          className="max-w-sm space-y-5"
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
            <p className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-800 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300">
              <Check className="h-4 w-4 shrink-0" />
              {t("auth_password_changed")}
            </p>
          )}

          <Button
            type="submit"
            loading={change.isPending}
            icon={<KeyRound className="h-4 w-4" />}
          >
            {t("auth_change_password")}
          </Button>
        </form>
      </Card>
    </div>
  );
}

/** Mirrors the two cards so the page does not reflow once the session loads. */
function AccountSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-9 w-40" />
      <Card>
        <Skeleton className="mb-5 h-6 w-48" />
        <div className="flex items-start gap-4">
          <Skeleton className="h-11 w-11 shrink-0 rounded-full" />
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3.5 w-32" />
            <Skeleton className="h-3 w-48" />
          </div>
        </div>
      </Card>
      <Card>
        <Skeleton className="mb-5 h-6 w-44" />
        <div className="max-w-sm space-y-5">
          {Array.from({ length: 3 }, (_, i) => (
            <div key={i} className="space-y-1.5">
              <Skeleton className="h-4 w-28" />
              <Skeleton className="h-11 w-full rounded-xl" />
            </div>
          ))}
          <Skeleton className="h-10 w-44 rounded-xl" />
        </div>
      </Card>
    </div>
  );
}
