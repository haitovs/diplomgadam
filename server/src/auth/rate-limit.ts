import { and, desc, eq, gt, sql } from "drizzle-orm";
import { config } from "../config/index.js";
import { db } from "../db/client.js";
import { loginAttempts } from "../db/schema.js";
import { tooManyRequests } from "../lib/errors.js";

/**
 * Login throttling is kept in Postgres rather than memory so a lockout is not
 * cleared by restarting the container, and so it still holds if the app is
 * ever run as more than one instance.
 */

const windowStart = () =>
  new Date(Date.now() - config.LOGIN_LOCKOUT_MINUTES * 60 * 1000);

export async function recordLoginAttempt(
  identifier: string,
  ip: string | undefined,
  success: boolean,
): Promise<void> {
  await db.insert(loginAttempts).values({
    identifier: identifier.toLowerCase(),
    ip: ip ?? null,
    success,
  });
}

/**
 * Throws once an identifier or an IP has accumulated too many failures inside
 * the lockout window. Counting failures *since the last success* means a
 * legitimate login clears the slate.
 */
export async function assertLoginAllowed(
  identifier: string,
  ip: string | undefined,
): Promise<void> {
  const since = windowStart();
  const id = identifier.toLowerCase();

  const [lastSuccess] = await db
    .select({ createdAt: loginAttempts.createdAt })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, id),
        eq(loginAttempts.success, true),
        gt(loginAttempts.createdAt, since),
      ),
    )
    .orderBy(desc(loginAttempts.createdAt))
    .limit(1);

  const countFrom = lastSuccess?.createdAt ?? since;

  const [byIdentifier] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.identifier, id),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, countFrom),
      ),
    );

  if ((byIdentifier?.count ?? 0) >= config.LOGIN_MAX_ATTEMPTS) {
    throw tooManyRequests(
      `Too many failed attempts. Try again in ${config.LOGIN_LOCKOUT_MINUTES} minutes.`,
    );
  }

  if (!ip) return;

  // A wider ceiling per IP catches someone spraying many accounts from one
  // host without locking out a whole office sharing an address too eagerly.
  const [byIp] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(loginAttempts)
    .where(
      and(
        eq(loginAttempts.ip, ip),
        eq(loginAttempts.success, false),
        gt(loginAttempts.createdAt, since),
      ),
    );

  if ((byIp?.count ?? 0) >= config.LOGIN_MAX_ATTEMPTS * 5) {
    throw tooManyRequests(
      `Too many failed attempts from this address. Try again in ${config.LOGIN_LOCKOUT_MINUTES} minutes.`,
    );
  }
}

/** Removes attempt rows older than the window; called periodically. */
export async function purgeOldLoginAttempts(): Promise<void> {
  await db
    .delete(loginAttempts)
    .where(sql`${loginAttempts.createdAt} < now() - interval '1 day'`);
}
