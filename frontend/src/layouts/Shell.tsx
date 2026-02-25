import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LocateFixed, Sparkles, Menu, Sun, Moon, X, Heart, BarChart3, MessageSquare, Home } from "lucide-react";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const navItems = [
  { label: "Discover", path: "/", icon: Home },
  { label: "Insights", path: "/insights", icon: BarChart3 },
  { label: "Favorites", path: "/favorites", icon: Heart },
  { label: "AI Concierge", path: "/concierge", icon: MessageSquare },
];

const getInitialTheme = (): "light" | "dark" => {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("ashgabat-theme") as "light" | "dark" | null;
    if (stored) return stored;
  }
  if (typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches) {
    return "dark";
  }
  return "dark";
};

export default function ShellLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    const initial = getInitialTheme();
    if (typeof document !== "undefined" && initial === "dark") {
      document.documentElement.classList.add("dark");
    }
    return initial;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("ashgabat-theme", theme);
  }, [theme]);

  // Scroll to top on route change
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [location.pathname]);

  // Close menu on route change
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Header */}
      <header className="border-b border-slate-200/80 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <NavLink to="/" className="flex items-center gap-2.5 text-xl font-bold group">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center shadow-md shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-shadow">
              <LocateFixed className="w-4.5 h-4.5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-slate-900 to-slate-600 dark:from-white dark:to-slate-300 bg-clip-text text-transparent">
              Restaurant Finder
            </span>
          </NavLink>

          <nav className="hidden md:flex gap-1 bg-slate-100/80 dark:bg-slate-800/60 rounded-full px-1.5 py-1">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === "/"}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    isActive
                      ? "bg-white dark:bg-slate-700 text-brand-600 dark:text-brand-300 shadow-sm"
                      : "text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span>AI enabled</span>
            </div>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === "light" ? (
                <>
                  <Moon className="w-3.5 h-3.5" /> Dark
                </>
              ) : (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" /> Light
                </>
              )}
            </button>
          </div>

          <button
            className="md:hidden p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation menu"
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-hidden border-t border-slate-100 dark:border-slate-800"
            >
              <div className="px-6 py-4 space-y-2">
                {navItems.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === "/"}
                    className={({ isActive }) =>
                      `flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors ${
                        isActive
                          ? "bg-brand-50 dark:bg-brand-500/10 text-brand-700 dark:text-brand-300"
                          : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4" />
                    {item.label}
                  </NavLink>
                ))}
                <button
                  type="button"
                  onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
                  className="flex items-center gap-3 rounded-xl w-full px-4 py-3 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                >
                  {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-300" />}
                  Toggle theme
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="max-w-6xl mx-auto w-full px-6 py-10 flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200/80 dark:border-slate-800/80 bg-white/60 dark:bg-slate-900/70 backdrop-blur py-8">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center">
              <LocateFixed className="w-3 h-3 text-white" />
            </div>
            <span className="text-sm font-semibold text-slate-600 dark:text-slate-400">Restaurant Finder</span>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Design & Implementation Template · Faculty of IT & AI · {new Date().getFullYear()}
          </p>
          <div className="flex gap-4 text-xs text-slate-400 dark:text-slate-500">
            <NavLink to="/admin/login" className="hover:text-brand-500 transition-colors">Admin Panel</NavLink>
          </div>
        </div>
      </footer>
    </div>
  );
}
