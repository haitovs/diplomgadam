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
 * opening hours, categories and owner accounts. Photos are not seeded — the
 * demo data references stock images that are not ours to publish, and listings
 * render a placeholder without them.
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

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../../../data");

const SEED_PASSWORD = "DemoOwnerPass1!";

interface DemoRestaurant {
  id: string;
  name: string;
  description: string;
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

  const restaurants: DemoRestaurant[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "restaurants.json"), "utf-8"),
  );
  const menu: DemoMenuItem[] = JSON.parse(
    fs.readFileSync(path.join(dataDir, "menu-items.json"), "utf-8"),
  );

  const categoryRows = await db
    .select({ id: categories.id, slug: categories.slug })
    .from(categories);
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

    // Map the demo cuisine names onto seeded categories where they line up.
    const matched = demo.cuisines
      .map((name) => categoryBySlug.get(slugify(name)))
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

      await db.insert(menuItems).values(
        sectionItems.map((item, itemIndex) => ({
          storeId: store.id,
          sectionId: section.id,
          name: { tk: item.name },
          description: { tk: item.description ?? "" },
          // The demo data holds whole manat; the column is integer tenge.
          priceMinor: Math.round(item.price * 100),
          sortOrder: itemIndex,
        })),
      );
    }
  }

  console.log(`Seeded ${restaurants.length} restaurants with menus and hours.`);
  console.log(`Owner accounts use the password: ${SEED_PASSWORD}`);
  console.log("Photos are not seeded; listings show a placeholder image.");
}

main()
  .then(() => closeDb())
  .then(() => process.exit(0))
  .catch(async (err) => {
    console.error("Seeding failed:", err);
    await closeDb().catch(() => undefined);
    process.exit(1);
  });
