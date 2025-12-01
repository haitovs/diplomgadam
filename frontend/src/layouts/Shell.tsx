import { Outlet, NavLink } from "react-router-dom";
import { LocateFixed, Sparkles, Menu, Sun, Moon } from "lucide-react";
import { useEffect, useState } from "react";

const navItems = [
  { label: "Discover", path: "/" },
  { label: "Insights", path: "/insights" },
  { label: "Favorites", path: "/favorites" },
  { label: "AI Concierge", path: "/concierge" }
];

export default function ShellLayout() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">(
    (typeof localStorage !== "undefined" && (localStorage.getItem("gadam-theme") as "light" | "dark")) || "light"
  );

  useEffect(() => {
    const root = document.documentElement;
    if (theme === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("gadam-theme", theme);
  }, [theme]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 text-slate-900 dark:text-slate-100">
      <div className="border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/80 backdrop-blur sticky top-0 z-30">
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-4">
          <NavLink to="/" className="flex items-center gap-2 text-xl font-semibold">
            <LocateFixed className="text-brand-600" />
            Gadam Eats
          </NavLink>
          <nav className="hidden md:flex gap-8 text-sm font-medium">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `transition-colors ${
                    isActive ? "text-brand-500 dark:text-brand-300" : "text-slate-500 dark:text-slate-400 hover:text-brand-400"
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
            <Sparkles className="w-4 h-4 text-amber-500" />
            <span>AI-assisted planning enabled</span>
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="ml-3 inline-flex items-center gap-1 rounded-full border border-slate-200 dark:border-slate-700 px-3 py-1 text-xs font-semibold text-slate-600 dark:text-slate-200"
            >
              {theme === "light" ? (
                <>
                  <Moon className="w-4 h-4" /> Dark
                </>
              ) : (
                <>
                  <Sun className="w-4 h-4 text-amber-400" /> Light
                </>
              )}
            </button>
          </div>
          <button className="md:hidden" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle navigation menu">
            <Menu />
          </button>
        </div>
        {menuOpen && (
          <div className="md:hidden px-6 pb-4 space-y-3">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `block rounded-lg px-3 py-2 ${
                    isActive ? "bg-brand-50 text-brand-700 dark:bg-slate-800 dark:text-brand-200" : "text-slate-600 dark:text-slate-300"
                  }`
                }
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-700 px-3 py-2 text-sm text-slate-600 dark:text-slate-200"
            >
              {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4 text-amber-300" />} Toggle theme
            </button>
          </div>
        )}
      </div>

      <main className="max-w-6xl mx-auto w-full px-6 py-10 flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-900/70 backdrop-blur py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Design & Implementation Template · Faculty of IT & AI · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
