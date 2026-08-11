import { AnimatePresence, motion } from "framer-motion";
import {
  BarChart3,
  Check,
  ChevronDown,
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
import { useFavorites } from "../store/useFavorites";

export default function ShellLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [langOpen, setLangOpen] = useState(false);
  const location = useLocation();
  const { t, lang, setLang } = useLanguage();
  const { theme, toggleTheme } = useTheme();

  /**
   * Favourites only appears once something has been saved.
   *
   * There are no visitor accounts by design, so favourites live in this
   * browser. A permanent nav item that is empty for every first-time visitor
   * is an invitation to a dead end; the heart on each card is what teaches the
   * feature, and the tab appears the moment it has something to show. The
   * route still works if someone navigates to it directly.
   */
  const savedCount = useFavorites((state) => state.slugs.length);

  const navItems = [
    { label: t("nav_discover"), path: "/", icon: Home },
    { label: t("nav_map"), path: "/map", icon: MapPin },
    { label: t("nav_insights"), path: "/insights", icon: BarChart3 },
    ...(savedCount > 0
      ? [
          {
            label: t("nav_favorites"),
            path: "/favorites",
            icon: Heart,
            count: savedCount,
          },
        ]
      : []),
  ];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    setMenuOpen(false);
    setLangOpen(false);
  }, [location.pathname]);

  // Escape closes the language menu, as a menu is expected to.
  useEffect(() => {
    if (!langOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setLangOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [langOpen]);

  /** The one prominent action in the header: shared by desktop and drawer. */
  const businessLinkClass =
    "inline-flex items-center justify-center gap-1.5 rounded-full border border-clay-200 bg-clay-50 font-semibold text-clay-700 transition-colors duration-200 hover:border-clay-300 hover:bg-clay-100 dark:border-clay-500/30 dark:bg-clay-500/10 dark:text-clay-300 dark:hover:bg-clay-500/20";

  const controlClass =
    "inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface-card)] px-3 py-1.5 text-xs font-semibold text-sand-700 transition-colors duration-200 hover:border-sand-400 hover:text-sand-900 dark:text-sand-300 dark:hover:bg-sand-800 dark:hover:text-sand-100";

  const footerLinkClass =
    "text-sm text-sand-600 transition-colors duration-200 hover:text-clay-700 dark:text-sand-400 dark:hover:text-clay-300";

  const footerHeadingClass =
    "text-xs font-bold uppercase tracking-[0.14em] text-sand-500 dark:text-sand-500";

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-[var(--surface-page)] text-sand-900 transition-colors dark:text-sand-100">
      <header className="sticky top-0 z-30 border-b border-[var(--border-subtle)] bg-[var(--surface-page)]/85 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          {/* Logo lockup: mark, serif wordmark, and the tagline set small and
              spaced beneath it — a masthead rather than a logo dropped in. */}
          <NavLink to="/" end className="group flex min-w-0 items-center gap-2.5">
            <img
              src={logo}
              alt=""
              className="h-9 w-9 shrink-0 rounded-xl shadow-soft transition-transform duration-300 ease-out-soft group-hover:-translate-y-0.5"
            />
            <span className="min-w-0">
              <span className="block truncate font-display text-xl font-semibold leading-none tracking-tight text-sand-900 transition-colors duration-200 group-hover:text-clay-700 dark:text-sand-50 dark:group-hover:text-clay-300">
                {t("brand_name")}
              </span>
              <span className="mt-1 hidden truncate text-[10px] font-semibold uppercase tracking-[0.16em] text-sand-500 sm:block">
                {t("brand_tagline")}
              </span>
            </span>
          </NavLink>

          {/* Desktop navigation. Text with a quiet accent rule under the current
              page, instead of a pill set that competes with the content. */}
          <nav className="mx-auto hidden items-center gap-0.5 md:flex">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `relative rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
                    isActive
                      ? "text-clay-700 dark:text-clay-300"
                      : "text-sand-600 hover:text-sand-900 dark:text-sand-400 dark:hover:text-sand-100"
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    {item.label}
                    <span
                      aria-hidden
                      className={`absolute inset-x-3 bottom-0.5 h-0.5 rounded-full bg-clay-500 transition-opacity duration-200 ${
                        isActive ? "opacity-100" : "opacity-0"
                      }`}
                    />
                  </>
                )}
              </NavLink>
            ))}
          </nav>

          <div className="hidden items-center gap-2 md:flex">
            <div className="relative">
              <button
                type="button"
                onClick={() => setLangOpen((v) => !v)}
                aria-haspopup="listbox"
                aria-expanded={langOpen}
                aria-label={`${t("language")}: ${LANG_LABELS[lang]}`}
                className={controlClass}
              >
                {LANG_SHORT[lang]}
                <ChevronDown
                  className={`h-3.5 w-3.5 text-sand-500 transition-transform duration-200 ${
                    langOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {langOpen && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    aria-hidden
                    onClick={() => setLangOpen(false)}
                  />
                  <ul
                    role="listbox"
                    aria-label={t("language")}
                    className="absolute right-0 z-40 mt-2 w-40 overflow-hidden rounded-card border border-[var(--border-subtle)] bg-[var(--surface-card)] p-1 shadow-lifted"
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
                          className={`flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors duration-200 ${
                            lang === code
                              ? "bg-clay-50 font-semibold text-clay-700 dark:bg-clay-500/10 dark:text-clay-300"
                              : "text-sand-700 hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-sand-800"
                          }`}
                        >
                          {LANG_LABELS[code]}
                          {lang === code && <Check className="h-3.5 w-3.5 shrink-0" />}
                        </button>
                      </li>
                    ))}
                  </ul>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={toggleTheme}
              aria-label={t("theme_toggle")}
              title={theme === "light" ? t("theme_dark") : t("theme_light")}
              className={`${controlClass} px-2.5`}
            >
              {theme === "light" ? (
                <Moon className="h-3.5 w-3.5" />
              ) : (
                <Sun className="h-3.5 w-3.5 text-clay-300" />
              )}
            </button>

            <span
              aria-hidden
              className="h-5 w-px bg-[var(--border-subtle)] lg:mx-1"
            />

            <NavLink to="/store" className={`${businessLinkClass} px-3.5 py-1.5 text-xs`}>
              <Store className="h-3.5 w-3.5" />
              {t("for_business")}
            </NavLink>
          </div>

          <button
            type="button"
            className="ml-auto rounded-xl p-2 text-sand-700 transition-colors duration-200 hover:bg-sand-200/70 md:hidden dark:text-sand-300 dark:hover:bg-sand-800/70"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="shell-mobile-nav"
            /* "Menu" is the right word for this control in all three
               languages; the dictionary has no separate navigation-menu key. */
            aria-label={menuOpen ? t("action_close") : t("portal_menu")}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              id="shell-mobile-nav"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden border-t border-[var(--border-subtle)] bg-[var(--surface-card)] md:hidden"
            >
              <div className="px-4 py-4">
                <div className="space-y-1">
                  {navItems.map((item) => (
                    <NavLink
                      key={item.path}
                      to={item.path}
                      end={item.path === "/"}
                      className={({ isActive }) =>
                        `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors duration-200 ${
                          isActive
                            ? "bg-clay-50 text-clay-700 dark:bg-clay-500/10 dark:text-clay-300"
                            : "text-sand-700 hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-sand-800"
                        }`
                      }
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {item.label}
                    </NavLink>
                  ))}
                </div>

                <div className="mt-5 space-y-5 border-t border-[var(--border-subtle)] pt-5">
                  <NavLink
                    to="/store"
                    className={`${businessLinkClass} w-full px-4 py-2.5 text-sm`}
                  >
                    <Store className="h-4 w-4" />
                    {t("for_business")}
                  </NavLink>

                  <div className="space-y-2">
                    <span className={`block ${footerHeadingClass}`}>{t("language")}</span>
                    <div className="flex gap-1.5">
                      {LANGS.map((code) => (
                        <button
                          key={code}
                          type="button"
                          onClick={() => setLang(code)}
                          aria-pressed={lang === code}
                          className={`flex-1 rounded-lg border px-2 py-2 text-xs font-semibold transition-colors duration-200 ${
                            lang === code
                              ? "border-clay-600 bg-clay-600 text-white"
                              : "border-[var(--border-subtle)] bg-[var(--surface-card)] text-sand-700 dark:text-sand-300"
                          }`}
                        >
                          {LANG_SHORT[code]}
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={toggleTheme}
                    className="flex w-full items-center gap-3 rounded-xl border border-[var(--border-subtle)] px-4 py-3 text-sm font-medium text-sand-700 transition-colors duration-200 hover:bg-sand-100 dark:text-sand-300 dark:hover:bg-sand-800"
                  >
                    {theme === "light" ? (
                      <Moon className="h-4 w-4" />
                    ) : (
                      <Sun className="h-4 w-4 text-clay-300" />
                    )}
                    {theme === "light" ? t("theme_dark") : t("theme_light")}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-10">
        <Outlet />
      </main>

      {/* Footer as a small masthead plus two link columns, so it reads as the
          end of a publication rather than a leftover strip. */}
      <footer className="mt-8 border-t border-[var(--border-subtle)] surface-sunken">
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-12">
          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-[1.6fr,1fr,1fr] lg:gap-10">
            <div className="max-w-sm">
              <NavLink to="/" end className="group inline-flex items-center gap-2.5">
                <img src={logo} alt="" className="h-8 w-8 rounded-lg shadow-soft" />
                <span className="font-display text-lg font-semibold text-sand-900 transition-colors duration-200 group-hover:text-clay-700 dark:text-sand-50 dark:group-hover:text-clay-300">
                  {t("brand_name")}
                </span>
              </NavLink>
              <p className="mt-3 text-sm leading-relaxed text-sand-600 dark:text-sand-400">
                {t("footer_text")}
              </p>
            </div>

            <nav aria-label={t("nav_discover")} className="space-y-3">
              <h2 className={footerHeadingClass}>{t("nav_discover")}</h2>
              <ul className="space-y-2.5">
                {navItems.map((item) => (
                  <li key={item.path}>
                    <NavLink to={item.path} end={item.path === "/"} className={footerLinkClass}>
                      {item.label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </nav>

            <nav aria-label={t("for_business")} className="space-y-3">
              <h2 className={footerHeadingClass}>{t("for_business")}</h2>
              <ul className="space-y-2.5">
                <li>
                  <NavLink to="/store" className={footerLinkClass}>
                    {t("action_signin")}
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/store/register" className={footerLinkClass}>
                    {t("store_signup_title")}
                  </NavLink>
                </li>
              </ul>
            </nav>
          </div>

          <div className="mt-10 flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-6 text-xs text-sand-600 sm:flex-row sm:items-center sm:justify-between dark:text-sand-500">
            <p className="tabular-nums">
              © {new Date().getFullYear()} {t("brand_name")}
            </p>
            <p>{t("brand_tagline")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
