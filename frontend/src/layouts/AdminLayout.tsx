import { useQuery } from "@tanstack/react-query";
import {
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Moon,
  ScrollText,
  Store,
  Sun,
  Tags,
  Users,
  type LucideIcon,
} from "lucide-react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { adminApi } from "../api/admin";
import logo from "../assets/logo.svg";
import { Button, Spinner } from "../components/ui";
import { useAdminSession, useAdminSignOut } from "../hooks/useSessions";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGS, LANG_SHORT } from "../i18n/translations";
import { useTheme } from "../lib/useTheme";
import AdminChangePasswordGate from "../pages/admin/AdminChangePasswordGate";

interface NavItem {
  to: string;
  label: string;
  icon: LucideIcon;
  end?: boolean;
  /** Rendered as a count chip; only the review queue carries one. */
  badge?: number;
}

export default function AdminLayout() {
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const session = useAdminSession();
  const signOut = useAdminSignOut();

  const stats = useQuery({
    queryKey: ["admin-stats"],
    queryFn: () => adminApi.stats(),
    enabled: Boolean(session.data),
    refetchInterval: 60_000,
  });

  if (session.isLoading) return <Spinner className="min-h-screen" />;
  if (!session.data) return <Navigate to="/admin/login" replace />;

  // A forced password change blocks every other admin route server-side, so the
  // UI shows the change form rather than a wall of 403s.
  if (session.data.mustChangePassword) return <AdminChangePasswordGate />;

  const pending = stats.data?.statusCounts.pending ?? 0;

  const navItems: NavItem[] = [
    { to: "/admin", label: t("admin_dashboard"), icon: LayoutDashboard, end: true },
    { to: "/admin/queue", label: t("admin_queue"), icon: ClipboardList, badge: pending },
    { to: "/admin/stores", label: t("admin_stores"), icon: Store },
    { to: "/admin/categories", label: t("admin_categories"), icon: Tags },
    ...(session.data.role === "owner"
      ? [{ to: "/admin/admins", label: t("admin_admins"), icon: Users }]
      : []),
    { to: "/admin/audit", label: t("admin_audit"), icon: ScrollText },
  ];

  return (
    <div className="min-h-screen bg-[var(--surface-page)] text-sand-900 dark:text-sand-100">
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-card)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <img src={logo} alt="" className="h-9 w-9 rounded-xl shadow-soft" />
            <div className="min-w-0">
              <p className="font-display text-base font-semibold leading-tight text-sand-900 dark:text-sand-50">
                {t("admin_panel")}
              </p>
              <p className="truncate text-xs text-sand-600 dark:text-sand-400">
                {session.data.name}
                <span className="mx-1.5 text-sand-400 dark:text-sand-600">·</span>
                <span className="font-medium text-clay-700 dark:text-clay-300">
                  {t(`admin_role_${session.data.role}`)}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Segmented language switch, warm rather than the old blue. */}
            <div className="surface-sunken flex items-center gap-0.5 rounded-xl p-1">
              {LANGS.map((code) => (
                <button
                  key={code}
                  type="button"
                  onClick={() => setLang(code)}
                  aria-pressed={lang === code}
                  className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition-all duration-200 ease-out-soft ${
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
              className="rounded-xl border border-[var(--border-subtle)] p-2.5 text-sand-600 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-900 dark:text-sand-400 dark:hover:bg-sand-800 dark:hover:text-sand-100"
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
              loading={signOut.isPending}
              aria-label={t("action_signout")}
              onClick={async () => {
                await signOut.mutateAsync();
                navigate("/admin/login");
              }}
            >
              <span className="hidden sm:inline">{t("action_signout")}</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:gap-8">
        <nav className="lg:w-56 lg:shrink-0" aria-label={t("admin_panel")}>
          <div className="lg:sticky lg:top-24">
            {/* On mobile the rail becomes a bleed-to-edge scroller so long
                labels never force the page sideways. */}
            <ul className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0 lg:pb-0">
              {navItems.map((item) => (
                <li key={item.to} className="shrink-0 lg:shrink">
                  <NavLink
                    to={item.to}
                    end={item.end}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-200 ease-out-soft ${
                        isActive
                          ? "bg-clay-600 text-white shadow-soft"
                          : "text-sand-700 hover:bg-sand-200/60 dark:text-sand-300 dark:hover:bg-sand-800"
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className="h-4 w-4 shrink-0"
                          strokeWidth={isActive ? 2.25 : 2}
                        />
                        {item.label}
                        {(item.badge ?? 0) > 0 && (
                          <span
                            className={`ml-auto grid h-5 min-w-5 place-items-center rounded-full px-1.5 text-[11px] font-bold tabular-nums ${
                              isActive
                                ? "bg-white/20 text-white"
                                : "bg-clay-100 text-clay-700 dark:bg-clay-500/15 dark:text-clay-300"
                            }`}
                          >
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
