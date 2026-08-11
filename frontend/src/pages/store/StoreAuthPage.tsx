import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Store } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import { Button, ErrorNote, Field, Input, Select } from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { LANGS, LANG_LABELS, type Lang } from "../../i18n/translations";
import logo from "../../assets/logo.svg";

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-sand-50 via-clay-50 to-brand-50 dark:from-sand-950 dark:via-sand-900 dark:to-brand-950 px-4 py-10">
      <div className="mx-auto w-full max-w-lg space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sand-600 dark:text-sand-500 hover:text-brand-600"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("action_back")}
        </Link>

        <div className="glass-panel space-y-5 p-6 sm:p-8">
          <div className="space-y-2 text-center">
            <img src={logo} alt="" className="mx-auto w-12 h-12 rounded-2xl shadow-lg" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-brand-200/60 bg-brand-500/10 px-2.5 py-1 text-xs font-semibold text-brand-700 dark:border-brand-500/30 dark:text-brand-300">
              <Store className="w-3.5 h-3.5" />
              {t("for_business")}
            </div>
            <h1 className="text-2xl font-bold text-sand-900 dark:text-white">
              {isRegister ? t("store_signup_title") : t("store_signin_title")}
            </h1>
            <p className="text-sm text-sand-600 dark:text-sand-500">
              {isRegister ? t("store_signup_subtitle") : t("store_signin_subtitle")}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <>
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

                <Field label={t("store_name")} required error={fieldErrors["store.name"]}>
                  <Input
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    required
                  />
                </Field>

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
              </>
            )}

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

            {error && <ErrorNote message={error} />}

            <Button type="submit" loading={busy} className="w-full">
              {isRegister ? t("action_continue") : t("action_signin")}
            </Button>
          </form>

          <p className="text-center text-sm text-sand-600 dark:text-sand-500">
            {isRegister ? t("store_have_account") : t("store_no_account")}{" "}
            <Link
              to={isRegister ? "/store" : "/store/register"}
              className="font-semibold text-brand-600 dark:text-brand-300 hover:underline"
            >
              {isRegister ? t("action_signin") : t("store_signup_title")}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
