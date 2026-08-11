import { Router } from "express";
import {
  requirePasswordChanged,
  requireStoreAccess,
  requireStoreUser,
  requireWritableStore,
} from "../../auth/guards.js";
import { issueSession } from "../../auth/sessions.js";
import { diffFields, recordAudit } from "../../lib/audit.js";
import { asyncHandler, parseBody } from "../../lib/http.js";
import {
  categoriesSchema,
  hoursSchema,
  registerSchema,
  specialHoursSchema,
  updateStoreSchema,
} from "./stores.schemas.js";
import {
  getStoreDetail,
  getSubmissionBlockers,
  registerStore,
  replaceHours,
  replaceSpecialHours,
  setStoreCategories,
  submitForReview,
  updateStore,
} from "./stores.service.js";

const router = Router();

/**
 * Public registration. The new store starts as a draft and the owner is signed
 * in straight away, because the next steps — uploading venue photos, building
 * the menu — all need an authenticated store to attach to.
 */
router.post(
  "/register",
  asyncHandler(async (req, res) => {
    const input = parseBody(registerSchema, req.body);
    const { store, user } = await registerStore(input);

    await issueSession(res, {
      subjectType: "store_user",
      subjectId: user.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    await recordAudit(req, {
      action: "store.registered",
      targetType: "store",
      targetId: store.id,
      meta: { slug: store.slug, ownerPhone: user.phone },
    });

    res.status(201).json({
      store: { id: store.id, slug: store.slug, status: store.status, name: store.name },
      user: { id: user.id, phone: user.phone, fullName: user.fullName },
    });
  }),
);

// Everything below acts on the signed-in owner's own store.
const ownerOnly = [
  requireStoreUser,
  requirePasswordChanged,
  requireStoreAccess(),
] as const;

router.get(
  "/me",
  ...ownerOnly,
  asyncHandler(async (req, res) => {
    const detail = await getStoreDetail(req.storeId!);
    const blockers = await getSubmissionBlockers(req.storeId!);
    res.json({ ...detail, blockers });
  }),
);

router.get(
  "/me/completeness",
  ...ownerOnly,
  asyncHandler(async (req, res) => {
    res.json({ blockers: await getSubmissionBlockers(req.storeId!) });
  }),
);

router.patch(
  "/me",
  ...ownerOnly,
  requireWritableStore,
  asyncHandler(async (req, res) => {
    const input = parseBody(updateStoreSchema, req.body);
    const { before, after } = await updateStore(req.storeId!, input);

    await recordAudit(req, {
      action: "store.updated",
      targetType: "store",
      targetId: req.storeId!,
      meta: { changes: diffFields(before, after) },
    });

    res.json({ store: after });
  }),
);

router.put(
  "/me/hours",
  ...ownerOnly,
  requireWritableStore,
  asyncHandler(async (req, res) => {
    const input = parseBody(hoursSchema, req.body);
    await replaceHours(req.storeId!, input);

    await recordAudit(req, {
      action: "store.hours_updated",
      targetType: "store",
      targetId: req.storeId!,
      meta: { entries: input.hours.length },
    });

    res.json({ ok: true });
  }),
);

router.put(
  "/me/special-hours",
  ...ownerOnly,
  requireWritableStore,
  asyncHandler(async (req, res) => {
    const input = parseBody(specialHoursSchema, req.body);
    await replaceSpecialHours(req.storeId!, input);

    await recordAudit(req, {
      action: "store.special_hours_updated",
      targetType: "store",
      targetId: req.storeId!,
      meta: { entries: input.entries.length },
    });

    res.json({ ok: true });
  }),
);

router.put(
  "/me/categories",
  ...ownerOnly,
  requireWritableStore,
  asyncHandler(async (req, res) => {
    const { categoryIds } = parseBody(categoriesSchema, req.body);
    await setStoreCategories(req.storeId!, categoryIds);

    await recordAudit(req, {
      action: "store.categories_updated",
      targetType: "store",
      targetId: req.storeId!,
      meta: { categoryIds },
    });

    res.json({ ok: true });
  }),
);

router.post(
  "/me/submit",
  ...ownerOnly,
  requireWritableStore,
  asyncHandler(async (req, res) => {
    const store = await submitForReview(req.storeId!);

    await recordAudit(req, {
      action: "store.submitted",
      targetType: "store",
      targetId: req.storeId!,
    });

    res.json({ store });
  }),
);

export default router;
