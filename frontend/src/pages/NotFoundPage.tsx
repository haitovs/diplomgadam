import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Compass, ArrowLeft, Search } from "lucide-react";
import { useLanguage } from "../i18n/LanguageContext";

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <motion.div
      className="glass-panel p-10 md:p-16 text-center space-y-6 max-w-2xl mx-auto"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <motion.div
        className="inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-gradient-to-br from-brand-500/20 to-brand-600/10 border border-brand-200/50 dark:border-brand-500/30 mx-auto"
        animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
      >
        <Compass className="w-10 h-10 text-brand-500 dark:text-brand-400" />
      </motion.div>

      <h1 className="text-7xl md:text-8xl font-extrabold bg-gradient-to-br from-brand-600 to-brand-400 bg-clip-text text-transparent">
        404
      </h1>
      <p className="text-lg text-slate-600 dark:text-slate-300">{t("not_found_text")}</p>

      <div className="flex flex-wrap justify-center gap-3 pt-2">
        <Link
          to="/"
          className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-brand-600 to-brand-500 text-white px-5 py-2.5 text-sm font-semibold shadow-lg shadow-brand-600/30 hover:shadow-brand-500/50 hover:scale-[1.03] transition-all duration-200"
        >
          <ArrowLeft className="w-4 h-4" />
          {t("not_found_link")}
        </Link>
        <Link
          to="/map"
          className="inline-flex items-center gap-2 rounded-full border border-slate-200 dark:border-slate-700 px-5 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:border-brand-400 dark:hover:border-brand-500 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
        >
          <Search className="w-4 h-4" />
          {t("nav_map")}
        </Link>
      </div>
    </motion.div>
  );
}
