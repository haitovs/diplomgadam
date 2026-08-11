import { useQueryClient } from "@tanstack/react-query";
import {
  Clock,
  ExternalLink,
  Eye,
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
import { formatPhone, pickLocalized } from "../lib/format";
import { useTheme } from "../lib/useTheme";
import type { StoreStatus } from "../types/api";

/* The review state is the single most important thing an owner needs to read
   here, so it is carried by a badge in the masthead: a tone, a dot and a word.
   "Pending" takes the clay accent rather than a blue — there is no blue in
   this palette. */
const STATUS_TONE: Record<
  StoreStatus,
  "neutral" | "accent" | "success" | "warning" | "danger"
> = {
  draft: "neutral",
  pending: "accent",
  approved: "success",
  rejected: "warning",
  suspended: "danger",
};

const STATUS_DOT: Record<StoreStatus, string> = {
  draft: "bg-sand-500",
  pending: "bg-clay-500",
  approved: "bg-emerald-600 dark:bg-emerald-400",
  rejected: "bg-amber-600 dark:bg-amber-400",
  suspended: "bg-red-600 dark:bg-red-400",
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

  const initial = user.fullName.trim().charAt(0).toUpperCase() || "?";

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
    <div className="min-h-screen bg-[var(--surface-page)] text-sand-900 dark:text-sand-50">
      {impersonated && (
        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5 bg-amber-500 px-4 py-2 text-sm font-semibold text-amber-950">
          <span className="flex items-center gap-1.5">
            <Eye className="h-4 w-4 shrink-0" />
            {t("admin_impersonating")}
          </span>
          <button
            type="button"
            onClick={handleStopImpersonation}
            className="rounded-full bg-amber-950/15 px-3 py-1 text-xs transition-colors duration-200 hover:bg-amber-950/25"
          >
            {t("admin_stop_impersonation")}
          </button>
        </div>
      )}

      {/* Masthead. Name, state and the controls an owner reaches for; it stays
          with them because the forms below are long. */}
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="" className="h-9 w-9 shrink-0 rounded-xl" />
            <div className="min-w-0">
              <p className="truncate font-display text-base font-semibold leading-tight text-sand-900 dark:text-sand-50">
                {pickLocalized(store.name, lang)}
              </p>
              <p className="truncate text-xs font-medium uppercase tracking-wider text-sand-600 dark:text-sand-500">
                {t("portal_title")}
              </p>
            </div>
            <Badge tone={STATUS_TONE[store.status]} className="shrink-0">
              <span
                aria-hidden
                className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[store.status]}`}
              />
              {t(`status_${store.status}` as TranslationKey)}
            </Badge>
          </div>

          <div className="flex items-center gap-2">
            {store.status === "approved" && (
              <NavLink
                to={`/restaurants/${store.slug}`}
                className="hidden items-center gap-1.5 rounded-lg border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-semibold text-sand-700 transition-colors duration-200 hover:border-clay-300 hover:text-clay-700 sm:inline-flex dark:text-sand-300 dark:hover:text-clay-300"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                {t("action_view")}
              </NavLink>
            )}

            {/* A sunken groove with one raised card in it, as elsewhere. */}
            <div
              role="group"
              aria-label={t("language")}
              className="surface-sunken flex items-center gap-0.5 rounded-xl border border-[var(--border-subtle)] p-0.5"
            >
              {LANGS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={`rounded-lg px-2 py-1 text-xs font-semibold transition-all duration-200 ease-out-soft ${
                    lang === code
                      ? "bg-[var(--surface-card)] text-clay-700 shadow-soft dark:text-clay-300"
                      : "text-sand-600 hover:text-sand-900 dark:text-sand-400 dark:hover:text-sand-100"
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
              className="rounded-xl border border-[var(--border-subtle)] p-2 text-sand-700 transition-colors duration-200 hover:border-sand-400 hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-sand-800"
            >
              {theme === "light" ? (
                <Moon className="h-4 w-4" />
              ) : (
                <Sun className="h-4 w-4 text-amber-400" />
              )}
            </button>

            <Button
              variant="ghost"
              size="sm"
              icon={<LogOut className="h-4 w-4" />}
              onClick={handleSignOut}
              loading={signOut.isPending}
              aria-label={t("action_signout")}
            >
              <span className="hidden sm:inline">{t("action_signout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        <div className="lg:flex lg:items-start lg:gap-7">
          {/* Sidebar on wide screens, a scrolling rail of tabs on a phone. */}
          <nav
            aria-label={t("portal_title")}
            className="lg:sticky lg:top-24 lg:w-56 lg:shrink-0 lg:self-start"
          >
            <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:flex-col lg:gap-1 lg:overflow-visible lg:rounded-panel lg:border lg:border-[var(--border-subtle)] lg:bg-[var(--surface-card)] lg:p-2.5 lg:shadow-soft">
              {navItems.map((item) => (
                <li key={item.to} className="shrink-0 lg:shrink">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `group flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-semibold transition-all duration-200 ease-out-soft ${
                        isActive
                          ? "bg-clay-600 text-white shadow-soft"
                          : "text-sand-700 hover:bg-sand-200/70 hover:text-sand-900 dark:text-sand-300 dark:hover:bg-sand-800/70 dark:hover:text-sand-50"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={`h-4 w-4 shrink-0 transition-colors duration-200 ${
                            isActive
                              ? "text-white"
                              : "text-sand-500 group-hover:text-clay-600 dark:group-hover:text-clay-300"
                          }`}
                        />
                        {item.label}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>

            {/* Who is signed in. Useful when an administrator is standing in
                for an owner, and quiet otherwise. */}
            <div className="surface-sunken mt-3 hidden items-center gap-3 rounded-card border border-[var(--border-subtle)] px-3.5 py-3 lg:flex">
              <span
                aria-hidden
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-clay-600 font-display text-sm font-semibold text-white"
              >
                {initial}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-sand-900 dark:text-sand-100">
                  {user.fullName}
                </span>
                <span className="block truncate text-xs tabular-nums text-sand-600 dark:text-sand-500">
                  {formatPhone(user.phone)}
                </span>
              </span>
            </div>
          </nav>

          <main className="min-w-0 flex-1 pt-3 lg:pt-0">
            <Outlet />
          </main>
        </div>
      </div>
    </div>
  );
}
