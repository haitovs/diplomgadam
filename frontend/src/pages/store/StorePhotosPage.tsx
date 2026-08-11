import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Lock, Trash2 } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import { Badge, Card, ErrorNote, SectionTitle, Spinner } from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
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
      <SectionTitle
        title={title}
        description={description}
        action={
          <Badge tone={full ? "warning" : "neutral"}>
            {images.length}/{quota} {t("media_used")}
          </Badge>
        }
      />

      {isPrivate && (
        <p className="mb-3 flex items-center gap-1.5 text-xs font-medium text-amber-700 dark:text-amber-300">
          <Lock className="w-3.5 h-3.5" />
          {t("media_venue_proof_hint")}
        </p>
      )}

      <div className="flex flex-wrap gap-3">
        {images.map((image) => (
          <div key={image.id} className="group relative">
            <img
              src={image.thumbUrlJpeg}
              alt=""
              className="h-24 w-24 rounded-xl object-cover"
            />
            <button
              type="button"
              onClick={() => {
                if (confirm(t("media_delete_confirm"))) onDelete(image.id);
              }}
              className="absolute -right-1.5 -top-1.5 grid h-6 w-6 place-items-center rounded-full bg-rose-500 text-white opacity-0 shadow transition group-hover:opacity-100"
              aria-label={t("action_delete")}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}

        {!full && (
          <label
            className={`grid h-24 w-24 cursor-pointer place-items-center rounded-xl border border-dashed text-sand-500 transition hover:border-brand-400 hover:text-brand-500 dark:border-sand-600 ${
              uploading ? "opacity-50" : "border-sand-300"
            }`}
          >
            <ImagePlus className="w-6 h-6" />
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

      <p className="mt-3 text-xs text-sand-600 dark:text-sand-500">
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

  if (media.isLoading || !media.data) return <Spinner />;

  const byKind = (kind: MediaKind) =>
    media.data!.media.filter((image) => image.kind === kind);

  const handleUpload = (kind: MediaKind, file: File) =>
    upload.mutate({ kind, file });

  return (
    <div className="space-y-5">
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
