/**
 * Development seed.
 *
 * Production ships with an empty database on purpose: every restaurant on the
 * live site is there because its owner registered it and an administrator
 * approved it. This script exists so a developer or a demo has something to
 * look at, and it refuses to run against anything that looks like production.
 *
 *   npm run db:seed
 *
 * It creates approved restaurants from data/restaurants.json with their menus,
 * opening hours, categories and owner accounts, and attaches the photographs
 * fetched by scripts/fetch-seed-images.mjs if they are present. Without them it
 * still runs; listings simply show a placeholder.
 */
import { sql } from "drizzle-orm";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { hashPassword } from "../auth/password.js";
import { ensureDefaultCategories } from "../auth/bootstrap.js";
import { config } from "../config/index.js";
import { closeDb, db } from "./client.js";
import {
  categories,
  menuItems,
  menuSections,
  storeCategories,
  storeHours,
  storeUsers,
  stores,
} from "./schema.js";
import { slugify } from "../lib/slug.js";
import { storeUpload } from "../modules/media/media.service.js";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../../../data");

const SEED_PASSWORD = "DemoOwnerPass1!";

interface DemoRestaurant {
  id: string;
  name: string;
  description: string;
  heroImage?: string;
  gallery?: string[];
  cuisines: string[];
  priceTier: string;
  location: {
    address: string;
    neighborhood: string;
    city: string;
    coordinates: { lat: number; lng: number };
  };
  contact: { phone: string; website: string | null };
  amenities: string[];
}

interface DemoMenuItem {
  restaurant_id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  image_url?: string;
}

const seedImagesDir = path.join(dataDir, "seed-images");

/**
 * Maps the demo data's original photo URLs to files on disk. Absent until
 * scripts/fetch-seed-images.mjs has been run, which is why every use of it is
 * optional.
 */
function loadImageManifest(): Record<string, string> {
  const manifestPath = path.join(seedImagesDir, "manifest.json");
  if (!fs.existsSync(manifestPath)) return {};
  try {
    return JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<string, string>;
  } catch {
    return {};
  }
}

/**
 * Pushes a demo photograph through the real upload pipeline, so seeded images
 * are processed, resized and recorded exactly like an owner's own upload
 * rather than being special-cased.
 */
async function attachImage(
  storeId: string,
  kind: "cover" | "gallery" | "menu_item",
  url: string | undefined,
  manifest: Record<string, string>,
): Promise<string | null> {
  if (!url) return null;
  const filename = manifest[url];
  if (!filename) return null;

  const file = path.join(seedImagesDir, filename);
  if (!fs.existsSync(file)) return null;

  try {
    const row = await storeUpload(storeId, kind, fs.readFileSync(file), filename);
    return row.id;
  } catch {
    // A single unreadable download must not abort the whole seed.
    return null;
  }
}

async function main(): Promise<void> {
  if (config.isProduction) {
    console.error("Refusing to seed a production environment.");
    process.exit(1);
  }

  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(stores);
  if (count > 0) {
    console.error(
      `The database already holds ${count} restaurant(s). Seeding would duplicate them.`,
    );
    console.error("Drop and recreate the database first if that is what you want.");
    process.exit(1);
  }

  await ensureDefaultCategories();

  const imageManifest = loadImageManifest();
  const imageCount = Object.keys(imageManifest).length;
  console.log(
    imageCount > 0
      ? `Found ${imageCount} demo photographs to attach.`
      : "No demo photographs found; run scripts/fetch-seed-images.mjs for images.",
  );

  const restaurants: DemoRestaurant[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "restaurants.json"), "utf-8"),
  );
  const menu: DemoMenuItem[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "menu-items.json"), "utf-8"),
  );

  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug, name: categories.name })
    .from(categories);

  // The demo data names cuisines in Turkmen, exactly as the seeded categories
  // are named, so matching on that is precise. Slugifying the Turkmen name
  // would not match the English-derived category slug, which previously
  // dumped every restaurant into a single cuisine.
  const categoryByTurkmenName = new Map(
    categoryRows
      .filter((c) => c.name?.tk)
      .map((c) => [c.name.tk!.toLocaleLowerCase("tk"), c.id]),
  );
  const categoryBySlug = new Map(categoryRows.map((c) => [c.slug, c.id]));

  const passwordHash = await hashPassword(SEED_PASSWORD);
  let phoneCounter = 65900000;

  for (const demo of restaurants) {
    const [store] = await db
      .insert(stores)
      .values({
        slug: slugify(demo.name) || demo.id,
        status: "approved",
        primaryLang: "tk",
        name: { tk: demo.name },
        description: { tk: demo.description },
        address: { tk: demo.location.address },
        city: demo.location.city,
        neighborhood: demo.location.neighborhood,
        lat: demo.location.coordinates.lat,
        lng: demo.location.coordinates.lng,
        priceTier: demo.priceTier,
        phone: demo.contact.phone,
        website: demo.contact.website,
        dineIn: true,
        takeaway: true,
        amenities: ["wifi", "parking", "halal"],
        paymentMethods: ["cash", "card"],
        submittedAt: new Date(),
        reviewedAt: new Date(),
      })
      .returning();

    await attachImage(store.id, "cover", demo.heroImage, imageManifest);
    for (const galleryUrl of (demo.gallery ?? []).slice(0, 4)) {
      await attachImage(store.id, "gallery", galleryUrl, imageManifest);
    }

    await db.insert(storeUsers).values({
      storeId: store.id,
      phone: `+993${phoneCounter++}`,
      passwordHash,
      fullName: `${demo.name} eýesi`,
      position: "Eýesi",
    });

    // Open every day, with Friday running past midnight so the demo exercises
    // the awkward case.
    await db.insert(storeHours).values(
      Array.from({ length: 7 }, (_, weekday) => ({
        storeId: store.id,
        weekday,
        isClosed: false,
        opens: "09:00",
        closes: weekday === 4 ? "02:00" : "23:00",
      })),
    );

    const matched = demo.cuisines
      .map(
        (name) =>
          categoryByTurkmenName.get(name.toLocaleLowerCase("tk")) ??
          categoryBySlug.get(slugify(name)),
      )
      .filter((id): id is string => Boolean(id));
    const chosen = matched.length > 0 ? matched : [categoryRows[0].id];
    await db
      .insert(storeCategories)
      .values([...new Set(chosen)].map((categoryId) => ({ storeId: store.id, categoryId })));

    const items = menu.filter((m) => m.restaurant_id === demo.id);
    const sectionNames = [...new Set(items.map((m) => m.category))];

    for (const [index, sectionName] of sectionNames.entries()) {
      const [section] = await db
        .insert(menuSections)
        .values({ storeId: store.id, name: { tk: sectionName }, sortOrder: index })
        .returning();

      const sectionItems = items.filter((m) => m.category === sectionName);
      if (sectionItems.length === 0) continue;

      for (const [itemIndex, item] of sectionItems.entries()) {
        const mediaId = await attachImage(
          store.id,
          "menu_item",
          item.image_url,
          imageManifest,
        );

        await db.insert(menuItems).values({
          storeId: store.id,
          sectionId: section.id,
          name: { tk: item.name },
          description: { tk: item.description ?? "" },
          // The demo data holds whole manat; the column is integer tenge.
          priceMinor: Math.round(item.price * 100),
          mediaId,
          sortOrder: itemIndex,
        });
      }
    }
  }

  console.log(`Seeded ${restaurants.length} restaurants with menus and hours.`);
  console.log(`Owner accounts use the password: ${SEED_PASSWORD}`);
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Seeding failed:", err);
    await closeDb().catch(() => undefined);
    process.exit(1);
  });
