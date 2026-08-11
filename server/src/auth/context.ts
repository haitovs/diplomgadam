import { eq } from "drizzle-orm";
import type { NextFunction, Request, Response } from "express";
import { db } from "../db/client.js";
import { admins, storeUsers, type AdminRole } from "../db/schema.js";
import { ADMIN_COOKIE, STORE_COOKIE, resolveSession, touchSession } from "./sessions.js";

export interface AuthenticatedAdmin {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  sessionId: string;
  mustChangePassword: boolean;
}

export interface AuthenticatedStoreUser {
  id: string;
  storeId: string;
  phone: string;
  fullName: string;
  sessionId: string;
  mustChangePassword: boolean;
  /** Set when an admin is viewing the portal as this store. */
  impersonatedByAdminId: string | null;
}

export interface AuthContext {
  admin?: AuthenticatedAdmin;
  storeUser?: AuthenticatedStoreUser;
}

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      auth?: AuthContext;
      /** Set by requireStoreAccess: the store this request is allowed to act on. */
      storeId?: string;
    }
  }
}

/**
 * Resolves both session cookies onto `req.auth`. This never rejects a request;
 * enforcement is the guards' job, which keeps public routes able to vary their
 * response for a signed-in owner without demanding authentication.
 */
export async function loadAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const auth: AuthContext = {};

  try {
    const adminSession = await resolveSession(
      req.cookies?.[ADMIN_COOKIE],
      "admin",
    );
    if (adminSession) {
      const [row] = await db
        .select()
        .from(admins)
        .where(eq(admins.id, adminSession.subjectId))
        .limit(1);

      if (row?.isActive) {
        auth.admin = {
          id: row.id,
          username: row.username,
          name: row.name,
          role: row.role as AdminRole,
          sessionId: adminSession.id,
          mustChangePassword: row.mustChangePassword,
        };
        void touchSession(adminSession.id);
      }
    }

    const storeSession = await resolveSession(
      req.cookies?.[STORE_COOKIE],
      "store_user",
    );
    if (storeSession) {
      const [row] = await db
        .select()
        .from(storeUsers)
        .where(eq(storeUsers.id, storeSession.subjectId))
        .limit(1);

      if (row?.isActive) {
        auth.storeUser = {
          id: row.id,
          storeId: row.storeId,
          phone: row.phone,
          fullName: row.fullName,
          sessionId: storeSession.id,
          mustChangePassword: row.mustChangePassword,
          impersonatedByAdminId: storeSession.impersonatedByAdminId,
        };
        void touchSession(storeSession.id);
      }
    }
  } catch (err) {
    // A failure to read a session must not take the whole request down; the
    // request simply continues unauthenticated and the guards handle it.
    console.error("Failed to resolve session", err);
  }

  req.auth = auth;
  next();
}
