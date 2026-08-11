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
    <div className="grid min-h-screen place-items-center bg-gradient-to-br from-sand-100 via-sand-50 to-brand-50 p-4 dark:from-sand-950 dark:via-sand-900 dark:to-brand-950">
      <div className="w-full max-w-sm space-y-4">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-sand-600 hover:text-brand-600 dark:text-sand-500"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("action_back")}
        </Link>

        <div className="glass-panel space-y-5 p-7">
          <div className="space-y-2 text-center">
            <img src={logo} alt="" className="mx-auto w-12 h-12 rounded-2xl shadow-lg" />
            <div className="inline-flex items-center gap-1.5 rounded-full border border-sand-300/60 bg-sand-600/10 px-2.5 py-1 text-xs font-semibold text-sand-600 dark:border-sand-600 dark:text-sand-300">
              <ShieldCheck className="w-3.5 h-3.5" />
              {t("admin_signin_title")}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
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

            {error && <ErrorNote message={error} />}

            <Button type="submit" loading={busy} className="w-full">
              {t("action_signin")}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
