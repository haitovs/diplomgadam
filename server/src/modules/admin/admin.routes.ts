import { Router } from "express";
import { z } from "zod";
import { passwordSchema } from "../../auth/auth.routes.js";
import {
  requireAdmin,
  requireAdminRole,
  requirePasswordChanged,
  requireStoreAccess,
} from "../../auth/guards.js";
import { generateTemporaryPassword } from "../../auth/password.js";
import {
  issueSession,
  revokeSession,
  STORE_COOKIE,
  resolveSession,
} from "../../auth/sessions.js";
import { ADMIN_ROLES, STORE_STATUSES, type StoreStatus } from "../../db/schema.js";
import { diffFields, recordAudit } from "../../lib/audit.js";
import { badRequest } from "../../lib/errors.js";
import { asyncHandler, parseBody, parseQuery } from "../../lib/http.js";
import { localizedSchema } from "../../lib/i18n.js";
import { updateStoreSchema } from "../stores/stores.schemas.js";
import {
  approveStore,
  getStoreDetail,
  getSubmissionBlockers,
  reinstateStore,
  rejectStore,
  suspendStore,
  updateStore,
} from "../stores/stores.service.js";
import {
  createAdmin,
  createCategory,
  deleteAdmin,
  deleteCategory,
  deleteStore,
  getDashboardStats,
  listAdmins,
  listAudit,
  listCategoriesWithCounts,
  listStores,
  primaryOwnerFor,
  reorderCategories,
  resetAdminPassword,
  resetOwnerPassword,
  setOwnerActive,
  updateAdmin,
  updateCategory,
} from "./admin.service.js";

const router = Router();

// Every route below requires a signed-in admin who has cleared any forced
// password change.
router.use(requireAdmin, requirePasswordChanged);

const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  perPage: z.coerce.number().int().min(1).max(100).default(20),
});

const reasonSchema = z.object({
  reason: z.string().trim().min(3, "Give a reason").max(1000),
});

// ── Dashboard ────────────────────────────────────────────────────────────────

router.get(
  "/stats",
  asyncHandler(async (_req, res) => {
    res.json(await getDashboardStats());
  }),
);

// ── Stores ───────────────────────────────────────────────────────────────────

const storeListSchema = paginationSchema.extend({
  status: z.enum(STORE_STATUSES).optional(),
  search: z.string().trim().max(120).optional(),
});

router.get(
  "/stores",
  asyncHandler(async (req, res) => {
    const query = parseQuery(storeListSchema, req.query);
    res.json(await listStores(query as { status?: StoreStatus } & typeof query));
  }),
);

router.get(
  "/stores/:storeId",
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const detail = await getStoreDetail(req.storeId!);
    const blockers = await getSubmissionBlockers(req.storeId!);
    res.json({ ...detail, blockers });
  }),
);

router.patch(
  "/stores/:storeId",
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const { before, after } = await updateStore(
      req.storeId!,
      parseBody(updateStoreSchema, req.body),
    );
    await recordAudit(req, {
      action: "admin.store_updated",
      targetType: "store",
      targetId: req.storeId!,
      meta: { changes: diffFields(before, after) },
    });
    res.json({ store: after });
  }),
);

router.post(
  "/stores/:storeId/approve",
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const store = await approveStore(req.storeId!, req.auth!.admin!.id);
    await recordAudit(req, {
      action: "admin.store_approved",
      targetType: "store",
      targetId: store.id,
    });
    res.json({ store });
  }),
);

router.post(
  "/stores/:storeId/reject",
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const { reason } = parseBody(reasonSchema, req.body);
    const store = await rejectStore(req.storeId!, req.auth!.admin!.id, reason);
    await recordAudit(req, {
      action: "admin.store_rejected",
      targetType: "store",
      targetId: store.id,
      meta: { reason },
    });
    res.json({ store });
  }),
);

router.post(
  "/stores/:storeId/suspend",
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const { reason } = parseBody(reasonSchema, req.body);
    const store = await suspendStore(req.storeId!, req.auth!.admin!.id, reason);
    await recordAudit(req, {
      action: "admin.store_suspended",
      targetType: "store",
      targetId: store.id,
      meta: { reason },
    });
    res.json({ store });
  }),
);

router.post(
  "/stores/:storeId/reinstate",
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const store = await reinstateStore(req.storeId!, req.auth!.admin!.id);
    await recordAudit(req, {
      action: "admin.store_reinstated",
      targetType: "store",
      targetId: store.id,
    });
    res.json({ store });
  }),
);

router.delete(
  "/stores/:storeId",
  requireAdminRole("owner"),
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const store = await deleteStore(req.storeId!);
    await recordAudit(req, {
      action: "admin.store_deleted",
      targetType: "store",
      targetId: store.id,
      meta: { slug: store.slug },
    });
    res.json({ ok: true });
  }),
);

// ── Owner accounts ───────────────────────────────────────────────────────────

router.post(
  "/stores/:storeId/owners/:userId/reset-password",
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const temporary = generateTemporaryPassword();
    const user = await resetOwnerPassword(req.storeId!, req.params.userId, temporary);

    await recordAudit(req, {
      action: "admin.owner_password_reset",
      targetType: "store_user",
      targetId: user.id,
      meta: { storeId: req.storeId },
    });

    // Returned once, for the admin to read out to the owner. It is never
    // stored in plaintext and the owner must change it at next sign-in.
    res.json({ phone: user.phone, temporaryPassword: temporary });
  }),
);

router.post(
  "/stores/:storeId/owners/:userId/active",
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const { isActive } = parseBody(z.object({ isActive: z.boolean() }), req.body);
    const user = await setOwnerActive(req.storeId!, req.params.userId, isActive);
    await recordAudit(req, {
      action: isActive ? "admin.owner_enabled" : "admin.owner_disabled",
      targetType: "store_user",
      targetId: user.id,
      meta: { storeId: req.storeId },
    });
    res.json({ ok: true });
  }),
);

// ── Impersonation ────────────────────────────────────────────────────────────

/**
 * Signs the admin into the owner portal as this store. A separate cookie is
 * used, so the admin session stays intact, and the resulting session carries
 * the acting admin's id: every write made during it is attributed to both.
 */
router.post(
  "/stores/:storeId/impersonate",
  requireStoreAccess(),
  asyncHandler(async (req, res) => {
    const owner = await primaryOwnerFor(req.storeId!);

    await issueSession(res, {
      subjectType: "store_user",
      subjectId: owner.id,
      impersonatedByAdminId: req.auth!.admin!.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    await recordAudit(req, {
      action: "admin.impersonation_started",
      targetType: "store",
      targetId: req.storeId!,
      meta: { ownerId: owner.id, ownerName: owner.fullName },
    });

    res.json({ ok: true, storeId: req.storeId, ownerName: owner.fullName });
  }),
);

router.post(
  "/stop-impersonation",
  asyncHandler(async (req, res) => {
    const session = await resolveSession(req.cookies?.[STORE_COOKIE], "store_user");
    if (!session?.impersonatedByAdminId) {
      throw badRequest("There is no impersonation session to end");
    }

    await revokeSession(res, session.id, "store_user");
    await recordAudit(req, {
      action: "admin.impersonation_ended",
      targetType: "store_user",
      targetId: session.subjectId,
    });

    res.json({ ok: true });
  }),
);

// ── Categories ───────────────────────────────────────────────────────────────

router.get(
  "/categories",
  asyncHandler(async (_req, res) => {
    res.json({ categories: await listCategoriesWithCounts() });
  }),
);

router.post(
  "/categories",
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({
        name: localizedSchema,
        icon: z.string().trim().max(16).nullable().optional(),
        slug: z.string().trim().max(60).nullable().optional(),
      }),
      req.body,
    );
    const category = await createCategory(input);
    await recordAudit(req, {
      action: "admin.category_created",
      targetType: "category",
      targetId: category.id,
    });
    res.status(201).json({ category });
  }),
);

router.put(
  "/categories/order",
  asyncHandler(async (req, res) => {
    const { ids } = parseBody(
      z.object({ ids: z.array(z.string().uuid()).max(200) }),
      req.body,
    );
    await reorderCategories(ids);
    await recordAudit(req, { action: "admin.categories_reordered" });
    res.json({ ok: true });
  }),
);

router.patch(
  "/categories/:categoryId",
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z
        .object({
          name: localizedSchema,
          icon: z.string().trim().max(16).nullable(),
        })
        .partial(),
      req.body,
    );
    const category = await updateCategory(req.params.categoryId, input);
    await recordAudit(req, {
      action: "admin.category_updated",
      targetType: "category",
      targetId: category.id,
    });
    res.json({ category });
  }),
);

router.delete(
  "/categories/:categoryId",
  asyncHandler(async (req, res) => {
    await deleteCategory(req.params.categoryId);
    await recordAudit(req, {
      action: "admin.category_deleted",
      targetType: "category",
      targetId: req.params.categoryId,
    });
    res.json({ ok: true });
  }),
);

// ── Admin accounts (owner role only) ─────────────────────────────────────────

router.get(
  "/admins",
  requireAdminRole("owner"),
  asyncHandler(async (_req, res) => {
    res.json({ admins: await listAdmins() });
  }),
);

router.post(
  "/admins",
  requireAdminRole("owner"),
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z.object({
        username: z
          .string()
          .trim()
          .min(3)
          .max(60)
          .regex(/^[a-zA-Z0-9._-]+$/, "Letters, numbers, dot, dash and underscore only"),
        name: z.string().trim().min(2).max(120),
        role: z.enum(ADMIN_ROLES),
        password: passwordSchema,
      }),
      req.body,
    );

    const admin = await createAdmin(input);
    await recordAudit(req, {
      action: "admin.account_created",
      targetType: "admin",
      targetId: admin.id,
      meta: { username: admin.username, role: admin.role },
    });
    res.status(201).json({ admin });
  }),
);

router.patch(
  "/admins/:adminId",
  requireAdminRole("owner"),
  asyncHandler(async (req, res) => {
    const input = parseBody(
      z
        .object({
          name: z.string().trim().min(2).max(120),
          role: z.enum(ADMIN_ROLES),
          isActive: z.boolean(),
        })
        .partial(),
      req.body,
    );

    const admin = await updateAdmin(req.params.adminId, input);
    await recordAudit(req, {
      action: "admin.account_updated",
      targetType: "admin",
      targetId: req.params.adminId,
      meta: input,
    });
    res.json({ admin });
  }),
);

router.post(
  "/admins/:adminId/reset-password",
  requireAdminRole("owner"),
  asyncHandler(async (req, res) => {
    const temporary = generateTemporaryPassword();
    const target = await resetAdminPassword(req.params.adminId, temporary);
    await recordAudit(req, {
      action: "admin.account_password_reset",
      targetType: "admin",
      targetId: target.id,
    });
    res.json({ username: target.username, temporaryPassword: temporary });
  }),
);

router.delete(
  "/admins/:adminId",
  requireAdminRole("owner"),
  asyncHandler(async (req, res) => {
    if (req.params.adminId === req.auth!.admin!.id) {
      throw badRequest("You cannot delete your own account");
    }
    const target = await deleteAdmin(req.params.adminId);
    await recordAudit(req, {
      action: "admin.account_deleted",
      targetType: "admin",
      targetId: target.id,
      meta: { username: target.username },
    });
    res.json({ ok: true });
  }),
);

// ── Audit log ────────────────────────────────────────────────────────────────

router.get(
  "/audit",
  asyncHandler(async (req, res) => {
    const query = parseQuery(
      paginationSchema.extend({
        action: z.string().trim().max(80).optional(),
        targetId: z.string().trim().max(80).optional(),
      }),
      req.query,
    );
    res.json(await listAudit(query));
  }),
);

export default router;
