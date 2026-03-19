import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { translations, type Lang, type TranslationKey } from "./translations";

interface LanguageContextType {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    if (typeof localStorage !== "undefined") {
      const stored = localStorage.getItem("ashgabat-lang") as Lang | null;
      if (stored && (stored === "tk" || stored === "en")) return stored;
    }
    return "tk";
  });

  useEffect(() => {
    localStorage.setItem("ashgabat-lang", lang);
  }, [lang]);

  const setLang = (newLang: Lang) => setLangState(newLang);
  const t = (key: TranslationKey) => translations[lang][key] || translations.tk[key] || key;

  return (
    <LanguageContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
