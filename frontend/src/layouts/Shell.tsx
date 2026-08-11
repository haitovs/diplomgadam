import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Globe,
  Heart,
  Home,
  MapPin,
  Menu,
  Moon,
  Store,
  Sun,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import logo from "../assets/logo.svg";
import { useLanguage } from "../i18n/LanguageContext";
import { LANGS, LANG_LABELS, LANG_SHORT } from "../i18n/translations";
import { useTheme } from "../lib/useTheme";

export default function ShellLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { label: t("nav_discover"), path: "/", icon: Home },
    { label: t("nav_map"), path: "/map", icon: MapPin },
    { label: t("nav_insights"), path: "/insights", icon: BarChart3 },
    { label: t("nav_favorites"), path: "/favorites", icon: Heart },
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMenuOpen(false);
    setLangOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-sand-50 to-clay-50 dark:from-sand-950 dark:via-sand-950 dark:to-sand-900 text-sand-900 dark:text-sand-100 transition-colors overflow-x-hidden">
      <header className="sticky top-0 z-30 border-b border-sand-200/80 dark:border-sand-800/80 bg-white/80 dark:bg-sand-900/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <NavLink to="/" className="group flex items-center gap-2.5 text-xl font-bold">
            <img
              src={logo}
              alt=""
              className="w-8 h-8 rounded-lg shadow-md shadow-brand-500/20"
            />
            <span className="bg-gradient-to-r from-sand-900 to-sand-600 dark:from-white dark:to-sand-300 bg-clip-text text-transparent">
              {t("brand_name")}
            </span>
          </NavLink>

          <nav className="hidden md:flex gap-1 rounded-full bg-sand-100/80 dark:bg-sand-800/60 px-1.5 py-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium transition-all ${
                    isActive
                      ? "bg-white dark:bg-sand-700 text-brand-600 dark:text-brand-300 shadow-sm"
                      : "text-sand-600 dark:text-sand-500 hover:text-sand-800 dark:hover:text-sand-200"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <NavLink
              to="/store"
              className="inline-flex items-center gap-1.5 rounded-full border border-sand-200 dark:border-sand-700 px-3 py-1.5 text-xs font-semibold text-sand-600 dark:text-sand-200 hover:bg-sand-50 dark:hover:bg-sand-800 transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              {t("for_business")}
            </NavLink>

            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                className="inline-flex items-center gap-1.5 rounded-full border border-sand-200 dark:border-sand-700 px-3 py-1.5 text-xs font-semibold text-sand-600 dark:text-sand-200 hover:bg-sand-50 dark:hover:bg-sand-800 transition-colors"
              >
                <Globe className="w-3.5 h-3.5" />
                {LANG_SHORT[lang]}
              </button>
              {langOpen && (
                <ul
                  role="listbox"
                  className="absolute right-0 z-40 mt-1.5 w-36 overflow-hidden rounded-xl border border-sand-200 dark:border-sand-700 bg-white dark:bg-sand-800 shadow-lg"
                >
                  {LANGS.map((code) => (
                    <li key={code}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={lang === code}
                        onClick={() => {
                          setLang(code);
                          setLangOpen(false);
                        }}
                        className={`block w-full px-3.5 py-2 text-left text-sm transition-colors ${
                          lang === code
                            ? "bg-brand-50 dark:bg-brand-500/10 font-semibold text-brand-700 dark:text-brand-300"
                            : "text-sand-600 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-700"
                        }`}
                      >
                        {LANG_LABELS[code]}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t("theme_toggle")}
              className="inline-flex items-center gap-1.5 rounded-full border border-sand-200 dark:border-sand-700 px-3 py-1.5 text-xs font-semibold text-sand-600 dark:text-sand-200 hover:bg-sand-50 dark:hover:bg-sand-800 transition-colors"
            >
              {theme === "light" ? (
                <Moon className="w-3.5 h-3.5" />
              ) : (
                <Sun className="w-3.5 h-3.5 text-amber-400" />
              )}
            </button>
          </div>

          <button
            className="md:hidden rounded-lg p-2 hover:bg-sand-100 dark:hover:bg-sand-800 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label={t("nav_discover")}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-sand-100 dark:border-sand-800"
            >
              <div className="space-y-1.5 px-4 py-4">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300"
                          : "text-sand-600 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-800"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}

                <NavLink
                  to="/store"
                  className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sand-600 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-800"
                >
                  <Store className="w-4 h-4" />
                  {t("for_business")}
                </NavLink>

                <div className="flex gap-1.5 px-4 pt-2">
                  {LANGS.map((code) => (
                    <button
                      key={code}
                      type="button"
                      onClick={() => setLang(code)}
                      className={`flex-1 rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${
                        lang === code
                          ? "bg-brand-500 text-white"
                          : "bg-sand-100 dark:bg-sand-800 text-sand-600 dark:text-sand-300"
                      }`}
                    >
                      {LANG_SHORT[code]}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={toggleTheme}
                  className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-sand-600 dark:text-sand-300 hover:bg-sand-50 dark:hover:bg-sand-800"
                >
                  {theme === "light" ? (
                    <Moon className="w-4 h-4" />
                  ) : (
                    <Sun className="w-4 h-4 text-amber-300" />
                  )}
                  {t("theme_toggle")}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      <footer className="border-t border-sand-200/80 dark:border-sand-800/80 bg-white/60 dark:bg-sand-900/70 py-6 backdrop-blur sm:py-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-4 text-center sm:px-6 md:flex-row md:text-left">
          <div className="flex items-center gap-2">
            <img src={logo} alt="" className="w-6 h-6 rounded-md" />
            <span className="text-sm font-semibold text-sand-600 dark:text-sand-500">
              {t("brand_name")}
            </span>
          </div>
          <p className="text-sm text-sand-600 dark:text-sand-500">
            {t("footer_text")} · {new Date().getFullYear()}
          </p>
          <NavLink
            to="/store"
            className="text-sm font-medium text-sand-600 hover:text-brand-600 dark:text-sand-500 dark:hover:text-brand-300"
          >
            {t("for_business")}
          </NavLink>
        </div>
      </footer>
    </div>
  );
}
