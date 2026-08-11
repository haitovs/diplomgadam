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
} from "lucide-react";
import { NavLink, Navigate, Outlet, useNavigate } from "react-router-dom";
import { adminApi } from "../api/admin";
import logo from "../assets/logo.png";
import { Badge, Button, Spinner } from "../components/ui";
import { useAdminSession, useAdminSignOut } from "../hooks/useSessions";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGS, LANG_SHORT } from "../i18n/translations";
import { useTheme } from "../lib/useTheme";
import AdminChangePasswordGate from "../pages/admin/AdminChangePasswordGate";

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

  const navItems = [
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <header className="border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <img src={logo} alt="" className="w-8 h-8 rounded-lg" />
            <div>
              <p className="font-bold leading-tight">{t("admin_panel")}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {session.data.name} · {t(`admin_role_${session.data.role}`)}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
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
              loading={signOut.isPending}
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

      <div className="mx-auto flex max-w-7xl flex-col gap-5 px-4 py-5 sm:px-6 lg:flex-row">
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
                  {"badge" in item && (item.badge ?? 0) > 0 && (
                    <Badge tone="warning" className="ml-auto">
                      {item.badge}
                    </Badge>
                  )}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
