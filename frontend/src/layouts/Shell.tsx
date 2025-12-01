import { Outlet, NavLink } from "react-router-dom";
import { LocateFixed, Sparkles, Menu } from "lucide-react";
import { useState } from "react";

const navItems = [
  { label: "Discover", path: "/" },
  { label: "Insights", path: "/insights" },
  { label: "AI Concierge", path: "/concierge" }
];

export default function ShellLayout() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-indigo-50 text-slate-900">
      <div className="border-b border-slate-200 bg-white/90 backdrop-blur sticky top-0 z-30">
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
                  `transition-colors ${isActive ? "text-brand-600" : "text-slate-500 hover:text-brand-500"}`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500">
            <Sparkles className="w-4 h-4 text-amber-500" />
            AI-assisted planning enabled
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
                  `block rounded-lg px-3 py-2 ${isActive ? "bg-brand-50 text-brand-700" : "text-slate-600"}`
                }
                onClick={() => setMenuOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>

      <main className="max-w-6xl mx-auto w-full px-6 py-10 flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-slate-200 bg-white/60 backdrop-blur py-6 text-center text-sm text-slate-500">
        Design & Implementation Template · Faculty of IT & AI · {new Date().getFullYear()}
      </footer>
    </div>
  );
}
