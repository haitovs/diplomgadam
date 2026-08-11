import { sql } from "drizzle-orm";
import {
  boolean,
  date,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

/**
 * Supported content languages. `tk` is the ISO 639-1 code for Turkmen.
 * Every translatable column is a JSONB object keyed by these codes; only the
 * store's `primaryLang` is required, the rest fall back to it on read.
 */
export const LANGS = ["tk", "en", "ru"] as const;
export type Lang = (typeof LANGS)[number];
export type Localized = Partial<Record<Lang, string>>;

/**
 * `draft` exists so an owner has a store to hang venue photos and menu items
 * off before anything reaches a moderator: uploads need a store id, and the
 * admin queue should only ever show listings the owner considers finished.
 */
export const STORE_STATUSES = [
  "draft",
  "pending",
  "approved",
  "rejected",
  "suspended",
] as const;
export type StoreStatus = (typeof STORE_STATUSES)[number];

export const ADMIN_ROLES = ["owner", "moderator"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const MEDIA_KINDS = [
  "cover",
  "gallery",
  "menu_item",
  "venue_proof",
] as const;
export type MediaKind = (typeof MEDIA_KINDS)[number];

export const SUBJECT_TYPES = ["admin", "store_user"] as const;
export type SubjectType = (typeof SUBJECT_TYPES)[number];

const now = sql`now()`;

// ── Admins ───────────────────────────────────────────────────────────────────

export const admins = pgTable("admins", {
  id: uuid("id").primaryKey().defaultRandom(),
  username: text("username").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  role: text("role").notNull().default("moderator"),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").notNull().default(false),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(now),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .default(now),
});

// ── Stores ───────────────────────────────────────────────────────────────────

export const stores = pgTable(
  "stores",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    status: text("status").notNull().default("draft"),
    primaryLang: text("primary_lang").notNull().default("tk"),

    name: jsonb("name").$type<Localized>().notNull().default({}),
    description: jsonb("description").$type<Localized>().notNull().default({}),

    // Location
    city: text("city").notNull().default("Aşgabat"),
    neighborhood: text("neighborhood"),
    address: jsonb("address").$type<Localized>().notNull().default({}),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),

    priceTier: text("price_tier").notNull().default("$$"),

    // Contact and social
    phone: text("phone"),
    phoneSecondary: text("phone_secondary"),
    website: text("website"),
    instagram: text("instagram"),
    tiktok: text("tiktok"),
    telegram: text("telegram"),
    whatsapp: text("whatsapp"),

    // Service options
    dineIn: boolean("dine_in").notNull().default(true),
    takeaway: boolean("takeaway").notNull().default(false),
    delivery: boolean("delivery").notNull().default(false),
    deliveryPhone: text("delivery_phone"),
    reservationPhone: text("reservation_phone"),
    capacity: integer("capacity"),
    banquetHall: boolean("banquet_hall").notNull().default(false),

    // Amenities and policies, stored as arrays of stable keys
    amenities: jsonb("amenities").$type<string[]>().notNull().default([]),
    paymentMethods: jsonb("payment_methods")
      .$type<string[]>()
      .notNull()
      .default([]),

    // Availability state
    temporarilyClosed: boolean("temporarily_closed").notNull().default(false),
    closureNote: jsonb("closure_note").$type<Localized>().notNull().default({}),
    openingSoon: boolean("opening_soon").notNull().default(false),

    /** Private. Shown to admins only, never returned by public endpoints. */
    businessRegNo: text("business_reg_no"),

    views: integer("views").notNull().default(0),

    rejectionReason: text("rejection_reason"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewedBy: uuid("reviewed_by").references(() => admins.id, {
      onDelete: "set null",
    }),

    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(now),
  },
  (t) => [
    index("idx_stores_status").on(t.status),
    index("idx_stores_city").on(t.city),
    index("idx_stores_neighborhood").on(t.neighborhood),
  ],
);

export const storeUsers = pgTable(
  "store_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    /** The login identifier. Normalised to digits with a leading +. */
    phone: text("phone").notNull().unique(),
    passwordHash: text("password_hash").notNull(),
    fullName: text("full_name").notNull(),
    position: text("position"),
    personalPhone: text("personal_phone"),
    isActive: boolean("is_active").notNull().default(true),
    mustChangePassword: boolean("must_change_password").notNull().default(false),
    lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(now),
  },
  (t) => [index("idx_store_users_store").on(t.storeId)],
);

/**
 * One row per opening interval. Two rows for the same weekday express a split
 * day (open 09:00–15:00, closed, open 18:00–23:00). A row with `isClosed` marks
 * the day as closed; no rows at all means the owner has not configured that day.
 * `weekday` is 0 = Monday through 6 = Sunday.
 */
export const storeHours = pgTable(
  "store_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    weekday: smallint("weekday").notNull(),
    isClosed: boolean("is_closed").notNull().default(false),
    /** "HH:MM", null when the day is closed. */
    opens: text("opens"),
    closes: text("closes"),
  },
  (t) => [index("idx_store_hours_store").on(t.storeId, t.weekday)],
);

export const storeSpecialHours = pgTable(
  "store_special_hours",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    date: date("date").notNull(),
    isClosed: boolean("is_closed").notNull().default(false),
    opens: text("opens"),
    closes: text("closes"),
    note: jsonb("note").$type<Localized>().notNull().default({}),
  },
  (t) => [uniqueIndex("uq_special_hours_store_date").on(t.storeId, t.date)],
);

// ── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: jsonb("name").$type<Localized>().notNull().default({}),
  icon: text("icon"),
  sortOrder: integer("sort_order").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .default(now),
});

export const storeCategories = pgTable(
  "store_categories",
  {
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    categoryId: uuid("category_id")
      .notNull()
      .references(() => categories.id, { onDelete: "cascade" }),
  },
  (t) => [
    primaryKey({ columns: [t.storeId, t.categoryId] }),
    index("idx_store_categories_category").on(t.categoryId),
  ],
);

// ── Menu ─────────────────────────────────────────────────────────────────────

export const menuSections = pgTable(
  "menu_sections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    name: jsonb("name").$type<Localized>().notNull().default({}),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(now),
  },
  (t) => [index("idx_menu_sections_store").on(t.storeId, t.sortOrder)],
);

export const menuItems = pgTable(
  "menu_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /**
     * Denormalised from the parent section on purpose: every tenancy check
     * filters on `store_id` directly, so no query can reach another store's
     * items by guessing a section id.
     */
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    sectionId: uuid("section_id")
      .notNull()
      .references(() => menuSections.id, { onDelete: "cascade" }),
    name: jsonb("name").$type<Localized>().notNull().default({}),
    description: jsonb("description").$type<Localized>().notNull().default({}),
    /** Integer minor units (tenge). Never a float. */
    priceMinor: integer("price_minor").notNull(),
    currency: text("currency").notNull().default("TMT"),
    mediaId: uuid("media_id"),
    isAvailable: boolean("is_available").notNull().default(true),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(now),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .default(now),
  },
  (t) => [
    index("idx_menu_items_store").on(t.storeId),
    index("idx_menu_items_section").on(t.sectionId, t.sortOrder),
  ],
);

// ── Media ────────────────────────────────────────────────────────────────────

export const media = pgTable(
  "media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    storeId: uuid("store_id")
      .notNull()
      .references(() => stores.id, { onDelete: "cascade" }),
    kind: text("kind").notNull(),
    /** Basename without extension; variants derive from it. */
    filename: text("filename").notNull(),
    originalName: text("original_name"),
    mime: text("mime").notNull(),
    width: integer("width").notNull(),
    height: integer("height").notNull(),
    bytes: integer("bytes").notNull(),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(now),
  },
  (t) => [index("idx_media_store_kind").on(t.storeId, t.kind, t.sortOrder)],
);

// ── Sessions, rate limiting, audit ───────────────────────────────────────────

export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    subjectType: text("subject_type").notNull(),
    subjectId: uuid("subject_id").notNull(),
    /** SHA-256 of the cookie token. The token itself is never stored. */
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    impersonatedByAdminId: uuid("impersonated_by_admin_id").references(
      () => admins.id,
      { onDelete: "cascade" },
    ),
    ip: text("ip"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(now),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true })
      .notNull()
      .default(now),
  },
  (t) => [index("idx_sessions_subject").on(t.subjectType, t.subjectId)],
);

export const loginAttempts = pgTable(
  "login_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Lowercased phone or username the attempt targeted. */
    identifier: text("identifier").notNull(),
    ip: text("ip"),
    success: boolean("success").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(now),
  },
  (t) => [
    index("idx_login_attempts_identifier").on(t.identifier, t.createdAt),
    index("idx_login_attempts_ip").on(t.ip, t.createdAt),
  ],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorType: text("actor_type").notNull(),
    actorId: uuid("actor_id"),
    /** Human-readable actor at the time of the action, for when the row is deleted. */
    actorLabel: text("actor_label"),
    impersonatedByAdminId: uuid("impersonated_by_admin_id"),
    action: text("action").notNull(),
    targetType: text("target_type"),
    targetId: text("target_id"),
    meta: jsonb("meta").$type<Record<string, unknown>>().notNull().default({}),
    ip: text("ip"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .default(now),
  },
  (t) => [
    index("idx_audit_created").on(t.createdAt),
    index("idx_audit_target").on(t.targetType, t.targetId),
    index("idx_audit_actor").on(t.actorType, t.actorId),
  ],
);
