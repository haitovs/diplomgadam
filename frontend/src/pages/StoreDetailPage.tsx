import { useQuery } from "@tanstack/react-query";
import { Suspense, lazy } from "react";
import {
  ArrowLeft,
  Clock,
  Globe,
  Heart,
  Instagram,
  MapPin,
  MessageCircle,
  Music2,
  Phone,
  Send,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { publicApi } from "../api/public";
import { Badge, Button, Card, EmptyState, Spinner } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { formatDate, formatPhone, formatPrice, socialUrl } from "../lib/format";
import { useFavorites } from "../store/useFavorites";

/*
 * The map arrives after the page rather than with it.
 *
 * A restaurant page is read for its photos, hours and menu; the location map is
 * one card near the bottom. MapLibre is larger than everything else on the page
 * put together, and importing it here statically pulled it into the bundle
 * served to every visitor of every page — including people who never scrolled
 * that far. Loaded on demand, the card fills in a moment later and nothing
 * above it waits.
 */
const MapView = lazy(() => import("../components/MapView"));

export default function StoreDetailPage() {
  const { slug = "" } = useParams();
  const { t, lang } = useLanguage();
  const favorites = useFavorites();

  const { data: store, isLoading, isError } = useQuery({
    queryKey: ["public-store", slug, lang],
    queryFn: () => publicApi.getStore(slug, lang),
    retry: false,
  });

  if (isLoading) return <Spinner />;
  if (isError || !store) {
    return (
      <EmptyState
        icon={<UtensilsCrossed className="h-6 w-6" />}
        title={t("detail_not_found")}
        action={
          <Link to="/">
            <Button variant="secondary">{t("action_back")}</Button>
          </Link>
        }
      />
    );
  }

  const isFavorite = favorites.slugs.includes(store.slug);
  const coords = store.location.coordinates;

  const contactLinks = [
    store.contact.phone && {
      icon: Phone,
      label: formatPhone(store.contact.phone),
      href: `tel:${store.contact.phone}`,
    },
    store.contact.website && {
      icon: Globe,
      label: store.contact.website.replace(/^https?:\/\//, ""),
      href: store.contact.website,
    },
    store.contact.instagram && {
      icon: Instagram,
      label: `@${store.contact.instagram}`,
      href: socialUrl.instagram(store.contact.instagram),
    },
    store.contact.telegram && {
      icon: Send,
      label: `@${store.contact.telegram}`,
      href: socialUrl.telegram(store.contact.telegram),
    },
    store.contact.whatsapp && {
      icon: MessageCircle,
      label: formatPhone(store.contact.whatsapp),
      href: socialUrl.whatsapp(store.contact.whatsapp),
    },
    store.contact.tiktok && {
      icon: Music2,
      label: `@${store.contact.tiktok}`,
      href: socialUrl.tiktok(store.contact.tiktok),
    },
  ].filter(Boolean) as { icon: typeof Phone; label: string; href: string }[];

  const services = [
    store.service.dineIn && t("service_dine_in"),
    store.service.takeaway && t("service_takeaway"),
    store.service.delivery && t("service_delivery"),
  ].filter(Boolean) as string[];

  // Grouped by weekday so a split day renders on one row.
  const hoursByDay = Array.from({ length: 7 }, (_, weekday) =>
    store.hours.filter((h) => h.weekday === weekday),
  );
  const todayIndex = (new Date().getDay() + 6) % 7;

  return (
    <div className="space-y-8">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-sand-600 transition-colors hover:text-clay-700 dark:text-sand-400 dark:hover:text-clay-300"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("action_back")}
      </Link>

      {/* Editorial hero: the photograph carries it, the scrim keeps the name
          legible whatever the image happens to be. */}
      <div className="photo-frame relative overflow-hidden rounded-panel">
        {store.cover ? (
          <picture>
            <source srcSet={store.cover.url} type="image/webp" />
            <img
              src={store.cover.urlJpeg}
              alt=""
              className="h-64 w-full object-cover sm:h-[26rem]"
            />
          </picture>
        ) : (
          <div className="grid h-64 w-full place-items-center bg-sand-200 text-sand-400 sm:h-[26rem] dark:bg-sand-800">
            <UtensilsCrossed className="h-12 w-12" strokeWidth={1.5} />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-8">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div className="min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-1.5">
                {store.temporarilyClosed ? (
                  <span className="rounded-full bg-red-700 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {t("temporarily_closed")}
                  </span>
                ) : store.openingSoon ? (
                  <span className="rounded-full bg-clay-600 px-2.5 py-1 text-[11px] font-semibold text-white">
                    {t("opening_soon")}
                  </span>
                ) : (
                  <span
                    className={`rounded-full px-2.5 py-1 text-[11px] font-semibold text-white ${
                      store.openNow ? "bg-emerald-700" : "bg-sand-900/85"
                    }`}
                  >
                    {store.openNow ? t("open_now") : t("closed_now")}
                  </span>
                )}
                {store.categories.map((category) => (
                  <span
                    key={category.slug}
                    className="rounded-full bg-white/20 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur-sm"
                  >
                    {category.icon} {category.name}
                  </span>
                ))}
              </div>

              <h1 className="font-display text-display-md font-semibold leading-[1.05] text-white drop-shadow-sm sm:text-display-lg">
                {store.name}
              </h1>

              <p className="flex items-center gap-1.5 text-sm text-white/90">
                <MapPin className="h-4 w-4 shrink-0" />
                <span className="truncate">
                  {store.location.address}
                  {store.location.neighborhood && ` · ${store.location.neighborhood}`}
                </span>
                <span className="ml-1 shrink-0 font-semibold">{store.priceTier}</span>
              </p>
            </div>

            <div className="flex gap-2">
              {store.contact.phone && (
                <a href={`tel:${store.contact.phone}`}>
                  <Button icon={<Phone className="h-4 w-4" />}>{t("detail_call")}</Button>
                </a>
              )}
              <Button
                variant="secondary"
                aria-label={isFavorite ? t("favorite_remove") : t("favorite_add")}
                icon={
                  <Heart
                    className={`h-4 w-4 ${isFavorite ? "fill-clay-600 text-clay-600" : ""}`}
                  />
                }
                onClick={() => favorites.toggle(store.slug)}
              >
                <span className="hidden sm:inline">
                  {isFavorite ? t("favorite_remove") : t("favorite_add")}
                </span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {store.temporarilyClosed && store.closureNote && (
        <div className="rounded-card border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10">
          <p className="text-sm text-red-800 dark:text-red-300">{store.closureNote}</p>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[1.65fr,1fr]">
        <div className="space-y-6">
          {store.description && (
            <p className="font-display text-lg leading-relaxed text-sand-800 sm:text-xl dark:text-sand-200">
              {store.description}
            </p>
          )}

          {/* The menu is the reason most people opened this page. */}
          <section>
            <h2 className="rule-accent mb-6 font-display text-2xl font-semibold text-sand-900 dark:text-sand-50">
              {t("detail_menu")}
            </h2>

            {store.menu.length === 0 ? (
              <p className="text-sm text-sand-600 dark:text-sand-500">
                {t("detail_no_menu")}
              </p>
            ) : (
              <div className="space-y-9">
                {store.menu.map((section) => (
                  <section key={section.id}>
                    <h3 className="mb-4 text-xs font-bold uppercase tracking-[0.14em] text-clay-700 dark:text-clay-400">
                      {section.name}
                    </h3>
                    <ul className="divide-y divide-[var(--border-subtle)]">
                      {section.items.map((item) => (
                        <li key={item.id} className="flex gap-4 py-4 first:pt-0">
                          {item.image && (
                            <picture>
                              <source srcSet={item.image.thumbUrl} type="image/webp" />
                              <img
                                src={item.image.thumbUrlJpeg}
                                alt=""
                                loading="lazy"
                                className="h-20 w-20 shrink-0 rounded-card object-cover"
                              />
                            </picture>
                          )}
                          <div className="flex min-w-0 flex-1 flex-col justify-center">
                            <div className="flex items-baseline gap-3">
                              <span className="font-medium text-sand-900 dark:text-sand-100">
                                {item.name}
                              </span>
                              {/* A dotted leader keeps the eye on the line all
                                  the way to the price, as a printed menu does. */}
                              <span className="mt-auto hidden h-px flex-1 border-b border-dotted border-sand-300 sm:block dark:border-sand-700" />
                              <span className="shrink-0 font-semibold tabular-nums text-sand-900 dark:text-sand-100">
                                {formatPrice(item.priceMinor, lang)}
                                <span className="ml-1 text-xs font-normal text-sand-500">
                                  {item.currency}
                                </span>
                              </span>
                            </div>
                            {item.description && (
                              <p className="mt-1 text-sm leading-relaxed text-sand-600 dark:text-sand-400">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </section>
                ))}
              </div>
            )}
          </section>

          {store.gallery.length > 0 && (
            <section>
              <h2 className="rule-accent mb-6 font-display text-2xl font-semibold text-sand-900 dark:text-sand-50">
                {t("detail_gallery")}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {store.gallery.map((image) => (
                  <a
                    key={image.id}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="photo-frame group aspect-square overflow-hidden rounded-card"
                  >
                    <picture>
                      <source srcSet={image.thumbUrl} type="image/webp" />
                      <img
                        src={image.thumbUrlJpeg}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
                      />
                    </picture>
                  </a>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Facts column. Sticky on wide screens so it stays with a long menu. */}
        <aside className="space-y-5 lg:sticky lg:top-24 lg:self-start">
          <Card>
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
              <Clock className="h-4 w-4 text-clay-600 dark:text-clay-400" />
              {t("detail_hours")}
            </h2>
            <ul className="space-y-1">
              {hoursByDay.map((intervals, weekday) => {
                const closed =
                  intervals.length === 0 || intervals.every((i) => i.isClosed);
                return (
                  <li
                    key={weekday}
                    className={`flex justify-between gap-3 rounded-lg px-2 py-1.5 text-sm ${
                      weekday === todayIndex
                        ? "bg-clay-50 font-semibold dark:bg-clay-500/10"
                        : ""
                    }`}
                  >
                    <span className="text-sand-600 dark:text-sand-400">
                      {t(`day_${weekday}` as TranslationKey)}
                    </span>
                    <span
                      className={`text-right tabular-nums ${
                        closed
                          ? "text-sand-500"
                          : "text-sand-900 dark:text-sand-100"
                      }`}
                    >
                      {closed
                        ? t("day_closed")
                        : intervals
                            .filter((i) => !i.isClosed)
                            .map((i) => `${i.opens}–${i.closes}`)
                            .join(", ")}
                    </span>
                  </li>
                );
              })}
            </ul>

            {store.specialHours.length > 0 && (
              <div className="mt-4 border-t border-[var(--border-subtle)] pt-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-sand-500">
                  {t("detail_special_hours")}
                </h3>
                <ul className="space-y-1 text-sm">
                  {store.specialHours.map((entry) => (
                    <li key={entry.date} className="flex justify-between gap-3">
                      <span className="text-sand-600 dark:text-sand-400">
                        {formatDate(entry.date, lang)}
                      </span>
                      <span className="text-right tabular-nums text-sand-900 dark:text-sand-100">
                        {entry.isClosed ? t("day_closed") : `${entry.opens}–${entry.closes}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {contactLinks.length > 0 && (
            <Card>
              <h2 className="mb-3 font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
                {t("detail_contact")}
              </h2>
              <ul className="space-y-1">
                {contactLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-2 text-sm text-sand-700 transition-colors hover:bg-sand-100 hover:text-clay-700 dark:text-sand-300 dark:hover:bg-sand-800 dark:hover:text-clay-300"
                    >
                      <link.icon className="h-4 w-4 shrink-0 text-sand-500" />
                      <span className="truncate">{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <h2 className="mb-3 font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
              {t("detail_location")}
            </h2>
            {coords ? (
              <>
                <Suspense
                  fallback={
                    <div className="h-52 animate-pulse rounded-xl bg-sand-200 dark:bg-sand-800" />
                  }
                >
                  <MapView
                    className="h-52"
                    center={[coords.lng, coords.lat]}
                    zoom={15}
                    markers={[
                      {
                        id: store.id,
                        lng: coords.lng,
                        lat: coords.lat,
                        label: store.name,
                      },
                    ]}
                  />
                </Suspense>
                <p className="mt-3 text-sm text-sand-700 dark:text-sand-300">
                  {store.location.address}
                </p>
              </>
            ) : (
              <p className="text-sm text-sand-600 dark:text-sand-500">
                {t("map_no_location")}
              </p>
            )}
          </Card>

          {(services.length > 0 ||
            store.amenities.length > 0 ||
            store.paymentMethods.length > 0) && (
            <Card>
              <div className="space-y-4">
                {services.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-sand-500">
                      {t("form_service_options")}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {services.map((service) => (
                        <Badge key={service} tone="accent">
                          {service}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {store.amenities.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-sand-500">
                      {t("detail_amenities")}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {store.amenities.map((amenity) => (
                        <Badge key={amenity}>
                          {t(`amenity_${amenity}` as TranslationKey)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {store.paymentMethods.length > 0 && (
                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-sand-500">
                      {t("detail_payment")}
                    </h3>
                    <div className="flex flex-wrap gap-1.5">
                      {store.paymentMethods.map((method) => (
                        <Badge key={method}>
                          {t(`payment_${method}` as TranslationKey)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {(store.service.capacity || store.service.banquetHall) && (
                  <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-[var(--border-subtle)] pt-3 text-sm text-sand-700 dark:text-sand-300">
                    {store.service.capacity && (
                      <span className="flex items-center gap-1.5">
                        <Users className="h-4 w-4 text-sand-500" />
                        <span className="tabular-nums">{store.service.capacity}</span>
                        {t("detail_capacity")}
                      </span>
                    )}
                    {store.service.banquetHall && <span>{t("detail_banquet")}</span>}
                  </div>
                )}
              </div>
            </Card>
          )}
        </aside>
      </div>
    </div>
  );
}
