import { z } from "zod";
import { localizedSchema } from "../../lib/i18n.js";

export const sectionCreateSchema = z.object({
  name: localizedSchema,
});

export const sectionUpdateSchema = z
  .object({
    name: localizedSchema,
  })
  .partial()
  .strict();

/**
 * Prices are integer minor units (tenge; 100 to the manat). Accepting a
 * decimal here would reintroduce the floating-point rounding the old `REAL`
 * price column suffered from.
 */
const priceMinor = z
  .number()
  .int("Price must be a whole number of tenge")
  .min(0)
  .max(100_000_000);

export const itemCreateSchema = z.object({
  sectionId: z.string().uuid(),
  name: localizedSchema,
  description: localizedSchema.optional(),
  priceMinor,
  mediaId: z.string().uuid().nullable().optional(),
  isAvailable: z.boolean().default(true),
});

export const itemUpdateSchema = z
  .object({
    sectionId: z.string().uuid(),
    name: localizedSchema,
    description: localizedSchema,
    priceMinor,
    mediaId: z.string().uuid().nullable(),
    isAvailable: z.boolean(),
  })
  .partial()
  .strict();

/** Reorder by listing ids in their new order; position is the array index. */
export const reorderSchema = z.object({
  ids: z.array(z.string().uuid()).max(500),
});

export type SectionCreateInput = z.infer<typeof sectionCreateSchema>;
export type SectionUpdateInput = z.infer<typeof sectionUpdateSchema>;
export type ItemCreateInput = z.infer<typeof itemCreateSchema>;
export type ItemUpdateInput = z.infer<typeof itemUpdateSchema>;
