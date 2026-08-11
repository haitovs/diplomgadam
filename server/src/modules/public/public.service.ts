import { and, asc, desc, eq, inArray, or, sql, type SQL } from "drizzle-orm";
import { db } from "../../db/client.js";
import {
  categories,
  media,
  menuItems,
  menuSections,
  storeCategories,
  storeHours,
  storeSpecialHours,
  stores,
  type Lang,
} from "../../db/schema.js";
import { notFound } from "../../lib/errors.js";
import { pickLocalized } from "../../lib/i18n.js";
import { serialiseMedia } from "../media/media.service.js";
import { isOpenNow, localNow } from "./opening-hours.js";

export interface PublicListQuery {
  lang: Lang;
  search?: string;
  category?: string;
  neighborhood?: string;
  priceTier?: string;
  amenities?: string[];
  openNow?: boolean;
  sort: "name" | "newest" | "popular";
  page: number;
  perPage: number;
}

/** Only approved listings are ever visible to the public. */
const publiclyVisible = () => eq(stores.status, "approved");

export async function listPublicStores(query: PublicListQuery) {
  const filters: SQL[] = [publiclyVisible()];

  if (query.search) {
    const term = `%${query.search}%`;
    filters.push(
      or(
        sql`${stores.name}::text ILIKE ${term}`,
        sql`${stores.description}::text ILIKE ${term}`,
        sql`${stores.address}::text ILIKE ${term}`,
      )!,
    );
  }
  if (query.neighborhood) filters.push(eq(stores.neighborhood, query.neighborhood));
  if (query.priceTier) filters.push(eq(stores.priceTier, query.priceTier));

  if (query.category) {
    filters.push(
      sql`exists (
        select 1 from ${storeCategories}
        join ${categories} on ${categories.id} = ${storeCategories.categoryId}
        where ${storeCategories.storeId} = ${stores.id}
          and ${categories.slug} = ${query.category}
      )`,
    );
  }

  if (query.amenities && query.amenities.length > 0) {
    // Every requested amenity must be present, not just one of them.
    filters.push(sql`${stores.amenities} @> ${JSON.stringify(query.amenities)}::jsonb`);
  }

  const rows = await db
    .select({
      id: stores.id,
      slug: stores.slug,
      primaryLang: stores.primaryLang,
      name: stores.name,
      description: stores.description,
      address: stores.address,
      neighborhood: stores.neighborhood,
      city: stores.city,
      lat: stores.lat,
      lng: stores.lng,
      priceTier: stores.priceTier,
      phone: stores.phone,
      amenities: stores.amenities,
      dineIn: stores.dineIn,
      takeaway: stores.takeaway,
      delivery: stores.delivery,
      temporarilyClosed: stores.temporarilyClosed,
      openingSoon: stores.openingSoon,
      views: stores.views,
      createdAt: stores.createdAt,
    })
    .from(stores)
    .where(and(...filters))
    .orderBy(
      query.sort === "name"
        ? asc(sql`${stores.name} ->> ${query.lang}`)
        : query.sort === "popular"
          ? desc(stores.views)
          : desc(stores.createdAt),
    );

  const ids = rows.map((r) => r.id);
  const [hours, specials, covers, cats] = await Promise.all([
    ids.length
      ? db.select().from(storeHours).where(inArray(storeHours.storeId, ids))
      : [],
    ids.length
      ? db
          .select()
          .from(storeSpecialHours)
          .where(inArray(storeSpecialHours.storeId, ids))
      : [],
    ids.length
      ? db
          .select()
          .from(media)
          .where(and(inArray(media.storeId, ids), eq(media.kind, "cover")))
      : [],
    ids.length
      ? db
          .select({
            storeId: storeCategories.storeId,
            slug: categories.slug,
            name: categories.name,
            icon: categories.icon,
          })
          .from(storeCategories)
          .innerJoin(categories, eq(storeCategories.categoryId, categories.id))
          .where(inArray(storeCategories.storeId, ids))
          .orderBy(asc(categories.sortOrder))
      : [],
  ]);

  const now = localNow();

  let items = rows.map((row) => {
    const storeHoursRows = hours.filter((h) => h.storeId === row.id);
    const storeSpecials = specials.filter((s) => s.storeId === row.id);
    const cover = covers.find((c) => c.storeId === row.id);
    const primaryLang = row.primaryLang as Lang;

    return {
      id: row.id,
      slug: row.slug,
      name: pickLocalized(row.name, query.lang, primaryLang),
      description: pickLocalized(row.description, query.lang, primaryLang),
      address: pickLocalized(row.address, query.lang, primaryLang),
      neighborhood: row.neighborhood,
      city: row.city,
      coordinates: row.lat !== null && row.lng !== null
        ? { lat: row.lat, lng: row.lng }
        : null,
      priceTier: row.priceTier,
      phone: row.phone,
      amenities: row.amenities,
      service: { dineIn: row.dineIn, takeaway: row.takeaway, delivery: row.delivery },
      temporarilyClosed: row.temporarilyClosed,
      openingSoon: row.openingSoon,
      openNow: isOpenNow(storeHoursRows, storeSpecials, row.temporarilyClosed, now),
      cover: cover ? serialiseMedia(cover) : null,
      categories: cats
        .filter((c) => c.storeId === row.id)
        .map((c) => ({
          slug: c.slug,
          name: pickLocalized(c.name, query.lang, query.lang),
          icon: c.icon,
        })),
      views: row.views,
      createdAt: row.createdAt,
    };
  });

  // "Open now" depends on wall-clock time and per-day intervals, so it is
  // resolved here rather than in SQL. The city has hundreds of listings, not
  // millions, so filtering the matched set in memory is comfortably cheap.
  if (query.openNow) items = items.filter((i) => i.openNow);

  const total = items.length;
  const start = (query.page - 1) * query.perPage;

  return {
    stores: items.slice(start, start + query.perPage),
    total,
    page: query.page,
    perPage: query.perPage,
  };
}

export async function getPublicStore(slug: string, lang: Lang) {
  const [store] = await db
    .select()
    .from(stores)
    .where(and(eq(stores.slug, slug), publiclyVisible()))
    .limit(1);

  if (!store) throw notFound("Restaurant not found");

  const primaryLang = store.primaryLang as Lang;

  const [hours, specials, images, cats, sections, items] = await Promise.all([
    db
      .select()
      .from(storeHours)
      .where(eq(storeHours.storeId, store.id))
      .orderBy(asc(storeHours.weekday), asc(storeHours.opens)),
    db
      .select()
      .from(storeSpecialHours)
      .where(eq(storeSpecialHours.storeId, store.id))
      .orderBy(asc(storeSpecialHours.date)),
    db
      .select()
      .from(media)
      .where(
        and(
          eq(media.storeId, store.id),
          inArray(media.kind, ["cover", "gallery", "menu_item"]),
        ),
      )
      .orderBy(asc(media.sortOrder)),
    db
      .select({ slug: categories.slug, name: categories.name, icon: categories.icon })
      .from(storeCategories)
      .innerJoin(categories, eq(storeCategories.categoryId, categories.id))
      .where(eq(storeCategories.storeId, store.id))
      .orderBy(asc(categories.sortOrder)),
    db
      .select()
      .from(menuSections)
      .where(eq(menuSections.storeId, store.id))
      .orderBy(asc(menuSections.sortOrder)),
    db
      .select()
      .from(menuItems)
      .where(
        and(eq(menuItems.storeId, store.id), eq(menuItems.isAvailable, true)),
      )
      .orderBy(asc(menuItems.sortOrder)),
  ]);

  const imagesById = new Map(images.map((i) => [i.id, i]));
  const cover = images.find((i) => i.kind === "cover");

  return {
    id: store.id,
    slug: store.slug,
    primaryLang,
    name: pickLocalized(store.name, lang, primaryLang),
    description: pickLocalized(store.description, lang, primaryLang),
    location: {
      address: pickLocalized(store.address, lang, primaryLang),
      neighborhood: store.neighborhood,
      city: store.city,
      coordinates:
        store.lat !== null && store.lng !== null
          ? { lat: store.lat, lng: store.lng }
          : null,
    },
    contact: {
      phone: store.phone,
      phoneSecondary: store.phoneSecondary,
      website: store.website,
      instagram: store.instagram,
      tiktok: store.tiktok,
      telegram: store.telegram,
      whatsapp: store.whatsapp,
      reservationPhone: store.reservationPhone,
      deliveryPhone: store.deliveryPhone,
    },
    priceTier: store.priceTier,
    service: {
      dineIn: store.dineIn,
      takeaway: store.takeaway,
      delivery: store.delivery,
      banquetHall: store.banquetHall,
      capacity: store.capacity,
    },
    amenities: store.amenities,
    paymentMethods: store.paymentMethods,
    temporarilyClosed: store.temporarilyClosed,
    closureNote: pickLocalized(store.closureNote, lang, primaryLang),
    openingSoon: store.openingSoon,
    openNow: isOpenNow(hours, specials, store.temporarilyClosed),
    hours: hours.map((h) => ({
      weekday: h.weekday,
      isClosed: h.isClosed,
      opens: h.opens,
      closes: h.closes,
    })),
    specialHours: specials.map((s) => ({
      date: s.date,
      isClosed: s.isClosed,
      opens: s.opens,
      closes: s.closes,
      note: pickLocalized(s.note, lang, primaryLang),
    })),
    categories: cats.map((c) => ({
      slug: c.slug,
      name: pickLocalized(c.name, lang, lang),
      icon: c.icon,
    })),
    cover: cover ? serialiseMedia(cover) : null,
    gallery: images.filter((i) => i.kind === "gallery").map(serialiseMedia),
    menu: sections.map((section) => ({
      id: section.id,
      name: pickLocalized(section.name, lang, primaryLang),
      items: items
        .filter((item) => item.sectionId === section.id)
        .map((item) => {
          const image = item.mediaId ? imagesById.get(item.mediaId) : undefined;
          return {
            id: item.id,
            name: pickLocalized(item.name, lang, primaryLang),
            description: pickLocalized(item.description, lang, primaryLang),
            priceMinor: item.priceMinor,
            currency: item.currency,
            image: image ? serialiseMedia(image) : null,
          };
        }),
    })),
    views: store.views,
  };
}

/**
 * Counts a page view. Deliberately a fire-and-forget increment: a view counter
 * is not worth failing a page load over, and no per-visitor state is kept.
 */
export async function recordStoreView(slug: string): Promise<void> {
  await db
    .update(stores)
    .set({ views: sql`${stores.views} + 1` })
    .where(and(eq(stores.slug, slug), publiclyVisible()));
}

export async function listPublicCategories(lang: Lang) {
  /**
   * The counts are a separate aggregate rather than a correlated subquery.
   * Drizzle renders columns unqualified inside a raw `sql` template, so
   * `where category_id = id` lost its correlation to the outer row and every
   * category reported zero. A grouped query is both correct and one round trip.
   */
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
      })
      .from(categories)
      .orderBy(asc(categories.sortOrder)),
    db
      .select({
        categoryId: storeCategories.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(storeCategories)
      .innerJoin(stores, eq(stores.id, storeCategories.storeId))
      .where(publiclyVisible())
      .groupBy(storeCategories.categoryId),
  ]);

  const countByCategory = new Map(counts.map((c) => [c.categoryId, c.count]));

  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: pickLocalized(r.name, lang, lang),
    icon: r.icon,
    storeCount: countByCategory.get(r.id) ?? 0,
  }));
}

/** Distinct values the filter panel can offer, derived from live listings. */
export async function getFilterOptions() {
  const [neighborhoods, priceTiers] = await Promise.all([
    db
      .selectDistinct({ value: stores.neighborhood })
      .from(stores)
      .where(and(publiclyVisible(), sql`${stores.neighborhood} is not null`))
      .orderBy(asc(stores.neighborhood)),
    db
      .selectDistinct({ value: stores.priceTier })
      .from(stores)
      .where(publiclyVisible())
      .orderBy(asc(stores.priceTier)),
  ]);

  return {
    neighborhoods: neighborhoods.map((n) => n.value).filter(Boolean) as string[],
    priceTiers: priceTiers.map((p) => p.value),
  };
}

/**
 * Platform statistics computed from live data. With an empty database this
 * legitimately returns zeroes rather than inventing anything.
 */
export async function getInsights(lang: Lang) {
  const [
    [totals],
    byCategory,
    byNeighborhood,
    byPriceTier,
    mostViewed,
    newest,
  ] = await Promise.all([
    db
      .select({
        stores: sql<number>`count(*)::int`,
        withDelivery: sql<number>`count(*) filter (where ${stores.delivery})::int`,
        withBanquet: sql<number>`count(*) filter (where ${stores.banquetHall})::int`,
        totalViews: sql<number>`coalesce(sum(${stores.views}), 0)::int`,
      })
      .from(stores)
      .where(publiclyVisible()),
    db
      .select({
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
        count: sql<number>`count(${storeCategories.storeId})::int`,
      })
      .from(categories)
      .leftJoin(storeCategories, eq(storeCategories.categoryId, categories.id))
      .leftJoin(
        stores,
        and(eq(stores.id, storeCategories.storeId), publiclyVisible()),
      )
      .groupBy(categories.id, categories.slug, categories.name, categories.icon)
      .orderBy(desc(sql`count(${storeCategories.storeId})`)),
    db
      .select({
        neighborhood: stores.neighborhood,
        count: sql<number>`count(*)::int`,
      })
      .from(stores)
      .where(and(publiclyVisible(), sql`${stores.neighborhood} is not null`))
      .groupBy(stores.neighborhood)
      .orderBy(desc(sql`count(*)`)),
    db
      .select({ priceTier: stores.priceTier, count: sql<number>`count(*)::int` })
      .from(stores)
      .where(publiclyVisible())
      .groupBy(stores.priceTier)
      .orderBy(asc(stores.priceTier)),
    db
      .select({
        slug: stores.slug,
        name: stores.name,
        primaryLang: stores.primaryLang,
        views: stores.views,
      })
      .from(stores)
      .where(publiclyVisible())
      .orderBy(desc(stores.views))
      .limit(8),
    db
      .select({
        slug: stores.slug,
        name: stores.name,
        primaryLang: stores.primaryLang,
        createdAt: stores.createdAt,
      })
      .from(stores)
      .where(publiclyVisible())
      .orderBy(desc(stores.createdAt))
      .limit(8),
  ]);

  const [menuStats] = await db
    .select({
      items: sql<number>`count(*)::int`,
      avgPriceMinor: sql<number>`coalesce(round(avg(${menuItems.priceMinor})), 0)::int`,
      minPriceMinor: sql<number>`coalesce(min(${menuItems.priceMinor}), 0)::int`,
      maxPriceMinor: sql<number>`coalesce(max(${menuItems.priceMinor}), 0)::int`,
    })
    .from(menuItems)
    .innerJoin(stores, and(eq(stores.id, menuItems.storeId), publiclyVisible()));

  return {
    totals: { ...totals, menuItems: menuStats.items },
    menuPrices: {
      avgMinor: menuStats.avgPriceMinor,
      minMinor: menuStats.minPriceMinor,
      maxMinor: menuStats.maxPriceMinor,
    },
    byCategory: byCategory.map((c) => ({
      slug: c.slug,
      name: pickLocalized(c.name, lang, lang),
      icon: c.icon,
      count: c.count,
    })),
    byNeighborhood,
    byPriceTier,
    mostViewed: mostViewed.map((s) => ({
      slug: s.slug,
      name: pickLocalized(s.name, lang, s.primaryLang as Lang),
      views: s.views,
    })),
    newest: newest.map((s) => ({
      slug: s.slug,
      name: pickLocalized(s.name, lang, s.primaryLang as Lang),
      createdAt: s.createdAt,
    })),
  };
}
