import { useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  Eye,
  Globe,
  ImageIcon,
  LayoutDashboard,
  LogOut,
  Moon,
  Store,
  Sun,
  UserCog,
  UtensilsCrossed,
} from "lucide-react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { adminApi } from "../api/admin";
import logo from "../assets/logo.svg";
import { Badge, Button, Spinner } from "../components/ui";
import { useStoreSession, useStoreSignOut } from "../hooks/useSessions";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGS, LANG_SHORT, type TranslationKey } from "../i18n/translations";
import { pickLocalized } from "../lib/format";
import { useTheme } from "../lib/useTheme";
import type { StoreStatus } from "../types/api";

const STATUS_TONE: Record<StoreStatus, "neutral" | "info" | "success" | "warning" | "danger"> =
  {
    draft: "neutral",
    pending: "info",
    approved: "success",
    rejected: "warning",
    suspended: "danger",
  };

export default function StorePortalLayout() {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useStoreSession();
  const signOut = useStoreSignOut();

  if (session.isLoading) return <Spinner className="min-h-screen" />;
  if (!session.data) return <Navigate to="/store" replace />;

  const { store, user, impersonated } = session.data;

  const navItems = [
    { to: "/store/dashboard", label: t("portal_overview"), icon: LayoutDashboard, end: true },
    { to: "/store/dashboard/listing", label: t("portal_listing"), icon: Store },
    { to: "/store/dashboard/hours", label: t("portal_hours"), icon: Clock },
    { to: "/store/dashboard/menu", label: t("portal_menu"), icon: UtensilsCrossed },
    { to: "/store/dashboard/photos", label: t("portal_photos"), icon: ImageIcon },
    { to: "/store/dashboard/account", label: t("portal_account"), icon: UserCog },
  ];

  async function handleSignOut() {
    await signOut.mutateAsync();
    navigate("/store");
  }

  async function handleStopImpersonation() {
    await adminApi.stopImpersonation();
    await queryClient.invalidateQueries({ queryKey: ["store-session"] });
    navigate("/admin/stores");
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      {impersonated && (
        <div className="flex flex-wrap items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950">
          <span className="flex items-center gap-1.5">
            <Eye className="w-4 h-4" />
            {t("admin_impersonating")}
          </span>
          <button
            type="button"
            onClick={handleStopImpersonation}
            className="rounded-full bg-amber-950/15 px-3 py-1 text-xs hover:bg-amber-950/25"
          >
            {t("admin_stop_impersonation")}
          </button>
        </div>
      )}

      <header className="border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="w-8 h-8 rounded-lg" />
            <div className="min-w-0">
              <p className="truncate font-bold leading-tight">
                {pickLocalized(store.name, lang)}
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("portal_title")}
              </p>
            </div>
            <Badge tone={STATUS_TONE[store.status]}>
              {t(`status_${store.status}` as TranslationKey)}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {store.status === "approved" && (
              <NavLink
                to={`/restaurants/${store.slug}`}
                className="hidden rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 sm:inline-flex dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                {t("action_view")}
              </NavLink>
            )}

            <div className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
              {LANGS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  className={`rounded-md px-2 py-1 text-xs font-semibold transition ${
                    lang === code
                      ? "bg-white text-brand-600 shadow-sm dark:bg-slate-700 dark:text-brand-300"
                      : "text-slate-500 dark:text-slate-400"
                  }`}
                >
                  {LANG_SHORT[code]}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t("theme_toggle")}
              className="rounded-lg border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {theme === "light" ? (
                <Moon className="w-4 h-4" />
              ) : (
                <Sun className="w-4 h-4 text-amber-400" />
              )}
            </button>

            <Button
              variant="ghost"
              size="sm"
              icon={<LogOut className="w-4 h-4" />}
              onClick={handleSignOut}
              loading={signOut.isPending}
            >
              <span className="hidden sm:inline">{t("action_signout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row">
        <nav className="lg:w-56 lg:shrink-0">
          <ul className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
            {navItems.map((item) => (
              <li key={item.to} className="shrink-0 lg:shrink">
                <NavLink
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-brand-500 text-white shadow-sm shadow-brand-500/25"
                        : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
                    }`
                  }
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <p className="mt-4 hidden px-3.5 text-xs text-slate-400 lg:block">
            {user.fullName}
          </p>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
