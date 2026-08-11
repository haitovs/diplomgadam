import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { adminApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import logo from "../../assets/logo.svg";
import { Button, ErrorNote, Field, Input } from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";

export default function AdminLoginPage() {
  const { t } = useLanguage();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      await adminApi.signIn(username, password);
      await queryClient.invalidateQueries({ queryKey: ["admin-session"] });
      navigate("/admin");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : t("error_generic"));
    } finally {
      setBusy(false);
    }
  }

  return (
    /* The staff door, not the front door: the same warm palette, but set on
       the sunken surface and without the terracotta accent the public and
       restaurant-facing screens use. */
    <div className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10 surface-sunken">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-sand-200/70 to-transparent dark:from-sand-900/60"
      />

      <div className="relative w-full max-w-sm space-y-5">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sand-600 transition-colors duration-200 hover:text-sand-900 dark:text-sand-400 dark:hover:text-sand-100"
        >
          <ArrowLeft className="h-4 w-4" />
          {t("action_back")}
        </Link>

        <div className="panel overflow-hidden">
          <header className="border-b border-[var(--border-subtle)] px-6 py-8 text-center">
            <span className="relative mx-auto block h-12 w-12">
              <img src={logo} alt="" className="h-12 w-12 rounded-xl shadow-soft" />
              <span className="absolute -bottom-1 -right-1 grid h-6 w-6 place-items-center rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] text-sand-700 dark:text-sand-300">
                <ShieldCheck className="h-3.5 w-3.5" />
              </span>
            </span>
            <p className="mt-4 text-xs font-bold uppercase tracking-[0.16em] text-sand-500">
              {t("brand_name")}
            </p>
            <h1 className="mt-2 font-display text-display-sm font-semibold leading-tight text-sand-900 dark:text-sand-50">
              {t("admin_signin_title")}
            </h1>
          </header>

          <form onSubmit={handleSubmit} className="space-y-5 px-6 py-7">
            <div className="space-y-4">
              <Field label={t("auth_username")} required>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  autoComplete="username"
                  required
                  autoFocus
                />
              </Field>
              <Field label={t("auth_password")} required>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </Field>
            </div>

            {error && <ErrorNote message={error} />}

            <Button type="submit" size="lg" loading={busy} className="w-full">
              {t("action_signin")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
