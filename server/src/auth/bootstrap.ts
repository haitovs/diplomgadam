import { sql } from "drizzle-orm";
import { config } from "../config/index.js";
import { db } from "../db/client.js";
import { admins, categories } from "../db/schema.js";
import { generateTemporaryPassword, hashPassword } from "./password.js";

/**
 * Creates the first administrator when none exists. The old code shipped a
 * hardcoded admin/admin account in plaintext; this generates a random password
 * instead, prints it exactly once, and forces a change at first sign-in.
 */
export async function ensureBootstrapAdmin(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(admins);

  if (count > 0) return;

  const supplied = config.BOOTSTRAP_ADMIN_PASSWORD;
  const password = supplied ?? generateTemporaryPassword();

  await db.insert(admins).values({
    username: config.BOOTSTRAP_ADMIN_USERNAME,
    passwordHash: await hashPassword(password),
    name: "Administrator",
    role: "owner",
    // A password chosen by the operator is theirs to keep; a generated one must
    // be replaced on first use.
    mustChangePassword: !supplied,
  });

  if (supplied) {
    console.log(
      `Created admin "${config.BOOTSTRAP_ADMIN_USERNAME}" using BOOTSTRAP_ADMIN_PASSWORD.`,
    );
  } else {
    console.log(
      [
        "",
        "═".repeat(64),
        "  FIRST RUN — administrator account created",
        `  username: ${config.BOOTSTRAP_ADMIN_USERNAME}`,
        `  password: ${password}`,
        "  This is shown once. You must change it at first sign-in.",
        "═".repeat(64),
        "",
      ].join("\n"),
    );
  }
}

/**
 * Cuisine taxonomy the platform starts with. Admins can add, rename or remove
 * these; they exist so the very first store owner has something to pick.
 */
const DEFAULT_CATEGORIES = [
  { slug: "turkmen-traditional", icon: "🍖", tk: "Türkmen milli", en: "Turkmen traditional", ru: "Туркменская кухня" },
  { slug: "pilaf-rice", icon: "🍚", tk: "Palaw we tüwi", en: "Pilaf & rice", ru: "Плов и рис" },
  { slug: "teahouse", icon: "🫖", tk: "Çaýhana", en: "Teahouse", ru: "Чайхана" },
  { slug: "turkish", icon: "🥙", tk: "Türk", en: "Turkish", ru: "Турецкая" },
  { slug: "international", icon: "🌍", tk: "Halkara", en: "International", ru: "Интернациональная" },
  { slug: "steakhouse", icon: "🥩", tk: "Steýkhaus", en: "Steakhouse", ru: "Стейк-хаус" },
  { slug: "seafood", icon: "🐟", tk: "Deňiz önümleri", en: "Seafood", ru: "Морепродукты" },
  { slug: "italian", icon: "🍝", tk: "Italýan", en: "Italian", ru: "Итальянская" },
  { slug: "european", icon: "🍷", tk: "Ýewropa", en: "European", ru: "Европейская" },
  { slug: "coffee-cafe", icon: "☕", tk: "Kofe we kafe", en: "Coffee & café", ru: "Кофе и кафе" },
  { slug: "bakery", icon: "🥐", tk: "Çörek öýi", en: "Bakery", ru: "Пекарня" },
  { slug: "asian", icon: "🍱", tk: "Aziýa tagamlary", en: "Asian", ru: "Азиатская" },
  { slug: "grill", icon: "🔥", tk: "Gril", en: "Grill", ru: "Гриль" },
  { slug: "fast-food", icon: "🍔", tk: "Çalt tagam", en: "Fast food", ru: "Фастфуд" },
  { slug: "fine-dining", icon: "🥂", tk: "Kaşaň nahar", en: "Fine dining", ru: "Высокая кухня" },
  { slug: "modern-turkmen", icon: "✨", tk: "Häzirki zaman türkmen", en: "Modern Turkmen", ru: "Современная туркменская" },
];

export async function ensureDefaultCategories(): Promise<void> {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(categories);

  if (count > 0) return;

  await db.insert(categories).values(
    DEFAULT_CATEGORIES.map((c, index) => ({
      slug: c.slug,
      name: { tk: c.tk, en: c.en, ru: c.ru },
      icon: c.icon,
      sortOrder: index,
    })),
  );

  console.log(`Seeded ${DEFAULT_CATEGORIES.length} cuisine categories.`);
}
