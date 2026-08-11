import { useQuery } from "@tanstack/react-query";
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
  Utensils,
} from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { publicApi } from "../api/public";
import MapView from "../components/MapView";
import { Badge, Button, Card, EmptyState, Spinner } from "../components/ui";
import { useLanguage } from "../i18n/LanguageContext";
import type { TranslationKey } from "../i18n/translations";
import { formatDate, formatPhone, formatPrice, socialUrl } from "../lib/format";
import { useFavorites } from "../store/useFavorites";

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

  // Group opening intervals by weekday so a split day renders on one row.
  const hoursByDay = Array.from({ length: 7 }, (_, weekday) =>
    store.hours.filter((h) => h.weekday === weekday),
  );

  return (
    <div className="space-y-6">
      <Link
        to="/"
        className="inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        {t("action_back")}
      </Link>

      <div className="relative overflow-hidden rounded-3xl bg-slate-100 dark:bg-slate-800">
        {store.cover ? (
          <picture>
            <source srcSet={store.cover.url} type="image/webp" />
            <img
              src={store.cover.urlJpeg}
              alt=""
              className="h-56 sm:h-80 w-full object-cover"
            />
          </picture>
        ) : (
          <div className="h-56 sm:h-80 grid place-items-center text-slate-300 dark:text-slate-600">
            <Utensils className="w-12 h-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-slate-950/20 to-transparent" />

        <div className="absolute inset-x-0 bottom-0 p-5 sm:p-7">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="space-y-2">
              <div className="flex flex-wrap gap-1.5">
                {store.temporarilyClosed ? (
                  <Badge tone="danger">{t("temporarily_closed")}</Badge>
                ) : store.openingSoon ? (
                  <Badge tone="info">{t("opening_soon")}</Badge>
                ) : (
                  <Badge tone={store.openNow ? "success" : "neutral"}>
                    {store.openNow ? t("open_now") : t("closed_now")}
                  </Badge>
                )}
                {store.categories.map((category) => (
                  <Badge key={category.slug}>
                    {category.icon} {category.name}
                  </Badge>
                ))}
              </div>
              <h1 className="text-2xl sm:text-4xl font-bold text-white drop-shadow">
                {store.name}
              </h1>
              <p className="flex items-center gap-1.5 text-sm text-white/85">
                <MapPin className="w-4 h-4" />
                {store.location.address}
                {store.location.neighborhood && ` · ${store.location.neighborhood}`}
              </p>
            </div>

            <Button
              variant="secondary"
              icon={
                <Heart
                  className={`w-4 h-4 ${isFavorite ? "fill-rose-500 text-rose-500" : ""}`}
                />
              }
              onClick={() => favorites.toggle(store.slug)}
            >
              {isFavorite ? t("favorite_remove") : t("favorite_add")}
            </Button>
          </div>
        </div>
      </div>

      {store.temporarilyClosed && store.closureNote && (
        <Card className="border-rose-200 dark:border-rose-500/30">
          <p className="text-sm text-rose-700 dark:text-rose-300">
            {store.closureNote}
          </p>
        </Card>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.6fr,1fr]">
        <div className="space-y-5">
          {store.description && (
            <Card>
              <p className="whitespace-pre-line text-slate-600 dark:text-slate-300">
                {store.description}
              </p>
            </Card>
          )}

          <Card>
            <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
              {t("detail_menu")}
            </h2>
            {store.menu.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("detail_no_menu")}
              </p>
            ) : (
              <div className="space-y-6">
                {store.menu.map((section) => (
                  <section key={section.id}>
                    <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                      {section.name}
                    </h3>
                    <ul className="space-y-3">
                      {section.items.map((item) => (
                        <li key={item.id} className="flex gap-3">
                          {item.image && (
                            <picture>
                              <source srcSet={item.image.thumbUrl} type="image/webp" />
                              <img
                                src={item.image.thumbUrlJpeg}
                                alt=""
                                loading="lazy"
                                className="h-16 w-16 shrink-0 rounded-xl object-cover"
                              />
                            </picture>
                          )}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-baseline justify-between gap-3">
                              <span className="font-semibold text-slate-800 dark:text-slate-100">
                                {item.name}
                              </span>
                              <span className="shrink-0 font-semibold text-slate-900 dark:text-white">
                                {formatPrice(item.priceMinor, lang)} {item.currency}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-sm text-slate-500 dark:text-slate-400">
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
          </Card>

          {store.gallery.length > 0 && (
            <Card>
              <h2 className="mb-4 text-lg font-bold text-slate-900 dark:text-white">
                {t("detail_gallery")}
              </h2>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {store.gallery.map((image) => (
                  <a
                    key={image.id}
                    href={image.url}
                    target="_blank"
                    rel="noreferrer"
                    className="overflow-hidden rounded-xl"
                  >
                    <picture>
                      <source srcSet={image.thumbUrl} type="image/webp" />
                      <img
                        src={image.thumbUrlJpeg}
                        alt=""
                        loading="lazy"
                        className="aspect-square w-full object-cover transition-transform hover:scale-105"
                      />
                    </picture>
                  </a>
                ))}
              </div>
            </Card>
          )}
        </div>

        <div className="space-y-5">
          <Card>
            <h2 className="mb-3 flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white">
              <Clock className="w-4 h-4" /> {t("detail_hours")}
            </h2>
            <ul className="space-y-1.5 text-sm">
              {hoursByDay.map((intervals, weekday) => (
                <li key={weekday} className="flex justify-between gap-3">
                  <span className="text-slate-500 dark:text-slate-400">
                    {t(`day_${weekday}` as TranslationKey)}
                  </span>
                  <span className="text-right font-medium text-slate-700 dark:text-slate-200">
                    {intervals.length === 0 || intervals.every((i) => i.isClosed)
                      ? t("day_closed")
                      : intervals
                          .filter((i) => !i.isClosed)
                          .map((i) => `${i.opens}–${i.closes}`)
                          .join(", ")}
                  </span>
                </li>
              ))}
            </ul>

            {store.specialHours.length > 0 && (
              <div className="mt-4 border-t border-slate-200 dark:border-slate-700 pt-3">
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
                  {t("detail_special_hours")}
                </h3>
                <ul className="space-y-1 text-sm">
                  {store.specialHours.map((entry) => (
                    <li key={entry.date} className="flex justify-between gap-3">
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatDate(entry.date, lang)}
                      </span>
                      <span className="text-right font-medium text-slate-700 dark:text-slate-200">
                        {entry.isClosed
                          ? t("day_closed")
                          : `${entry.opens}–${entry.closes}`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </Card>

          {contactLinks.length > 0 && (
            <Card>
              <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
                {t("detail_contact")}
              </h2>
              <ul className="space-y-2">
                {contactLinks.map((link) => (
                  <li key={link.href}>
                    <a
                      href={link.href}
                      target={link.href.startsWith("http") ? "_blank" : undefined}
                      rel="noreferrer"
                      className="flex items-center gap-2.5 text-sm text-slate-600 dark:text-slate-300 hover:text-brand-600 dark:hover:text-brand-300 transition-colors"
                    >
                      <link.icon className="w-4 h-4 shrink-0" />
                      <span className="truncate">{link.label}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card>
            <h2 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
              {t("detail_location")}
            </h2>
            {coords ? (
              <MapView
                className="h-56"
                center={[coords.lng, coords.lat]}
                zoom={15}
                markers={[
                  { id: store.id, lng: coords.lng, lat: coords.lat, label: store.name },
                ]}
              />
            ) : (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t("map_no_location")}
              </p>
            )}
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
              {store.location.address}
            </p>
          </Card>

          <Card>
            <div className="space-y-3 text-sm">
              {services.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
                    {t("form_service_options")}
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {services.map((service) => (
                      <Badge key={service} tone="info">
                        {service}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              {store.amenities.length > 0 && (
                <div>
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
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
                  <h3 className="mb-1.5 text-xs font-bold uppercase tracking-wide text-slate-500">
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
                <div className="flex flex-wrap gap-3 pt-1 text-slate-600 dark:text-slate-300">
                  {store.service.capacity && (
                    <span className="flex items-center gap-1.5">
                      <Users className="w-4 h-4" />
                      {store.service.capacity} {t("detail_capacity")}
                    </span>
                  )}
                  {store.service.banquetHall && <span>· {t("detail_banquet")}</span>}
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
