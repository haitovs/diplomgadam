import { useCallback, useEffect, useState } from "react";

type Theme = "light" | "dark";

const STORAGE_KEY = "tagam-theme";

function initialTheme(): Theme {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "light" || stored === "dark") return stored;
  }
  // Light is the designed default. The operating system preference is
  // deliberately not consulted: the site is built around cream surfaces and
  // food photography, and a visitor whose laptop is in dark mode should still
  // land on the intended presentation. Dark remains one click away.
  return "light";
}

/** Applies the theme class to <html> and remembers an explicit choice. */
export function useTheme() {
  const [theme, setTheme] = useState<Theme>(initialTheme);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    localStorage.setItem(STORAGE_KEY, theme);
  }, [theme]);

  const toggleTheme = useCallback(
    () => setTheme((current) => (current === "light" ? "dark" : "light")),
    [],
  );

  return { theme, setTheme, toggleTheme };
}
