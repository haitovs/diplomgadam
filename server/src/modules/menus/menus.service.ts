import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { media, menuItems, menuSections } from "../../db/schema.js";
import { badRequest, notFound } from "../../lib/errors.js";
import { normaliseLocalized } from "../../lib/i18n.js";
import type {
  ItemCreateInput,
  ItemUpdateInput,
  SectionCreateInput,
  SectionUpdateInput,
} from "./menus.schemas.js";

/**
 * Every function here takes the store id first and includes it in the WHERE
 * clause, so an id belonging to another store resolves to "not found" rather
 * than to someone else's data. This is the second half of the tenancy story:
 * the guard proves who you are, these queries make a guessed id useless.
 */

export async function getMenu(storeId: string) {
  const [sections, items] = await Promise.all([
    db
      .select()
      .from(menuSections)
      .where(eq(menuSections.storeId, storeId))
      .orderBy(asc(menuSections.sortOrder), asc(menuSections.createdAt)),
    db
      .select()
      .from(menuItems)
      .where(eq(menuItems.storeId, storeId))
      .orderBy(asc(menuItems.sortOrder), asc(menuItems.createdAt)),
  ]);

  return sections.map((section) => ({
    ...section,
    items: items.filter((item) => item.sectionId === section.id),
  }));
}

async function nextSortOrder(
  table: typeof menuSections | typeof menuItems,
  storeId: string,
): Promise<number> {
  const [row] = await db
    .select({ max: sql<number | null>`max(${table.sortOrder})` })
    .from(table)
    .where(eq(table.storeId, storeId));
  return (row?.max ?? -1) + 1;
}

// ── Sections ─────────────────────────────────────────────────────────────────

export async function createSection(storeId: string, input: SectionCreateInput) {
  const name = normaliseLocalized(input.name);
  if (Object.keys(name).length === 0) {
    throw badRequest("A section needs a name in at least one language");
  }

  const [section] = await db
    .insert(menuSections)
    .values({ storeId, name, sortOrder: await nextSortOrder(menuSections, storeId) })
    .returning();

  return section;
}

export async function updateSection(
  storeId: string,
  sectionId: string,
  input: SectionUpdateInput,
) {
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  if (input.name !== undefined) {
    const name = normaliseLocalized(input.name);
    if (Object.keys(name).length === 0) {
      throw badRequest("A section needs a name in at least one language");
    }
    patch.name = name;
  }

  const [section] = await db
    .update(menuSections)
    .set(patch)
    .where(and(eq(menuSections.id, sectionId), eq(menuSections.storeId, storeId)))
    .returning();

  if (!section) throw notFound("Menu section not found");
  return section;
}

export async function deleteSection(storeId: string, sectionId: string) {
  const [deleted] = await db
    .delete(menuSections)
    .where(and(eq(menuSections.id, sectionId), eq(menuSections.storeId, storeId)))
    .returning({ id: menuSections.id });

  if (!deleted) throw notFound("Menu section not found");
  return deleted;
}

// ── Items ────────────────────────────────────────────────────────────────────

/** Confirms a section belongs to this store before an item is attached to it. */
async function assertSectionOwned(storeId: string, sectionId: string) {
  const [section] = await db
    .select({ id: menuSections.id })
    .from(menuSections)
    .where(and(eq(menuSections.id, sectionId), eq(menuSections.storeId, storeId)))
    .limit(1);
  if (!section) throw badRequest("That menu section does not exist");
}

/** Confirms a photo belongs to this store before an item points at it. */
async function assertMediaOwned(storeId: string, mediaId: string) {
  const [image] = await db
    .select({ id: media.id })
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.storeId, storeId)))
    .limit(1);
  if (!image) throw badRequest("That image does not exist");
}

export async function createItem(storeId: string, input: ItemCreateInput) {
  await assertSectionOwned(storeId, input.sectionId);
  if (input.mediaId) await assertMediaOwned(storeId, input.mediaId);

  const name = normaliseLocalized(input.name);
  if (Object.keys(name).length === 0) {
    throw badRequest("A menu item needs a name in at least one language");
  }

  const [item] = await db
    .insert(menuItems)
    .values({
      storeId,
      sectionId: input.sectionId,
      name,
      description: normaliseLocalized(input.description),
      priceMinor: input.priceMinor,
      mediaId: input.mediaId ?? null,
      isAvailable: input.isAvailable,
      sortOrder: await nextSortOrder(menuItems, storeId),
    })
    .returning();

  return item;
}

export async function updateItem(
  storeId: string,
  itemId: string,
  input: ItemUpdateInput,
) {
  if (input.sectionId !== undefined) {
    await assertSectionOwned(storeId, input.sectionId);
  }
  if (input.mediaId) await assertMediaOwned(storeId, input.mediaId);

  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const key of ["sectionId", "priceMinor", "mediaId", "isAvailable"] as const) {
    if (input[key] !== undefined) patch[key] = input[key];
  }
  if (input.name !== undefined) {
    const name = normaliseLocalized(input.name);
    if (Object.keys(name).length === 0) {
      throw badRequest("A menu item needs a name in at least one language");
    }
    patch.name = name;
  }
  if (input.description !== undefined) {
    patch.description = normaliseLocalized(input.description);
  }

  const [item] = await db
    .update(menuItems)
    .set(patch)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, storeId)))
    .returning();

  if (!item) throw notFound("Menu item not found");
  return item;
}

export async function deleteItem(storeId: string, itemId: string) {
  const [deleted] = await db
    .delete(menuItems)
    .where(and(eq(menuItems.id, itemId), eq(menuItems.storeId, storeId)))
    .returning({ id: menuItems.id });

  if (!deleted) throw notFound("Menu item not found");
  return deleted;
}

// ── Ordering ─────────────────────────────────────────────────────────────────

async function reorder(
  table: typeof menuSections | typeof menuItems,
  storeId: string,
  ids: string[],
  label: string,
) {
  if (ids.length === 0) return;

  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) {
    throw badRequest(`The same ${label} appears more than once`);
  }

  // Reordering is a write against a caller-supplied list of ids, so confirm
  // every one belongs to this store before touching anything.
  const owned = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.storeId, storeId), inArray(table.id, unique)));

  if (owned.length !== unique.length) {
    throw badRequest(`One or more ${label}s do not belong to this store`);
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of unique.entries()) {
      await tx
        .update(table)
        .set({ sortOrder: index })
        .where(and(eq(table.id, id), eq(table.storeId, storeId)));
    }
  });
}

export const reorderSections = (storeId: string, ids: string[]) =>
  reorder(menuSections, storeId, ids, "section");

export const reorderItems = (storeId: string, ids: string[]) =>
  reorder(menuItems, storeId, ids, "item");
