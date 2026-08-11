import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Lock, Trash2 } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import {
  Card,
  ErrorNote,
  PageHeader,
  SectionTitle,
  Skeleton,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatBytes } from "../../lib/format";
import type { MediaItem, MediaKind } from "../../types/api";

function PhotoGroup({
  kind,
  title,
  description,
  images,
  quota,
  onUpload,
  onDelete,
  uploading,
  isPrivate = false,
}: {
  kind: MediaKind;
  title: string;
  description: string;
  images: MediaItem[];
  quota: number;
  onUpload: (kind: MediaKind, file: File) => void;
  onDelete: (id: string) => void;
  uploading: boolean;
  isPrivate?: boolean;
}) {
  const { t } = useLanguage();
  const full = images.length >= quota;

  return (
    <Card>
      <SectionTitle title={title} description={description || undefined} />

      {/* The quota is stated plainly and drawn once, rather than shouted with
          a warning colour the moment the last slot is taken. */}
      <div className="mb-5 flex items-center gap-3">
        <div
          className="h-1.5 w-24 shrink-0 overflow-hidden rounded-full surface-sunken"
          aria-hidden
        >
          <div
            className={`h-full rounded-full transition-all duration-500 ease-out-soft ${
              full ? "bg-sand-500" : "bg-clay-500"
            }`}
            style={{ width: `${Math.min(100, (images.length / quota) * 100)}%` }}
          />
        </div>
        <p className="text-xs font-medium text-sand-600 tabular-nums dark:text-sand-500">
          {images.length}/{quota} {t("media_used")}
        </p>
      </div>

      {isPrivate && (
        <p className="mb-5 flex items-start gap-2 rounded-card border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs font-medium text-amber-800 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300">
          <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{t("media_venue_proof_hint")}</span>
        </p>
      )}

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
        {images.map((image) => (
          <figure key={image.id} className="group relative">
            <div className="photo-frame aspect-square w-full overflow-hidden rounded-card">
              <img
                src={image.thumbUrlJpeg}
                alt=""
                loading="lazy"
                className="h-full w-full object-cover transition-transform duration-500 ease-out-soft group-hover:scale-105"
              />
            </div>

            {/* The scrim only appears on hover or keyboard focus, so the delete
                control is reachable without a pointer. */}
            <div className="pointer-events-none absolute inset-0 rounded-card bg-gradient-to-t from-black/55 to-transparent opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100" />

            <button
              type="button"
              onClick={() => {
                if (confirm(t("media_delete_confirm"))) onDelete(image.id);
              }}
              className="absolute right-1.5 top-1.5 grid h-8 w-8 place-items-center rounded-full bg-[var(--surface-card)] text-sand-700 opacity-0 shadow-soft backdrop-blur transition-all duration-200 ease-out-soft hover:bg-red-700 hover:text-white focus-visible:opacity-100 group-hover:opacity-100 dark:text-sand-200"
              aria-label={t("action_delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>

            <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 truncate px-2 pb-1.5 text-[11px] font-medium tabular-nums text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100 group-focus-within:opacity-100">
              {image.width}×{image.height} · {formatBytes(image.bytes)}
            </figcaption>
          </figure>
        ))}

        {!full && (
          <label
            className={`grid aspect-square w-full cursor-pointer place-items-center gap-1.5 rounded-card border border-dashed border-sand-300 text-sand-500 transition-colors duration-200 hover:border-clay-400 hover:bg-clay-50/60 hover:text-clay-700 dark:border-sand-700 dark:hover:bg-clay-500/5 dark:hover:text-clay-300 ${
              uploading ? "pointer-events-none opacity-50" : ""
            }`}
          >
            <ImagePlus className="h-5 w-5" />
            <span className="text-xs font-semibold">{t("action_upload")}</span>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) onUpload(kind, file);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>

      <p className="mt-4 text-xs text-sand-600 dark:text-sand-500">
        {full ? t("media_limit_reached") : t("media_upload_hint")}
      </p>
    </Card>
  );
}

export default function StorePhotosPage() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");

  const media = useQuery({
    queryKey: ["store-media"],
    queryFn: () => storeApi.media(),
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["store-media"] });
    await queryClient.invalidateQueries({ queryKey: ["store-detail"] });
  };

  const fail = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : t("error_generic"));

  const upload = useMutation({
    mutationFn: ({ kind, file }: { kind: MediaKind; file: File }) =>
      storeApi.uploadMedia(kind, file),
    onSuccess: async () => {
      setError("");
      await refresh();
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (id: string) => storeApi.deleteMedia(id),
    onSuccess: refresh,
    onError: fail,
  });

  if (media.isLoading) return <PhotosSkeleton />;

  if (media.isError || !media.data) {
    return (
      <div className="space-y-5">
        <PageHeader title={t("portal_photos")} description={t("media_upload_hint")} />
        <ErrorNote message={t("error_network")} />
      </div>
    );
  }

  const byKind = (kind: MediaKind) =>
    media.data!.media.filter((image) => image.kind === kind);

  const handleUpload = (kind: MediaKind, file: File) =>
    upload.mutate({ kind, file });

  return (
    <div className="space-y-6 pb-4">
      <PageHeader title={t("portal_photos")} description={t("media_upload_hint")} />

      {error && <ErrorNote message={error} />}

      <PhotoGroup
        kind="cover"
        title={t("media_cover")}
        description={t("media_cover_hint")}
        images={byKind("cover")}
        quota={media.data.quotas.cover}
        onUpload={handleUpload}
        onDelete={(id) => remove.mutate(id)}
        uploading={upload.isPending}
      />

      <PhotoGroup
        kind="gallery"
        title={t("media_gallery")}
        description={t("media_gallery_hint")}
        images={byKind("gallery")}
        quota={media.data.quotas.gallery}
        onUpload={handleUpload}
        onDelete={(id) => remove.mutate(id)}
        uploading={upload.isPending}
      />

      <PhotoGroup
        kind="venue_proof"
        title={t("media_venue_proof")}
        description=""
        images={byKind("venue_proof")}
        quota={media.data.quotas.venue_proof}
        onUpload={handleUpload}
        onDelete={(id) => remove.mutate(id)}
        uploading={upload.isPending}
        isPrivate
      />
    </div>
  );
}

/** Keeps the three galleries' footprint while the media list loads. */
function PhotosSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-9 w-44" />
        <Skeleton className="h-4 w-64" />
      </div>
      {Array.from({ length: 3 }, (_, group) => (
        <Card key={group}>
          <Skeleton className="mb-2 h-6 w-40" />
          <Skeleton className="mb-5 h-4 w-56" />
          <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5">
            {Array.from({ length: 4 }, (_, tile) => (
              <Skeleton key={tile} className="aspect-square w-full rounded-card" />
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
