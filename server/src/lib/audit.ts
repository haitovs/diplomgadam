import type { Request } from "express";
import { db } from "../db/client.js";
import { auditLog } from "../db/schema.js";

export interface AuditEntry {
  action: string;
  targetType?: string;
  targetId?: string | null;
  meta?: Record<string, unknown>;
}

/**
 * Writes an audit row from the request's authenticated actor. Failures are
 * logged but never propagate: losing an audit line must not roll back the
 * action the user actually asked for.
 */
export async function recordAudit(req: Request, entry: AuditEntry): Promise<void> {
  const auth = req.auth;

  let actorType = "system";
  let actorId: string | null = null;
  let actorLabel: string | null = null;

  if (auth?.storeUser) {
    actorType = "store_user";
    actorId = auth.storeUser.id;
    actorLabel = auth.storeUser.fullName;
  } else if (auth?.admin) {
    actorType = "admin";
    actorId = auth.admin.id;
    actorLabel = auth.admin.username;
  }

  try {
    await db.insert(auditLog).values({
      actorType,
      actorId,
      actorLabel,
      impersonatedByAdminId: auth?.storeUser?.impersonatedByAdminId ?? null,
      action: entry.action,
      targetType: entry.targetType ?? null,
      targetId: entry.targetId ?? null,
      meta: entry.meta ?? {},
      ip: req.ip ?? null,
    });
  } catch (err) {
    console.error("Failed to write audit entry", entry.action, err);
  }
}

/**
 * Shallow diff of the fields a request actually changed, so the audit log
 * records what moved rather than a full copy of the row.
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>,
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};
  for (const [key, next] of Object.entries(after)) {
    if (next === undefined) continue;
    const prev = before[key];
    if (JSON.stringify(prev) !== JSON.stringify(next)) {
      changes[key] = { from: prev, to: next };
    }
  }
  return changes;
}
