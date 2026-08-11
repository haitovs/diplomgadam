import { motion } from "framer-motion";
import { Compass } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";

export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <div className="grid min-h-screen place-items-center bg-gradient-to-b from-sand-50 to-clay-50 p-6 dark:from-sand-950 dark:to-sand-900">
      <motion.div
        className="glass-panel mx-auto max-w-lg space-y-5 p-10 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          className="mx-auto inline-flex h-20 w-20 items-center justify-center rounded-3xl border border-brand-200/50 bg-gradient-to-br from-brand-500/20 to-brand-600/10 dark:border-brand-500/30"
          animate={{ rotate: [0, -8, 8, -4, 4, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 1.2 }}
        >
          <Compass className="h-9 w-9 text-brand-500" />
        </motion.div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-sand-900 dark:text-white">
            {t("error_404_title")}
          </h1>
          <p className="text-sm text-sand-600 dark:text-sand-500">
            {t("error_404_text")}
          </p>
        </div>

        <Link to="/">
          <Button>{t("nav_discover")}</Button>
        </Link>
      </motion.div>
    </div>
  );
}
