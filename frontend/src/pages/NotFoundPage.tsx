import { motion } from "framer-motion";
import { Compass, MapPin, Search } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "../assets/logo.svg";
import { Button } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";

/**
 * Rendered outside the site shell, so it carries its own wordmark and its own
 * ground. Composed as a short editorial page rather than a dialog: a large
 * numeral set in the display face, the apology beneath it, and two clear ways
 * back into the site.
 */
export default function NotFoundPage() {
  const { t } = useLanguage();

  return (
    <div className="relative grid min-h-screen grid-rows-[auto_1fr] overflow-hidden bg-[var(--surface-page)] px-5 py-6 sm:px-8">
      {/* Two soft washes of the accent, the same warmth as the home hero. */}
      <div
        aria-hidden
        className="pointer-events-none absolute -left-24 -top-32 h-96 w-96 rounded-full bg-clay-100/70 blur-3xl dark:bg-clay-900/20"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-40 -right-24 h-96 w-96 rounded-full bg-sand-200/80 blur-3xl dark:bg-sand-900/60"
      />

      <header className="relative">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <img src={logo} alt="" className="h-8 w-8 rounded-lg" />
          <span className="font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
            {t("brand_name")}
          </span>
        </Link>
      </header>

      <main className="relative grid place-items-center py-10">
        <motion.div
          className="w-full max-w-xl text-center"
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        >
          <span className="relative inline-grid h-20 w-20 place-items-center rounded-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-soft">
            <Compass
              className="h-9 w-9 text-clay-600 dark:text-clay-400"
              strokeWidth={1.5}
              aria-hidden="true"
            />
          </span>

          <p
            aria-hidden="true"
            className="mt-8 font-display text-display-xl font-semibold leading-none tabular-nums text-clay-200 dark:text-sand-800"
          >
            404
          </p>

          <h1 className="mt-5 font-display text-display-sm font-semibold leading-tight text-sand-900 sm:text-display-md dark:text-sand-50">
            {t("error_404_title")}
          </h1>
          <p className="mx-auto mt-4 max-w-md text-base leading-relaxed text-sand-700 dark:text-sand-300">
            {t("error_404_text")}
          </p>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Link to="/">
              <Button size="lg" icon={<Search className="h-4 w-4" />} className="w-full">
                {t("nav_discover")}
              </Button>
            </Link>
            <Link to="/map">
              <Button
                size="lg"
                variant="secondary"
                icon={<MapPin className="h-4 w-4" />}
                className="w-full"
              >
                {t("nav_map")}
              </Button>
            </Link>
          </div>

          <p className="mt-10 text-xs text-sand-600 dark:text-sand-500">
            {t("brand_tagline")}
          </p>
        </motion.div>
      </main>
    </div>
  );
}
