import { z } from "zod";
import { passwordSchema } from "../../auth/auth.routes.js";
import { langSchema, localizedSchema } from "../../lib/i18n.js";
import { optionalPhoneSchema, phoneSchema } from "../../lib/phone.js";
import { AMENITIES, PAYMENT_METHODS, PRICE_TIERS, TIME_RE } from "./constants.js";

/** Turns "" into null so clearing an optional text field actually clears it. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

/**
 * Social handles are stored without the leading @ or a full URL so the
 * frontend can build a consistent link.
 */
const handle = (max = 64) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((v) => v.replace(/^@+/, "").replace(/^https?:\/\/[^/]+\//, ""))
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional();

export const registerSchema = z.object({
  owner: z.object({
    fullName: z.string().trim().min(2).max(120),
    position: optionalText(80),
    phone: phoneSchema,
    personalPhone: optionalPhoneSchema,
    password: passwordSchema,
  }),
  store: z.object({
    name: localizedSchema,
    primaryLang: langSchema,
    phone: phoneSchema,
  }),
});
export type RegisterInput = z.infer<typeof registerSchema>;

/**
 * Every field is optional: the portal saves one section at a time, so a PATCH
 * carries only what the owner just edited.
 */
export const updateStoreSchema = z
  .object({
    name: localizedSchema,
    description: localizedSchema,
    address: localizedSchema,

    neighborhood: optionalText(120),
    lat: z.number().min(-90).max(90).nullable().optional(),
    lng: z.number().min(-180).max(180).nullable().optional(),

    priceTier: z.enum(PRICE_TIERS),

    phone: phoneSchema.optional(),
    phoneSecondary: optionalPhoneSchema,
    website: z
      .string()
      .trim()
      .max(200)
      .transform((v) => (v === "" ? null : v))
      .nullable()
      .optional()
      .refine(
        (v) => v === null || v === undefined || /^https?:\/\/.+/.test(v),
        "Website must start with http:// or https://",
      ),
    instagram: handle(),
    tiktok: handle(),
    telegram: handle(),
    whatsapp: optionalPhoneSchema,

    dineIn: z.boolean(),
    takeaway: z.boolean(),
    delivery: z.boolean(),
    deliveryPhone: optionalPhoneSchema,
    reservationPhone: optionalPhoneSchema,
    capacity: z.number().int().positive().max(100_000).nullable().optional(),
    banquetHall: z.boolean(),

    amenities: z.array(z.enum(AMENITIES)).max(AMENITIES.length),
    paymentMethods: z.array(z.enum(PAYMENT_METHODS)).max(PAYMENT_METHODS.length),

    temporarilyClosed: z.boolean(),
    closureNote: localizedSchema,
    openingSoon: z.boolean(),

    businessRegNo: optionalText(64),
  })
  .partial()
  .strict();
export type UpdateStoreInput = z.infer<typeof updateStoreSchema>;

const hourEntry = z
  .object({
    weekday: z.number().int().min(0).max(6),
    isClosed: z.boolean().default(false),
    opens: z.string().regex(TIME_RE, "Use HH:MM").nullable().optional(),
    closes: z.string().regex(TIME_RE, "Use HH:MM").nullable().optional(),
  })
  .refine(
    (v) => v.isClosed || (Boolean(v.opens) && Boolean(v.closes)),
    "An open day needs both an opening and a closing time",
  );

/**
 * The whole week is replaced at once. Several entries for one weekday express
 * a split day; `closes` earlier than `opens` means the store runs past
 * midnight, which is normal here and deliberately allowed.
 */
export const hoursSchema = z.object({
  hours: z.array(hourEntry).max(21),
});
export type HoursInput = z.infer<typeof hoursSchema>;

export const specialHoursSchema = z.object({
  entries: z
    .array(
      z
        .object({
          date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD"),
          isClosed: z.boolean().default(false),
          opens: z.string().regex(TIME_RE, "Use HH:MM").nullable().optional(),
          closes: z.string().regex(TIME_RE, "Use HH:MM").nullable().optional(),
          note: localizedSchema.optional(),
        })
        .refine(
          (v) => v.isClosed || (Boolean(v.opens) && Boolean(v.closes)),
          "An open day needs both an opening and a closing time",
        ),
    )
    .max(120),
});
export type SpecialHoursInput = z.infer<typeof specialHoursSchema>;

export const categoriesSchema = z.object({
  categoryIds: z.array(z.string().uuid()).max(8),
});
