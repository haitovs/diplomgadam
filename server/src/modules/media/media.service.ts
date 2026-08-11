import { randomBytes } from "crypto";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import fs from "fs/promises";
import path from "path";
import sharp, { type Metadata, type Sharp } from "sharp";
import { config } from "../../config/index.js";
import { db } from "../../db/client.js";
import { media, menuItems, stores, type MediaKind } from "../../db/schema.js";
import { badRequest, conflict, notFound, unprocessable } from "../../lib/errors.js";

/**
 * How many images of each kind a store may hold. Without a ceiling a single
 * store can fill the disk, and there is no billing relationship here to make
 * that anyone's problem but the operator's.
 */
export const QUOTAS: Record<MediaKind, number> = {
  cover: 1,
  gallery: config.MAX_GALLERY_IMAGES,
  venue_proof: 10,
  menu_item: 500,
};

/** Long edge in pixels for each generated variant. */
const VARIANTS = { full: 1600, thumb: 480 } as const;
export type Variant = keyof typeof VARIANTS;

/**
 * Venue photos are submitted as evidence that the applicant really runs the
 * restaurant. They are for moderators, not visitors, so they are stored
 * outside the publicly served directory and reached only through an
 * authenticated route.
 */
export const isPrivateKind = (kind: MediaKind) => kind === "venue_proof";

export const PUBLIC_ROOT = "public";
export const PRIVATE_ROOT = "private";

export function storeDir(storeId: string, kind: MediaKind): string {
  return path.join(
    config.uploadDir,
    isPrivateKind(kind) ? PRIVATE_ROOT : PUBLIC_ROOT,
    storeId,
  );
}

/** Absolute path of one stored variant. */
export function mediaPath(
  storeId: string,
  kind: MediaKind,
  filename: string,
  variant: Variant,
  ext: "webp" | "jpg",
): string {
  return path.join(storeDir(storeId, kind), `${filename}.${variant}.${ext}`);
}

export function mediaUrl(
  row: Pick<typeof media.$inferSelect, "id" | "storeId" | "filename" | "kind">,
  variant: Variant,
  ext: "webp" | "jpg",
): string {
  if (isPrivateKind(row.kind as MediaKind)) {
    return `/api/media/${row.id}/${variant}.${ext}`;
  }
  return `/uploads/${PUBLIC_ROOT}/${row.storeId}/${row.filename}.${variant}.${ext}`;
}

export function serialiseMedia(row: typeof media.$inferSelect) {
  return {
    id: row.id,
    kind: row.kind as MediaKind,
    width: row.width,
    height: row.height,
    bytes: row.bytes,
    sortOrder: row.sortOrder,
    createdAt: row.createdAt,
    url: mediaUrl(row, "full", "webp"),
    urlJpeg: mediaUrl(row, "full", "jpg"),
    thumbUrl: mediaUrl(row, "thumb", "webp"),
    thumbUrlJpeg: mediaUrl(row, "thumb", "jpg"),
  };
}

async function countOfKind(storeId: string, kind: MediaKind): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(media)
    .where(and(eq(media.storeId, storeId), eq(media.kind, kind)));
  return row?.count ?? 0;
}

async function removeFiles(
  storeId: string,
  kind: MediaKind,
  filename: string,
): Promise<void> {
  const dir = storeDir(storeId, kind);
  const targets: string[] = [];
  for (const variant of Object.keys(VARIANTS) as Variant[]) {
    targets.push(path.join(dir, `${filename}.${variant}.webp`));
    targets.push(path.join(dir, `${filename}.${variant}.jpg`));
  }
  await Promise.all(
    targets.map((file) => fs.rm(file, { force: true }).catch(() => undefined)),
  );
}

/**
 * Decodes, normalises and stores an upload.
 *
 * The file is validated by actually decoding it rather than by trusting the
 * declared mimetype or the extension, so a script renamed to .jpg is rejected
 * here rather than being written to disk and served back later.
 */
export async function storeUpload(
  storeId: string,
  kind: MediaKind,
  buffer: Buffer,
  originalName: string,
) {
  const store = await db
    .select({ id: stores.id })
    .from(stores)
    .where(eq(stores.id, storeId))
    .limit(1);
  if (store.length === 0) throw notFound("Store not found");

  let pipeline: Sharp;
  let metadata: Metadata;
  try {
    pipeline = sharp(buffer, { failOn: "error" });
    metadata = await pipeline.metadata();
  } catch {
    throw unprocessable("That file is not a readable image");
  }

  if (!metadata.width || !metadata.height) {
    throw unprocessable("That file is not a readable image");
  }
  if (metadata.width < 200 || metadata.height < 200) {
    throw badRequest("Images must be at least 200×200 pixels");
  }

  // A cover replaces the previous one instead of failing, which is what an
  // owner swapping their main photo actually means.
  if (kind === "cover") {
    const [existing] = await db
      .select()
      .from(media)
      .where(and(eq(media.storeId, storeId), eq(media.kind, "cover")))
      .limit(1);
    if (existing) await deleteMedia(storeId, existing.id);
  } else {
    const used = await countOfKind(storeId, kind);
    if (used >= QUOTAS[kind]) {
      throw conflict(
        `You have reached the limit of ${QUOTAS[kind]} images for this section`,
      );
    }
  }

  const filename = randomBytes(16).toString("hex");
  const dir = storeDir(storeId, kind);
  await fs.mkdir(dir, { recursive: true });

  const written: string[] = [];
  let fullWidth = metadata.width;
  let fullHeight = metadata.height;
  let totalBytes = 0;

  try {
    for (const [variant, size] of Object.entries(VARIANTS) as [Variant, number][]) {
      // .rotate() applies the EXIF orientation; sharp then drops all metadata
      // by default, so location tags never reach the public directory.
      const base = sharp(buffer)
        .rotate()
        .resize({ width: size, height: size, fit: "inside", withoutEnlargement: true });

      const webpPath = path.join(dir, `${filename}.${variant}.webp`);
      const jpgPath = path.join(dir, `${filename}.${variant}.jpg`);

      const webpInfo = await base.clone().webp({ quality: 80 }).toFile(webpPath);
      written.push(webpPath);

      const jpgInfo = await base
        .clone()
        .jpeg({ quality: 82, mozjpeg: true })
        .toFile(jpgPath);
      written.push(jpgPath);

      totalBytes += webpInfo.size + jpgInfo.size;
      if (variant === "full") {
        fullWidth = webpInfo.width;
        fullHeight = webpInfo.height;
      }
    }
  } catch (err) {
    await Promise.all(
      written.map((file) => fs.rm(file, { force: true }).catch(() => undefined)),
    );
    throw err;
  }

  const [row] = await db
    .insert(media)
    .values({
      storeId,
      kind,
      filename,
      originalName: originalName.slice(0, 200),
      mime: "image/webp",
      width: fullWidth,
      height: fullHeight,
      bytes: totalBytes,
      sortOrder: kind === "cover" ? 0 : await countOfKind(storeId, kind),
    })
    .returning();

  return row;
}

export async function listMedia(storeId: string, kind?: MediaKind) {
  return db
    .select()
    .from(media)
    .where(
      kind
        ? and(eq(media.storeId, storeId), eq(media.kind, kind))
        : eq(media.storeId, storeId),
    )
    .orderBy(asc(media.kind), asc(media.sortOrder), asc(media.createdAt));
}

export async function deleteMedia(storeId: string, mediaId: string) {
  const [row] = await db
    .select()
    .from(media)
    .where(and(eq(media.id, mediaId), eq(media.storeId, storeId)))
    .limit(1);

  if (!row) throw notFound("Image not found");

  // Menu items keep a plain reference rather than a foreign key, so clear it
  // here or an item would point at a file that no longer exists.
  await db
    .update(menuItems)
    .set({ mediaId: null })
    .where(and(eq(menuItems.storeId, storeId), eq(menuItems.mediaId, mediaId)));

  await db.delete(media).where(and(eq(media.id, mediaId), eq(media.storeId, storeId)));
  await removeFiles(storeId, row.kind as MediaKind, row.filename);

  return row;
}

/** Resolves a private image for the authenticated-download route. */
export async function findMediaForDownload(mediaId: string) {
  const [row] = await db
    .select()
    .from(media)
    .where(eq(media.id, mediaId))
    .limit(1);
  return row ?? null;
}

export async function reorderMedia(
  storeId: string,
  kind: MediaKind,
  ids: string[],
) {
  if (ids.length === 0) return;

  const unique = [...new Set(ids)];
  if (unique.length !== ids.length) {
    throw badRequest("The same image appears more than once");
  }

  const owned = await db
    .select({ id: media.id })
    .from(media)
    .where(
      and(
        eq(media.storeId, storeId),
        eq(media.kind, kind),
        inArray(media.id, unique),
      ),
    );

  if (owned.length !== unique.length) {
    throw badRequest("One or more images do not belong to this store");
  }

  await db.transaction(async (tx) => {
    for (const [index, id] of unique.entries()) {
      await tx
        .update(media)
        .set({ sortOrder: index })
        .where(and(eq(media.id, id), eq(media.storeId, storeId)));
    }
  });
}

/** Removes both upload directories for a store; used when a store is deleted. */
export async function removeStoreDirectory(storeId: string): Promise<void> {
  await Promise.all(
    [PUBLIC_ROOT, PRIVATE_ROOT].map((root) =>
      fs
        .rm(path.join(config.uploadDir, root, storeId), {
          recursive: true,
          force: true,
        })
        .catch(() => undefined),
    ),
  );
}
