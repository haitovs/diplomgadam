import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { hashPassword } from "../../auth/password.js";
import { revokeAllSessionsFor } from "../../auth/sessions.js";
import { config } from "../../config/index.js";
import { db } from "../../db/client.js";
import {
  categories,
  media,
  storeCategories,
  storeHours,
  storeSpecialHours,
  storeUsers,
  stores,
  type Lang,
  type StoreStatus,
} from "../../db/schema.js";
import { badRequest, conflict, notFound } from "../../lib/errors.js";
import { normaliseLocalized } from "../../lib/i18n.js";
import { uniqueSlug } from "../../lib/slug.js";
import type {
  HoursInput,
  RegisterInput,
  SpecialHoursInput,
  UpdateStoreInput,
} from "./stores.schemas.js";

async function slugTaken(candidate: string): Promise<boolean> {
  const [row] = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.slug, candidate))
    .limit(1);
  return Boolean(row);
}

/**
 * Creates a store in `draft` together with its first owner account. Both rows
 * are written in one transaction: an owner without a store, or a store nobody
 * can sign in to, would both be unrecoverable without admin surgery.
 */
export async function registerStore(input: RegisterInput) {
  const [existingUser] = await db
    .select({ id: storeUsers.id })
    .from(storeUsers)
    .where(eq(storeUsers.phone, input.owner.phone))
    .limit(1);

  if (existingUser) {
    throw conflict("An account already exists for this phone number");
  }

  const name = normaliseLocalized(input.store.name);
  const primaryName = name[input.store.primaryLang];
  if (!primaryName) {
    throw badRequest(
      `The store name is required in the primary language (${input.store.primaryLang})`,
    );
  }

  const slug = await uniqueSlug(primaryName, slugTaken);
  const passwordHash = await hashPassword(input.owner.password);

  return db.transaction(async (tx) => {
    const [store] = await tx
      .insert(stores)
      .values({
        slug,
        status: "draft",
        primaryLang: input.store.primaryLang,
        name,
        phone: input.store.phone,
      })
      .returning();

    const [user] = await tx
      .insert(storeUsers)
      .values({
        storeId: store.id,
        phone: input.owner.phone,
        passwordHash,
        fullName: input.owner.fullName,
        position: input.owner.position ?? null,
        personalPhone: input.owner.personalPhone ?? null,
      })
      .returning();

    return { store, user };
  });
}

export async function findStoreById(storeId: string) {
  const [store] = await db
    .select()
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  return store ?? null;
}

/** Full record for the owner portal and the admin editor. */
export async function getStoreDetail(storeId: string) {
  const store = await findStoreById(storeId);
  if (!store) throw notFound("Store not found");

  const [hours, specialHours, cats, images, owners] = await Promise.all([
    db
      .select()
      .from(storeHours)
      .where(eq(storeHours.storeId, storeId))
      .orderBy(asc(storeHours.weekday), asc(storeHours.opens)),
    db
      .select()
      .from(storeSpecialHours)
      .where(eq(storeSpecialHours.storeId, storeId))
      .orderBy(asc(storeSpecialHours.date)),
    db
      .select({
        id: categories.id,
        slug: categories.slug,
        name: categories.name,
        icon: categories.icon,
      })
      .from(storeCategories)
      .innerJoin(categories, eq(storeCategories.categoryId, categories.id))
      .where(eq(storeCategories.storeId, storeId))
      .orderBy(asc(categories.sortOrder)),
    db
      .select()
      .from(media)
      .where(eq(media.storeId, storeId))
      .orderBy(asc(media.kind), asc(media.sortOrder)),
    db
      .select({
        id: storeUsers.id,
        phone: storeUsers.phone,
        fullName: storeUsers.fullName,
        position: storeUsers.position,
        personalPhone: storeUsers.personalPhone,
        isActive: storeUsers.isActive,
        lastLoginAt: storeUsers.lastLoginAt,
      })
      .from(storeUsers)
      .where(eq(storeUsers.storeId, storeId))
      .orderBy(asc(storeUsers.createdAt)),
  ]);

  return { store, hours, specialHours, categories: cats, media: images, owners };
}

export async function updateStore(storeId: string, input: UpdateStoreInput) {
  const existing = await findStoreById(storeId);
  if (!existing) throw notFound("Store not found");

  const patch: Record<string, unknown> = { updatedAt: new Date() };

  for (const key of [
    "neighborhood", "lat", "lng", "priceTier", "phone", "phoneSecondary",
    "website", "instagram", "tiktok", "telegram", "whatsapp", "dineIn",
    "takeaway", "delivery", "deliveryPhone", "reservationPhone", "capacity",
    "banquetHall", "amenities", "paymentMethods", "temporarilyClosed",
    "openingSoon", "businessRegNo",
  ] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }

  for (const key of ["name", "description", "address", "closureNote"] as const) {
    if (input[key] !== undefined) patch[key] = normaliseLocalized(input[key]);
  }

  // Renaming keeps the original slug: public URLs that already exist should
  // not break, and the slug is not shown as the store's identity anywhere.
  if (input.name !== undefined) {
    const next = normaliseLocalized(input.name);
    if (!next[existing.primaryLang as Lang]) {
      throw badRequest(
        `The store name is required in the primary language (${existing.primaryLang})`,
      );
    }
  }

  const [updated] = await db
    .update(stores)
    .set(patch)
    .where(eq(stores.id, storeId))
    .returning();

  return { before: existing, after: updated };
}

export async function replaceHours(storeId: string, input: HoursInput) {
  await db.transaction(async (tx) => {
    await tx.delete(storeHours).where(eq(storeHours.storeId, storeId));
    if (input.hours.length === 0) return;
    await tx.insert(storeHours).values(
      input.hours.map((h) => ({
        storeId,
        weekday: h.weekday,
        isClosed: h.isClosed,
        opens: h.isClosed ? null : (h.opens ?? null),
        closes: h.isClosed ? null : (h.closes ?? null),
      })),
    );
  });
}

export async function replaceSpecialHours(
  storeId: string,
  input: SpecialHoursInput,
) {
  const seen = new Set<string>();
  for (const entry of input.entries) {
    if (seen.has(entry.date)) {
      throw badRequest(`Duplicate special-hours entry for ${entry.date}`);
    }
    seen.add(entry.date);
  }

  await db.transaction(async (tx) => {
    await tx
      .delete(storeSpecialHours)
      .where(eq(storeSpecialHours.storeId, storeId));
    if (input.entries.length === 0) return;
    await tx.insert(storeSpecialHours).values(
      input.entries.map((e) => ({
        storeId,
        date: e.date,
        isClosed: e.isClosed,
        opens: e.isClosed ? null : (e.opens ?? null),
        closes: e.isClosed ? null : (e.closes ?? null),
        note: normaliseLocalized(e.note),
      })),
    );
  });
}

export async function setStoreCategories(storeId: string, categoryIds: string[]) {
  const unique = [...new Set(categoryIds)];

  if (unique.length > 0) {
    const found = await db
      .select({ id: categories.id })
      .from(categories)
      .where(inArray(categories.id, unique));
    if (found.length !== unique.length) {
      throw badRequest("One or more categories do not exist");
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(storeCategories).where(eq(storeCategories.storeId, storeId));
    if (unique.length === 0) return;
    await tx
      .insert(storeCategories)
      .values(unique.map((categoryId) => ({ storeId, categoryId })));
  });
}

/**
 * What still stands between a draft and the review queue. Returned as stable
 * keys so the portal can translate them and link to the right section.
 */
export async function getSubmissionBlockers(storeId: string): Promise<string[]> {
  const store = await findStoreById(storeId);
  if (!store) throw notFound("Store not found");

  const lang = store.primaryLang as Lang;
  const blockers: string[] = [];

  if (!store.name?.[lang]?.trim()) blockers.push("name");
  if (!store.description?.[lang]?.trim()) blockers.push("description");
  if (!store.address?.[lang]?.trim()) blockers.push("address");
  if (store.lat === null || store.lng === null) blockers.push("location");
  if (!store.phone) blockers.push("phone");

  const [[{ categoryCount }], [{ coverCount }], [{ proofCount }], [{ hourCount }]] =
    await Promise.all([
      db
        .select({ categoryCount: sql<number>`count(*)::int` })
        .from(storeCategories)
        .where(eq(storeCategories.storeId, storeId)),
      db
        .select({ coverCount: sql<number>`count(*)::int` })
        .from(media)
        .where(and(eq(media.storeId, storeId), eq(media.kind, "cover"))),
      db
        .select({ proofCount: sql<number>`count(*)::int` })
        .from(media)
        .where(and(eq(media.storeId, storeId), eq(media.kind, "venue_proof"))),
      db
        .select({ hourCount: sql<number>`count(*)::int` })
        .from(storeHours)
        .where(eq(storeHours.storeId, storeId)),
    ]);

  if (categoryCount === 0) blockers.push("categories");
  if (coverCount === 0) blockers.push("cover");
  if (proofCount < config.MIN_VENUE_PROOF_IMAGES) blockers.push("venue_photos");
  if (hourCount === 0) blockers.push("hours");

  return blockers;
}

const SUBMITTABLE: StoreStatus[] = ["draft", "rejected"];

export async function submitForReview(storeId: string) {
  const store = await findStoreById(storeId);
  if (!store) throw notFound("Store not found");

  if (!SUBMITTABLE.includes(store.status as StoreStatus)) {
    throw badRequest(
      store.status === "pending"
        ? "This listing is already awaiting review"
        : "This listing cannot be submitted from its current state",
    );
  }

  const blockers = await getSubmissionBlockers(storeId);
  if (blockers.length > 0) {
    throw badRequest("The listing is not complete yet", { blockers });
  }

  const [updated] = await db
    .update(stores)
    .set({
      status: "pending",
      submittedAt: new Date(),
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId))
    .returning();

  return updated;
}

// ── Moderation transitions, called by the admin module ───────────────────────

export async function approveStore(storeId: string, adminId: string) {
  const store = await findStoreById(storeId);
  if (!store) throw notFound("Store not found");
  if (store.status !== "pending") {
    throw badRequest("Only a listing awaiting review can be approved");
  }

  const [updated] = await db
    .update(stores)
    .set({
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: adminId,
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId))
    .returning();

  return updated;
}

export async function rejectStore(
  storeId: string,
  adminId: string,
  reason: string,
) {
  const store = await findStoreById(storeId);
  if (!store) throw notFound("Store not found");
  if (store.status !== "pending") {
    throw badRequest("Only a listing awaiting review can be rejected");
  }

  const [updated] = await db
    .update(stores)
    .set({
      status: "rejected",
      reviewedAt: new Date(),
      reviewedBy: adminId,
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId))
    .returning();

  return updated;
}

export async function suspendStore(
  storeId: string,
  adminId: string,
  reason: string,
) {
  const store = await findStoreById(storeId);
  if (!store) throw notFound("Store not found");
  if (store.status !== "approved") {
    throw badRequest("Only a published listing can be suspended");
  }

  const [updated] = await db
    .update(stores)
    .set({
      status: "suspended",
      reviewedAt: new Date(),
      reviewedBy: adminId,
      rejectionReason: reason,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId))
    .returning();

  // Sign the owners out immediately rather than leaving live sessions on a
  // store that has just been taken down.
  const owners = await db
    .select({ id: storeUsers.id })
    .from(storeUsers)
    .where(eq(storeUsers.storeId, storeId));
  await Promise.all(
    owners.map((o) => revokeAllSessionsFor("store_user", o.id)),
  );

  return updated;
}

export async function reinstateStore(storeId: string, adminId: string) {
  const store = await findStoreById(storeId);
  if (!store) throw notFound("Store not found");
  if (store.status !== "suspended") {
    throw badRequest("Only a suspended listing can be reinstated");
  }

  const [updated] = await db
    .update(stores)
    .set({
      status: "approved",
      reviewedAt: new Date(),
      reviewedBy: adminId,
      rejectionReason: null,
      updatedAt: new Date(),
    })
    .where(eq(stores.id, storeId))
    .returning();

  return updated;
}
