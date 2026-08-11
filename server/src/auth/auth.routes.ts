import { eq } from "drizzle-orm";
import { Router } from "express";
import { z } from "zod";
import { db } from "../db/client.js";
import { admins, stores, storeUsers, type AdminRole } from "../db/schema.js";
import { recordAudit } from "../lib/audit.js";
import { badRequest, unauthorized } from "../lib/errors.js";
import { asyncHandler, parseBody } from "../lib/http.js";
import { phoneSchema } from "../lib/phone.js";
import { requireAdmin, requireStoreUser } from "./guards.js";
import {
  DUMMY_PASSWORD_HASH,
  hashPassword,
  needsRehash,
  verifyPassword,
} from "./password.js";
import { assertLoginAllowed, recordLoginAttempt } from "./rate-limit.js";
import { issueSession, revokeAllSessionsFor, revokeSession } from "./sessions.js";

export const PASSWORD_MIN_LENGTH = 10;

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Password must be at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(200, "Password is too long");

const adminLoginSchema = z.object({
  username: z.string().trim().min(1).max(100),
  password: z.string().min(1).max(200),
});

const storeLoginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1).max(200),
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(200),
  newPassword: passwordSchema,
});

const router = Router();

// ── Admin ────────────────────────────────────────────────────────────────────

router.post(
  "/admin/login",
  asyncHandler(async (req, res) => {
    const { username, password } = parseBody(adminLoginSchema, req.body);
    const identifier = `admin:${username.toLowerCase()}`;

    await assertLoginAllowed(identifier, req.ip);

    const [admin] = await db
      .select()
      .from(admins)
      .where(eq(admins.username, username))
      .limit(1);

    // Verify against a dummy hash when the account is missing so the response
    // time does not reveal which usernames exist.
    const storedHash = admin?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const ok = await verifyPassword(password, storedHash);

    if (!admin || !ok || !admin.isActive) {
      await recordLoginAttempt(identifier, req.ip, false);
      throw unauthorized("Incorrect username or password");
    }

    await recordLoginAttempt(identifier, req.ip, true);

    if (needsRehash(admin.passwordHash)) {
      await db
        .update(admins)
        .set({ passwordHash: await hashPassword(password) })
        .where(eq(admins.id, admin.id));
    }

    await db
      .update(admins)
      .set({ lastLoginAt: new Date() })
      .where(eq(admins.id, admin.id));

    await issueSession(res, {
      subjectType: "admin",
      subjectId: admin.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    res.json({
      admin: {
        id: admin.id,
        username: admin.username,
        name: admin.name,
        role: admin.role as AdminRole,
        mustChangePassword: admin.mustChangePassword,
      },
    });
  }),
);

router.get("/admin/me", requireAdmin, (req, res) => {
  const admin = req.auth!.admin!;
  res.json({
    admin: {
      id: admin.id,
      username: admin.username,
      name: admin.name,
      role: admin.role,
      mustChangePassword: admin.mustChangePassword,
    },
  });
});

router.post(
  "/admin/logout",
  requireAdmin,
  asyncHandler(async (req, res) => {
    await revokeSession(res, req.auth!.admin!.sessionId, "admin");
    res.json({ ok: true });
  }),
);

router.post(
  "/admin/change-password",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = parseBody(changePasswordSchema, req.body);
    const current = req.auth!.admin!;

    const [row] = await db
      .select()
      .from(admins)
      .where(eq(admins.id, current.id))
      .limit(1);
    if (!row) throw unauthorized();

    if (!(await verifyPassword(currentPassword, row.passwordHash))) {
      throw badRequest("Current password is incorrect");
    }
    if (await verifyPassword(newPassword, row.passwordHash)) {
      throw badRequest("The new password must differ from the current one");
    }

    await db
      .update(admins)
      .set({
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(admins.id, current.id));

    // Every other session for this admin is invalidated; the current one is
    // reissued so changing a password does not sign you out of the page you
    // are standing on.
    await revokeAllSessionsFor("admin", current.id);
    await issueSession(res, {
      subjectType: "admin",
      subjectId: current.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    await recordAudit(req, { action: "admin.password_changed", targetType: "admin", targetId: current.id });

    res.json({ ok: true });
  }),
);

// ── Store owners ─────────────────────────────────────────────────────────────

router.post(
  "/store/login",
  asyncHandler(async (req, res) => {
    const { phone, password } = parseBody(storeLoginSchema, req.body);
    const identifier = `store:${phone}`;

    await assertLoginAllowed(identifier, req.ip);

    const [user] = await db
      .select()
      .from(storeUsers)
      .where(eq(storeUsers.phone, phone))
      .limit(1);

    const storedHash = user?.passwordHash ?? DUMMY_PASSWORD_HASH;
    const ok = await verifyPassword(password, storedHash);

    if (!user || !ok || !user.isActive) {
      await recordLoginAttempt(identifier, req.ip, false);
      throw unauthorized("Incorrect phone number or password");
    }

    await recordLoginAttempt(identifier, req.ip, true);

    if (needsRehash(user.passwordHash)) {
      await db
        .update(storeUsers)
        .set({ passwordHash: await hashPassword(password) })
        .where(eq(storeUsers.id, user.id));
    }

    await db
      .update(storeUsers)
      .set({ lastLoginAt: new Date() })
      .where(eq(storeUsers.id, user.id));

    await issueSession(res, {
      subjectType: "store_user",
      subjectId: user.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    const [store] = await db
      .select({ id: stores.id, slug: stores.slug, status: stores.status, name: stores.name })
      .from(stores)
      .where(eq(stores.id, user.storeId))
      .limit(1);

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        fullName: user.fullName,
        position: user.position,
        mustChangePassword: user.mustChangePassword,
      },
      store,
    });
  }),
);

router.get(
  "/store/me",
  requireStoreUser,
  asyncHandler(async (req, res) => {
    const current = req.auth!.storeUser!;

    const [store] = await db
      .select({ id: stores.id, slug: stores.slug, status: stores.status, name: stores.name })
      .from(stores)
      .where(eq(stores.id, current.storeId))
      .limit(1);

    res.json({
      user: {
        id: current.id,
        phone: current.phone,
        fullName: current.fullName,
        mustChangePassword: current.mustChangePassword,
      },
      store,
      impersonated: Boolean(current.impersonatedByAdminId),
    });
  }),
);

router.post(
  "/store/logout",
  requireStoreUser,
  asyncHandler(async (req, res) => {
    await revokeSession(res, req.auth!.storeUser!.sessionId, "store_user");
    res.json({ ok: true });
  }),
);

router.post(
  "/store/change-password",
  requireStoreUser,
  asyncHandler(async (req, res) => {
    const { currentPassword, newPassword } = parseBody(changePasswordSchema, req.body);
    const current = req.auth!.storeUser!;

    if (current.impersonatedByAdminId) {
      throw badRequest("An impersonated session cannot change the owner's password");
    }

    const [row] = await db
      .select()
      .from(storeUsers)
      .where(eq(storeUsers.id, current.id))
      .limit(1);
    if (!row) throw unauthorized();

    if (!(await verifyPassword(currentPassword, row.passwordHash))) {
      throw badRequest("Current password is incorrect");
    }
    if (await verifyPassword(newPassword, row.passwordHash)) {
      throw badRequest("The new password must differ from the current one");
    }

    await db
      .update(storeUsers)
      .set({
        passwordHash: await hashPassword(newPassword),
        mustChangePassword: false,
        updatedAt: new Date(),
      })
      .where(eq(storeUsers.id, current.id));

    await revokeAllSessionsFor("store_user", current.id);
    await issueSession(res, {
      subjectType: "store_user",
      subjectId: current.id,
      ip: req.ip,
      userAgent: req.get("user-agent"),
    });

    await recordAudit(req, {
      action: "store_user.password_changed",
      targetType: "store",
      targetId: current.storeId,
    });

    res.json({ ok: true });
  }),
);

export default router;
