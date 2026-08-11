import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import {
  requirePasswordChanged,
  requireStoreAccess,
  requireStoreUser,
  requireWritableStore,
} from "../../auth/guards.js";
import { config } from "../../config/index.js";
import { MEDIA_KINDS, type MediaKind } from "../../db/schema.js";
import { recordAudit } from "../../lib/audit.js";
import { badRequest, forbidden, notFound } from "../../lib/errors.js";
import { asyncHandler, parseBody, parseQuery } from "../../lib/http.js";
import {
  deleteMedia,
  findMediaForDownload,
  isPrivateKind,
  listMedia,
  mediaPath,
  QUOTAS,
  reorderMedia,
  serialiseMedia,
  storeUpload,
  type Variant,
} from "./media.service.js";

/**
 * Uploads are buffered in memory because sharp re-encodes every image anyway;
 * nothing the client sent is ever written to disk in its original form.
 */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.maxUploadBytes, files: 1 },
});

const kindSchema = z.object({ kind: z.enum(MEDIA_KINDS) });
const listQuerySchema = z.object({ kind: z.enum(MEDIA_KINDS).optional() });
const reorderSchema = z.object({
  kind: z.enum(MEDIA_KINDS),
  ids: z.array(z.string().uuid()).max(100),
});

/**
 * Splits "full.webp" into its parts against a fixed allow-list, so nothing
 * from the URL is ever used to build a filesystem path directly.
 */
function parseVariantFile(file: string): { variant: Variant; ext: "webp" | "jpg" } {
  const [variant, ext] = file.split(".");
  if (variant !== "full" && variant !== "thumb") throw notFound("Image not found");
  if (ext !== "webp" && ext !== "jpg") throw notFound("Image not found");
  return { variant, ext };
}

const ownerOnly = [
  requireStoreUser,
  requirePasswordChanged,
  requireStoreAccess(),
] as const;

const ownerWrite = [...ownerOnly, requireWritableStore] as const;

// ── Owner-facing media management ────────────────────────────────────────────

export const mediaOwnerRouter = Router();

mediaOwnerRouter.get(
  "/",
  ...ownerOnly,
  asyncHandler(async (req, res) => {
    const { kind } = parseQuery(listQuerySchema, req.query);
    const rows = await listMedia(req.storeId!, kind);
    res.json({ media: rows.map(serialiseMedia), quotas: QUOTAS });
  }),
);

mediaOwnerRouter.post(
  "/",
  ...ownerWrite,
  upload.single("image"),
  asyncHandler(async (req, res) => {
    if (!req.file) throw badRequest("No image was uploaded");
    const { kind } = parseBody(kindSchema, req.body);

    const row = await storeUpload(
      req.storeId!,
      kind as MediaKind,
      req.file.buffer,
      req.file.originalname,
    );

    await recordAudit(req, {
      action: "media.uploaded",
      targetType: "media",
      targetId: row.id,
      meta: { storeId: req.storeId, kind, bytes: row.bytes },
    });

    res.status(201).json({ media: serialiseMedia(row) });
  }),
);

mediaOwnerRouter.put(
  "/order",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    const { kind, ids } = parseBody(reorderSchema, req.body);
    await reorderMedia(req.storeId!, kind as MediaKind, ids);

    await recordAudit(req, {
      action: "media.reordered",
      targetType: "store",
      targetId: req.storeId!,
      meta: { kind },
    });

    res.json({ ok: true });
  }),
);

mediaOwnerRouter.delete(
  "/:mediaId",
  ...ownerWrite,
  asyncHandler(async (req, res) => {
    const row = await deleteMedia(req.storeId!, req.params.mediaId);

    await recordAudit(req, {
      action: "media.deleted",
      targetType: "media",
      targetId: row.id,
      meta: { storeId: req.storeId, kind: row.kind },
    });

    res.json({ ok: true });
  }),
);

// ── Authenticated delivery of private images ─────────────────────────────────

export const mediaFileRouter = Router();

/**
 * Serves a venue-proof image to the admin reviewing it or the owner who
 * submitted it. Public images are static files and never reach this route.
 */
mediaFileRouter.get(
  "/:mediaId/:file",
  asyncHandler(async (req, res) => {
    const { variant, ext } = parseVariantFile(req.params.file);

    const row = await findMediaForDownload(req.params.mediaId);
    if (!row) throw notFound("Image not found");
    if (!isPrivateKind(row.kind as MediaKind)) {
      // Public images already have a static URL; this route refuses to become
      // a second way of reaching them.
      throw notFound("Image not found");
    }

    const isAdmin = Boolean(req.auth?.admin);
    const isOwner = req.auth?.storeUser?.storeId === row.storeId;
    if (!isAdmin && !isOwner) throw forbidden("You cannot view this image");

    res.sendFile(
      mediaPath(row.storeId, row.kind as MediaKind, row.filename, variant, ext),
      { headers: { "Cache-Control": "private, max-age=300" } },
    );
  }),
);
