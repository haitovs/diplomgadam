import { and, desc, eq, ilike, inArray, or, sql, type SQL } from "drizzle-orm";
import { hashPassword } from "../../auth/password.js";
import { revokeAllSessionsFor } from "../../auth/sessions.js";
import { db } from "../../db/client.js";
import {
  admins,
  auditLog,
  categories,
  media,
  menuItems,
  storeCategories,
  storeUsers,
  stores,
  type AdminRole,
  type StoreStatus,
} from "../../db/schema.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { normaliseLocalized } from "../../lib/i18n.js";
import { slugify } from "../../lib/slug.js";
import { removeStoreDirectory } from "../media/media.service.js";

export interface StoreListQuery {
  status?: StoreStatus;
  search?: string;
  page: number;
  perPage: number;
}

export async function listStores(query: StoreListQuery) {
  const filters: SQL[] = [];

  if (query.status) filters.push(eq(stores.status, query.status));

  if (query.search) {
    const term = `%${query.search}%`;
    // The name is JSONB across three languages; casting to text searches all
    // of them at once, which is what a moderator typing a name expects.
    filters.push(
      or(
        sql`${stores.name}::text ILIKE ${term}`,
        ilike(stores.slug, term),
        ilike(stores.phone, term),
        ilike(stores.neighborhood, term),
      )!,
    );
  }

  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: stores.id,
        slug: stores.slug,
        status: stores.status,
        primaryLang: stores.primaryLang,
        name: stores.name,
        neighborhood: stores.neighborhood,
        phone: stores.phone,
        views: stores.views,
        submittedAt: stores.submittedAt,
        reviewedAt: stores.reviewedAt,
        createdAt: stores.createdAt,
        updatedAt: stores.updatedAt,
      })
      .from(stores)
      .where(where)
      .orderBy(desc(stores.submittedAt), desc(stores.createdAt))
      .limit(query.perPage)
      .offset((query.page - 1) * query.perPage),
    db
      .select({ total: sql<number>`count(*)::int` })
      .from(stores)
      .where(where),
  ]);

  return { stores: rows, total, page: query.page, perPage: query.perPage };
}

export async function getDashboardStats() {
  const [byStatus, [counts], recent] = await Promise.all([
    db
      .select({ status: stores.status, count: sql<number>`count(*)::int` })
      .from(stores)
      .groupBy(stores.status),
    db
      .select({
        owners: sql<number>`(select count(*)::int from ${storeUsers})`,
        menuItems: sql<number>`(select count(*)::int from ${menuItems})`,
        images: sql<number>`(select count(*)::int from ${media})`,
        storageBytes: sql<number>`(select coalesce(sum(${media.bytes}), 0)::bigint from ${media})`,
        totalViews: sql<number>`(select coalesce(sum(${stores.views}), 0)::bigint from ${stores})`,
      })
      .from(sql`(select 1) as _`),
    db
      .select({
        id: stores.id,
        name: stores.name,
        status: stores.status,
        createdAt: stores.createdAt,
      })
      .from(stores)
      .orderBy(desc(stores.createdAt))
      .limit(8),
  ]);

  const statusCounts: Record<string, number> = {
    draft: 0, pending: 0, approved: 0, rejected: 0, suspended: 0,
  };
  for (const row of byStatus) statusCounts[row.status] = row.count;

  return { statusCounts, totals: counts, recent };
}

/**
 * Deletes a store and everything hanging off it. Cascades handle the database
 * rows; the upload directory has to be removed explicitly.
 */
export async function deleteStore(storeId: string) {
  const [store] = await db
    .select({ id: stores.id, slug: stores.slug })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  if (!store) throw notFound("Store not found");

  const owners = await db
    .select({ id: storeUsers.id })
    .from(storeUsers)
    .where(eq(storeUsers.storeId, storeId));

  await Promise.all(owners.map((o) => revokeAllSessionsFor("store_user", o.id)));
  await db.delete(stores).where(eq(stores.id, storeId));
  await removeStoreDirectory(storeId);

  return store;
}

/** Issues a temporary password because there is no email to send a reset to. */
export async function resetOwnerPassword(storeId: string, userId: string, temporary: string) {
  const [user] = await db
    .select({ id: storeUsers.id, phone: storeUsers.phone })
    .from(storeUsers)
    .where(and(eq(storeUsers.id, userId), eq(storeUsers.storeId, storeId)))
    .limit(1);
  if (!user) throw notFound("Owner account not found");

  await db
    .update(storeUsers)
    .set({
      passwordHash: await hashPassword(temporary),
      mustChangePassword: true,
      updatedAt: new Date(),
    })
    .where(eq(storeUsers.id, userId));

  // Any session opened with the old password stops working immediately.
  await revokeAllSessionsFor("store_user", userId);

  return user;
}

export async function setOwnerActive(
  storeId: string,
  userId: string,
  isActive: boolean,
) {
  const [user] = await db
    .update(storeUsers)
    .set({ isActive, updatedAt: new Date() })
    .where(and(eq(storeUsers.id, userId), eq(storeUsers.storeId, storeId)))
    .returning({ id: storeUsers.id, phone: storeUsers.phone });
  if (!user) throw notFound("Owner account not found");

  if (!isActive) await revokeAllSessionsFor("store_user", userId);
  return user;
}

/** The account an admin signs in as when using "view as store". */
export async function primaryOwnerFor(storeId: string) {
  const [user] = await db
    .select({ id: storeUsers.id, fullName: storeUsers.fullName })
    .from(storeUsers)
    .where(and(eq(storeUsers.storeId, storeId), eq(storeUsers.isActive, true)))
    .orderBy(storeUsers.createdAt)
    .limit(1);
  if (!user) throw badRequest("This store has no active owner account");
  return user;
}

// ── Categories ───────────────────────────────────────────────────────────────

export async function listCategoriesWithCounts() {
  // Counted with a grouped query rather than a correlated subquery: Drizzle
  // renders columns unqualified inside a raw `sql` template, which silently
  // broke the correlation and reported zero for every category.
  const [rows, counts] = await Promise.all([
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
        sortOrder: categories.sortOrder,
      })
      .from(categories)
      .orderBy(categories.sortOrder, categories.slug),
    db
      .select({
        categoryId: storeCategories.categoryId,
        count: sql<number>`count(*)::int`,
      })
      .from(storeCategories)
      .groupBy(storeCategories.categoryId),
  ]);

  const countByCategory = new Map(counts.map((c) => [c.categoryId, c.count]));

  return rows.map((row) => ({
    ...row,
    storeCount: countByCategory.get(row.id) ?? 0,
  }));
}

export async function createCategory(input: {
  name: Record<string, string | undefined>;
  icon?: string | null;
  slug?: string | null;
}) {
  const name = normaliseLocalized(input.name);
  const label = name.en ?? name.tk ?? name.ru;
  if (!label) throw badRequest("A category needs a name in at least one language");

  const slug = slugify(input.slug || label);
  if (!slug) throw badRequest("Could not derive a slug for this category");

  const [existing] = await db
    .select({ id: categories.id })
    .from(categories)
    .where(eq(categories.slug, slug))
    .limit(1);
  if (existing) throw conflict("A category with that slug already exists");

  const [{ max }] = await db
    .select({ max: sql<number | null>`max(${categories.sortOrder})` })
    .from(categories);

  const [row] = await db
    .insert(categories)
    .values({ slug, name, icon: input.icon ?? null, sortOrder: (max ?? -1) + 1 })
    .returning();

  return row;
}

export async function updateCategory(
  categoryId: string,
  input: { name?: Record<string, string | undefined>; icon?: string | null },
) {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) {
    const name = normaliseLocalized(input.name);
    if (Object.keys(name).length === 0) {
      throw badRequest("A category needs a name in at least one language");
    }
    patch.name = name;
  }
  if (input.icon !== undefined) patch.icon = input.icon;

  const [row] = await db
    .update(categories)
    .set(patch)
    .where(eq(categories.id, categoryId))
    .returning();
  if (!row) throw notFound("Category not found");
  return row;
}

export async function deleteCategory(categoryId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(storeCategories)
    .where(eq(storeCategories.categoryId, categoryId));

  if (count > 0) {
    throw conflict(
      `${count} store${count === 1 ? "" : "s"} still use this category`,
    );
  }

  const [row] = await db
    .delete(categories)
    .where(eq(categories.id, categoryId))
    .returning({ id: categories.id });
  if (!row) throw notFound("Category not found");
  return row;
}

export async function reorderCategories(ids: string[]) {
  const unique = [...new Set(ids)];
  const owned = await db
    .select({ id: categories.id })
    .from(categories)
    .where(inArray(categories.id, unique));
  if (owned.length !== unique.length) {
    throw badRequest("One or more categories do not exist");
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of unique.entries()) {
      await tx
        .update(categories)
        .set({ sortOrder: index })
        .where(eq(categories.id, id));
    }
  });
}

// ── Admin accounts ───────────────────────────────────────────────────────────

export async function listAdmins() {
  return db
    .select({
      id: admins.id,
      username: admins.username,
      name: admins.name,
      role: admins.role,
      isActive: admins.isActive,
      mustChangePassword: admins.mustChangePassword,
      lastLoginAt: admins.lastLoginAt,
      createdAt: admins.createdAt,
    })
    .from(admins)
    .orderBy(admins.createdAt);
}

export async function createAdmin(input: {
  username: string;
  name: string;
  role: AdminRole;
  password: string;
}) {
  const [existing] = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.username, input.username))
    .limit(1);
  if (existing) throw conflict("That username is already taken");

  const [row] = await db
    .insert(admins)
    .values({
      username: input.username,
      name: input.name,
      role: input.role,
      passwordHash: await hashPassword(input.password),
      mustChangePassword: true,
    })
    .returning({
      id: admins.id,
      username: admins.username,
      name: admins.name,
      role: admins.role,
    });

  return row;
}

/** Guards against removing or demoting the last usable owner account. */
async function assertNotLastOwner(adminId: string) {
  const [{ count }] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(admins)
    .where(
      and(
        eq(admins.role, "owner"),
        eq(admins.isActive, true),
        sql`${admins.id} <> ${adminId}`,
      ),
    );
  if (count === 0) {
    throw badRequest("This is the last active owner account; it cannot be removed or demoted");
  }
}

export async function updateAdmin(
  adminId: string,
  input: { name?: string; role?: AdminRole; isActive?: boolean },
) {
  const [target] = await db
    .select()
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);
  if (!target) throw notFound("Admin not found");

  const losingOwnership =
    (input.role !== undefined && input.role !== "owner" && target.role === "owner") ||
    (input.isActive === false && target.role === "owner");
  if (losingOwnership) await assertNotLastOwner(adminId);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) patch.name = input.name;
  if (input.role !== undefined) patch.role = input.role;
  if (input.isActive !== undefined) patch.isActive = input.isActive;

  const [row] = await db
    .update(admins)
    .set(patch)
    .where(eq(admins.id, adminId))
    .returning({
      id: admins.id,
      username: admins.username,
      name: admins.name,
      role: admins.role,
      isActive: admins.isActive,
    });

  if (input.isActive === false) await revokeAllSessionsFor("admin", adminId);
  return row;
}

export async function resetAdminPassword(adminId: string, temporary: string) {
  const [target] = await db
    .select({ id: admins.id, username: admins.username })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);
  if (!target) throw notFound("Admin not found");

  await db
    .update(admins)
    .set({
      passwordHash: await hashPassword(temporary),
      mustChangePassword: true,
      updatedAt: new Date(),
    })
    .where(eq(admins.id, adminId));

  await revokeAllSessionsFor("admin", adminId);
  return target;
}

export async function deleteAdmin(adminId: string) {
  const [target] = await db
    .select({ id: admins.id, username: admins.username, role: admins.role })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);
  if (!target) throw notFound("Admin not found");

  if (target.role === "owner") await assertNotLastOwner(adminId);

  await revokeAllSessionsFor("admin", adminId);
  await db.delete(admins).where(eq(admins.id, adminId));
  return target;
}

// ── Audit ────────────────────────────────────────────────────────────────────

export async function listAudit(query: {
  action?: string;
  targetId?: string;
  page: number;
  perPage: number;
}) {
  const filters: SQL[] = [];
  if (query.action) filters.push(eq(auditLog.action, query.action));
  if (query.targetId) filters.push(eq(auditLog.targetId, query.targetId));
  const where = filters.length > 0 ? and(...filters) : undefined;

  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(auditLog)
      .where(where)
      .orderBy(desc(auditLog.createdAt))
      .limit(query.perPage)
      .offset((query.page - 1) * query.perPage),
    db.select({ total: sql<number>`count(*)::int` }).from(auditLog).where(where),
  ]);

  return { entries: rows, total, page: query.page, perPage: query.perPage };
}
