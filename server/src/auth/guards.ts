import { eq } from "drizzle-orm";
import type { NextFunction, Request, RequestHandler, Response } from "express";
import { db } from "../db/client.js";
import { stores, type AdminRole } from "../db/schema.js";
import { forbidden, notFound, unauthorized } from "../lib/errors.js";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-9a-f][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const requireAdmin: RequestHandler = (req, _res, next) => {
  if (!req.auth?.admin) return next(unauthorized("Admin sign-in required"));
  next();
};

/** Restricts a route to specific admin roles. Owners outrank moderators. */
export function requireAdminRole(...roles: AdminRole[]): RequestHandler {
  return (req, _res, next) => {
    const admin = req.auth?.admin;
    if (!admin) return next(unauthorized("Admin sign-in required"));
    if (!roles.includes(admin.role)) {
      return next(forbidden("Your admin role does not allow this action"));
    }
    next();
  };
}

export const requireStoreUser: RequestHandler = (req, _res, next) => {
  if (!req.auth?.storeUser) return next(unauthorized("Store sign-in required"));
  next();
};

/**
 * The single place that decides whether a request may touch a given store.
 *
 * The target store is taken from the `:storeId` route parameter when present,
 * otherwise from the signed-in owner's session. It is deliberately never read
 * from the request body, so a body field cannot redirect a write at someone
 * else's store. Child resources (menu items, media) are always mounted under a
 * route that carries the store, so they inherit this check rather than
 * repeating it.
 */
export function requireStoreAccess(): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    const fromRoute = req.params.storeId;
    const fromSession = req.auth?.storeUser?.storeId;
    const target = fromRoute ?? fromSession;

    if (!target) return next(unauthorized("Store sign-in required"));
    if (!UUID_RE.test(target)) return next(notFound("Store not found"));

    if (req.auth?.admin) {
      req.storeId = target;
      return next();
    }

    if (!fromSession) return next(unauthorized("Store sign-in required"));
    if (fromSession !== target) {
      return next(forbidden("You do not have access to this store"));
    }

    req.storeId = target;
    next();
  };
}

/**
 * Blocks writes for stores that are not in a state where an owner may change
 * them. Admins are exempt so they can still correct a suspended listing.
 */
export const requireWritableStore: RequestHandler = (req, _res, next) => {
  const storeId = req.storeId;
  if (!storeId) return next(unauthorized("Store sign-in required"));
  if (req.auth?.admin) return next();

  db.select({ status: stores.status })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1)
    .then(([row]) => {
      if (!row) return next(notFound("Store not found"));
      if (row.status === "suspended") {
        return next(
          forbidden("This store is suspended. Contact an administrator."),
        );
      }
      next();
    })
    .catch(next);
};

/**
 * Forces a password change before anything else can be done. Applied to every
 * authenticated route except the change-password and sign-out endpoints.
 */
export const requirePasswordChanged: RequestHandler = (req, _res, next) => {
  const subject = req.auth?.storeUser ?? req.auth?.admin;
  if (subject?.mustChangePassword) {
    return next(forbidden("You must change your password before continuing"));
  }
  next();
};
