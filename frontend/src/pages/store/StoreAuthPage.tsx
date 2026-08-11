import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Store } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import { Button, ErrorNote, Field, Input, Select } from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { LANGS, LANG_LABELS, type Lang } from "../../i18n/translations";
import logo from "../../assets/logo.svg";

/**
 * A labelled group of fields. The registration form asks for three unrelated
 * things — who you are, what the restaurant is, and how you will sign in —
 * so each gets a numbered heading instead of running as one long column.
 */
function FormSection({
  step,
  title,
  children,
}: {
  step: number;
  title: string;
  children: ReactNode;
}) {
  const headingId = `auth-section-${step}`;
  return (
    <section aria-labelledby={headingId} className="space-y-4">
      <div className="flex items-center gap-3">
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-clay-100 text-[11px] font-bold tabular-nums text-clay-700 dark:bg-clay-500/15 dark:text-clay-300">
          {step}
        </span>
        <h2
          id={headingId}
          className="font-display text-xs font-bold uppercase tracking-[0.14em] text-clay-700 dark:text-clay-400"
        >
          {title}
        </h2>
        <span aria-hidden className="h-px flex-1 bg-[var(--border-subtle)]" />
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function StoreAuthPage({ mode }: { mode: "signin" | "register" }) {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [fullName, setFullName] = useState("");
  const [position, setPosition] = useState("");
  const [storeName, setStoreName] = useState("");
  const [storePhone, setStorePhone] = useState("");
  const [primaryLang, setPrimaryLang] = useState<Lang>("tk");

  const isRegister = mode === "register";

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError("");
    setFieldErrors({});

    if (isRegister && password !== confirm) {
      setError(t("auth_password_mismatch"));
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        await storeApi.register({
          owner: {
            fullName,
            position: position || undefined,
            phone,
            password,
          },
          store: {
            name: { [primaryLang]: storeName },
            primaryLang,
            phone: storePhone,
          },
        });
      } else {
        await storeApi.signIn(phone, password);
      }

      await queryClient.invalidateQueries({ queryKey: ["store-session"] });
      navigate("/store/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
        setFieldErrors(err.fieldErrors);
      } else {
        setError(t("error_generic"));
      }
    } finally {
      setBusy(false);
    }
  }

  const credentials = (
    <>
      <Field
        label={t("auth_phone")}
        required
        error={fieldErrors["owner.phone"] ?? fieldErrors.phone}
        hint={isRegister ? t("store_owner_personal_phone") : undefined}
      >
        <Input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+993 65 123456"
          autoComplete="username"
          required
        />
      </Field>

      <div className={isRegister ? "grid gap-4 sm:grid-cols-2" : undefined}>
        <Field
          label={t("auth_password")}
          required
          hint={isRegister ? t("auth_password_hint") : undefined}
          error={fieldErrors["owner.password"] ?? fieldErrors.password}
        >
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isRegister ? "new-password" : "current-password"}
            required
          />
        </Field>

        {isRegister && (
          <Field label={t("auth_password_confirm")} required>
            <Input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
        )}
      </div>
    </>
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-[var(--surface-page)] px-4 py-8 sm:py-12">
      {/* A warm wash behind the card, the same device the home hero uses, so
          the entrance belongs to the same publication. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-gradient-to-b from-clay-50 to-transparent dark:from-sand-900"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-clay-200/40 blur-3xl dark:bg-clay-900/20"
      />

      <div
        className={`relative mx-auto w-full space-y-5 ${isRegister ? "max-w-2xl" : "max-w-md"}`}
      >
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sand-600 transition-colors duration-200 hover:text-clay-700 dark:text-sand-400 dark:hover:text-clay-300"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("action_back")}
        </Link>

        <div className="panel overflow-hidden">
          <header className="border-b border-[var(--border-subtle)] px-6 py-8 text-center sm:px-10 sm:py-10">
            <img
              src={logo}
              alt=""
              className="mx-auto h-12 w-12 rounded-xl shadow-soft"
            />
            <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-clay-200 bg-clay-50 px-2.5 py-1 text-xs font-semibold text-clay-700 dark:border-clay-500/30 dark:bg-clay-500/10 dark:text-clay-300">
              <Store className="h-3.5 w-3.5" />
              {t("for_business")}
            </p>
            <h1 className="mt-4 font-display text-display-sm font-semibold leading-tight text-sand-900 dark:text-sand-50">
              {isRegister ? t("store_signup_title") : t("store_signin_title")}
            </h1>
            <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-sand-600 dark:text-sand-400">
              {isRegister ? t("store_signup_subtitle") : t("store_signin_subtitle")}
            </p>
          </header>

          <form onSubmit={handleSubmit} className="space-y-6 px-6 py-7 sm:px-10 sm:py-8">
            {isRegister ? (
              <>
                <FormSection step={1} title={t("admin_role_owner")}>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={t("store_owner_name")}
                      required
                      error={fieldErrors["owner.fullName"]}
                    >
                      <Input
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        autoComplete="name"
                      />
                    </Field>

                    <Field
                      label={t("store_owner_position")}
                      hint={t("store_owner_position_hint")}
                    >
                      <Input
                        value={position}
                        onChange={(e) => setPosition(e.target.value)}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection step={2} title={t("portal_listing")}>
                  <Field
                    label={t("store_name")}
                    required
                    error={fieldErrors["store.name"]}
                  >
                    <Input
                      value={storeName}
                      onChange={(e) => setStoreName(e.target.value)}
                      required
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field
                      label={t("store_primary_lang")}
                      hint={t("store_primary_lang_hint")}
                    >
                      <Select
                        value={primaryLang}
                        onChange={(e) => setPrimaryLang(e.target.value as Lang)}
                      >
                        {LANGS.map((code) => (
                          <option key={code} value={code}>
                            {LANG_LABELS[code]}
                          </option>
                        ))}
                      </Select>
                    </Field>

                    <Field
                      label={t("store_phone")}
                      required
                      error={fieldErrors["store.phone"]}
                    >
                      <Input
                        type="tel"
                        value={storePhone}
                        onChange={(e) => setStorePhone(e.target.value)}
                        placeholder="+993 12 345678"
                        required
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection step={3} title={t("portal_account")}>
                  {credentials}
                </FormSection>
              </>
            ) : (
              <div className="space-y-4">{credentials}</div>
            )}

            {error && <ErrorNote message={error} />}

            <Button type="submit" size="lg" loading={busy} className="w-full">
              {isRegister ? t("action_continue") : t("action_signin")}
            </Button>
          </form>

          <p className="surface-sunken border-t border-[var(--border-subtle)] px-6 py-4 text-center text-sm text-sand-600 sm:px-10 dark:text-sand-400">
            {isRegister ? t("store_have_account") : t("store_no_account")}{" "}
            <Link
              to={isRegister ? "/store" : "/store/register"}
              className="font-semibold text-clay-700 underline-offset-4 transition-colors duration-200 hover:underline dark:text-clay-300"
            >
              {isRegister ? t("action_signin") : t("store_signup_title")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
