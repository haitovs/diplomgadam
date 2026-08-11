import { createHash, randomBytes } from "crypto";
import { and, eq, lt } from "drizzle-orm";
import type { CookieOptions, Response } from "express";
import { config } from "../config/index.js";
import { db } from "../db/client.js";
import { sessions, type SubjectType } from "../db/schema.js";

export const ADMIN_COOKIE = "gadam_admin";
export const STORE_COOKIE = "gadam_store";

/**
 * Admins and store owners get separate cookies so an admin using "view as
 * store" keeps their own session instead of being logged out of the panel.
 */
export function cookieNameFor(subjectType: SubjectType): string {
  return subjectType === "admin" ? ADMIN_COOKIE : STORE_COOKIE;
}

function cookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: config.secureCookies,
    path: "/",
    maxAge: config.sessionTtlMs,
  };
}

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

export interface IssueSessionInput {
  subjectType: SubjectType;
  subjectId: string;
  impersonatedByAdminId?: string | null;
  ip?: string | null;
  userAgent?: string | null;
}

/**
 * Creates a session and returns the raw token. Only its SHA-256 hash is
 * persisted, so a database leak does not hand over live sessions.
 */
export async function issueSession(
  res: Response,
  input: IssueSessionInput,
): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + config.sessionTtlMs);

  await db.insert(sessions).values({
    subjectType: input.subjectType,
    subjectId: input.subjectId,
    tokenHash: hashToken(token),
    expiresAt,
    impersonatedByAdminId: input.impersonatedByAdminId ?? null,
    ip: input.ip ?? null,
    userAgent: input.userAgent?.slice(0, 512) ?? null,
  });

  res.cookie(cookieNameFor(input.subjectType), token, cookieOptions());
  return token;
}

export interface ResolvedSession {
  id: string;
  subjectType: SubjectType;
  subjectId: string;
  impersonatedByAdminId: string | null;
  lastSeenAt: Date;
}

/** Returns the session for a raw token, or null when missing or expired. */
export async function resolveSession(
  token: string | undefined,
  expectedType: SubjectType,
): Promise<ResolvedSession | null> {
  if (!token) return null;

  const [row] = await db
    .select()
    .from(sessions)
    .where(eq(sessions.tokenHash, hashToken(token)))
    .limit(1);

  if (!row) return null;
  if (row.subjectType !== expectedType) return null;
  if (row.expiresAt.getTime() <= Date.now()) {
    await db.delete(sessions).where(eq(sessions.id, row.id));
    return null;
  }

  return {
    id: row.id,
    subjectType: row.subjectType as SubjectType,
    subjectId: row.subjectId,
    impersonatedByAdminId: row.impersonatedByAdminId,
    lastSeenAt: row.lastSeenAt,
  };
}

/** How stale `lastSeenAt` may get before it is worth another write. */
const TOUCH_INTERVAL_MS = 15 * 60 * 1000;

/**
 * Records that a session is still in use. Skipped unless the stored timestamp
 * is already stale: this is only used to show an operator when someone last
 * signed in, and writing a row on every single request would add a database
 * write to every page view for no benefit.
 */
export async function touchSession(
  sessionId: string,
  lastSeenAt: Date,
): Promise<void> {
  if (Date.now() - lastSeenAt.getTime() < TOUCH_INTERVAL_MS) return;
  await db
    .update(sessions)
    .set({ lastSeenAt: new Date() })
    .where(eq(sessions.id, sessionId));
}

export async function revokeSession(
  res: Response,
  sessionId: string,
  subjectType: SubjectType,
): Promise<void> {
  await db.delete(sessions).where(eq(sessions.id, sessionId));
  res.clearCookie(cookieNameFor(subjectType), { ...cookieOptions(), maxAge: undefined });
}

/**
 * Drops every session belonging to a subject. Used when a store is suspended
 * or a password is reset, so revocation takes effect immediately.
 */
export async function revokeAllSessionsFor(
  subjectType: SubjectType,
  subjectId: string,
): Promise<void> {
  await db
    .delete(sessions)
    .where(
      and(eq(sessions.subjectType, subjectType), eq(sessions.subjectId, subjectId)),
    );
}

export async function purgeExpiredSessions(): Promise<number> {
  const deleted = await db
    .delete(sessions)
    .where(lt(sessions.expiresAt, new Date()))
    .returning({ id: sessions.id });
  return deleted.length;
}
