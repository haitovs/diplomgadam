import { Router } from "express";
import { z } from "zod";
import { asyncHandler, parseQuery } from "../../lib/http.js";
import { langSchema } from "../../lib/i18n.js";
import { AMENITIES, PRICE_TIERS } from "../stores/constants.js";
import {
  getFilterOptions,
  getPublicStore,
  listPublicCategories,
  listPublicStores,
  recordStoreView,
} from "./public.service.js";

const router = Router();

const langQuery = z.object({ lang: langSchema.default("tk") });

/** Accepts `amenities=wifi,parking` as well as repeated query parameters. */
const csv = <T extends string>(values: readonly T[]) =>
  z
    .union([z.string(), z.array(z.string())])
    .optional()
    .transform((v) => {
      if (v === undefined) return undefined;
      const parts = (Array.isArray(v) ? v : v.split(",")).map((s) => s.trim());
      return parts.filter((p): p is T => (values as readonly string[]).includes(p));
    });

const listQuerySchema = z.object({
  lang: langSchema.default("tk"),
  search: z.string().trim().max(120).optional(),
  category: z.string().trim().max(60).optional(),
  neighborhood: z.string().trim().max(120).optional(),
  priceTier: z.enum(PRICE_TIERS).optional(),
  amenities: csv(AMENITIES),
  openNow: z
    .enum(["true", "false"])
    .optional()
    .transform((v) => v === "true"),
  sort: z.enum(["name", "newest", "popular"]).default("name"),
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(60).default(12),
});

router.get(
  "/stores",
  asyncHandler(async (req, res) => {
    res.json(await listPublicStores(parseQuery(listQuerySchema, req.query)));
  }),
);

router.get(
  "/stores/:slug",
  asyncHandler(async (req, res) => {
    const { lang } = parseQuery(langQuery, req.query);
    const store = await getPublicStore(req.params.slug, lang);

    // The listing is already resolved, so a failed counter update must not
    // turn a successful page load into an error.
    void recordStoreView(req.params.slug).catch(() => undefined);

    res.json({ store });
  }),
);

router.get(
  "/categories",
  asyncHandler(async (req, res) => {
    const { lang } = parseQuery(langQuery, req.query);
    res.json({ categories: await listPublicCategories(lang) });
  }),
);

router.get(
  "/filters",
  asyncHandler(async (_req, res) => {
    res.json({ ...(await getFilterOptions()), amenities: AMENITIES, priceTiers: PRICE_TIERS });
  }),
);

export default router;
