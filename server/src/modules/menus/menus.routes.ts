import { Router } from "express";
import {
  requirePasswordChanged,
  requireStoreAccess,
  requireStoreUser,
  requireWritableStore,
} from "../../auth/guards.js";
import { recordAudit } from "../../lib/audit.js";
import { asyncHandler, parseBody } from "../../lib/http.js";
import {
  itemCreateSchema,
  itemUpdateSchema,
  reorderSchema,
  sectionCreateSchema,
  sectionUpdateSchema,
} from "./menus.schemas.js";
import {
  createItem,
  createSection,
  deleteItem,
  deleteSection,
  getMenu,
  reorderItems,
  reorderSections,
  updateItem,
  updateSection,
} from "./menus.service.js";

const router = Router();

const ownerOnly = [
  requireStoreUser,
  requirePasswordChanged,
  requireStoreAccess(),
] as const;

const ownerWrite = [...ownerOnly, requireWritableStore] as const;

router.get(
  "/",
  ...ownerOnly,
  asyncHandler(async (req, res) => {
    res.json({ sections: await getMenu(req.storeId!) });
  }),
);

// ── Sections ─────────────────────────────────────────────────────────────────

router.post(
  "/sections",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    const section = await createSection(
      req.storeId!,
      parseBody(sectionCreateSchema, req.body),
    );
    await recordAudit(req, {
      action: "menu.section_created",
      targetType: "menu_section",
      targetId: section.id,
      meta: { storeId: req.storeId },
    });
    res.status(201).json({ section });
  }),
);

// Ordering is registered before the :sectionId routes so that "order" is not
// captured as an id.
router.put(
  "/sections/order",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    const { ids } = parseBody(reorderSchema, req.body);
    await reorderSections(req.storeId!, ids);
    await recordAudit(req, {
      action: "menu.sections_reordered",
      targetType: "store",
      targetId: req.storeId!,
    });
    res.json({ ok: true });
  }),
);

router.patch(
  "/sections/:sectionId",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    const section = await updateSection(
      req.storeId!,
      req.params.sectionId,
      parseBody(sectionUpdateSchema, req.body),
    );
    await recordAudit(req, {
      action: "menu.section_updated",
      targetType: "menu_section",
      targetId: section.id,
      meta: { storeId: req.storeId },
    });
    res.json({ section });
  }),
);

router.delete(
  "/sections/:sectionId",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    await deleteSection(req.storeId!, req.params.sectionId);
    await recordAudit(req, {
      action: "menu.section_deleted",
      targetType: "menu_section",
      targetId: req.params.sectionId,
      meta: { storeId: req.storeId },
    });
    res.json({ ok: true });
  }),
);

// ── Items ────────────────────────────────────────────────────────────────────

router.post(
  "/items",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    const item = await createItem(
      req.storeId!,
      parseBody(itemCreateSchema, req.body),
    );
    await recordAudit(req, {
      action: "menu.item_created",
      targetType: "menu_item",
      targetId: item.id,
      meta: { storeId: req.storeId, priceMinor: item.priceMinor },
    });
    res.status(201).json({ item });
  }),
);

router.put(
  "/items/order",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    const { ids } = parseBody(reorderSchema, req.body);
    await reorderItems(req.storeId!, ids);
    await recordAudit(req, {
      action: "menu.items_reordered",
      targetType: "store",
      targetId: req.storeId!,
    });
    res.json({ ok: true });
  }),
);

router.patch(
  "/items/:itemId",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    const item = await updateItem(
      req.storeId!,
      req.params.itemId,
      parseBody(itemUpdateSchema, req.body),
    );
    await recordAudit(req, {
      action: "menu.item_updated",
      targetType: "menu_item",
      targetId: item.id,
      meta: { storeId: req.storeId },
    });
    res.json({ item });
  }),
);

router.delete(
  "/items/:itemId",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    await deleteItem(req.storeId!, req.params.itemId);
    await recordAudit(req, {
      action: "menu.item_deleted",
      targetType: "menu_item",
      targetId: req.params.itemId,
      meta: { storeId: req.storeId },
    });
    res.json({ ok: true });
  }),
);

export default router;
