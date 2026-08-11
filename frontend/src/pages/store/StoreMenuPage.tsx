import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronUp,
  ImageOff,
  ImagePlus,
  Pencil,
  Plus,
  Trash2,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import LocalizedField from "../../components/LocalizedField";
import {
  Badge,
  Button,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Skeleton,
  Toggle,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import {
  formatPrice,
  formatPriceInput,
  parsePrice,
  pickLocalized,
} from "../../lib/format";
import type { Lang } from "../../i18n/translations";
import type { Localized, MediaItem, MenuItemRecord } from "../../types/api";

export default function StoreMenuPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [editingItem, setEditingItem] = useState<Partial<MenuItemRecord> & {
    sectionId: string;
  } | null>(null);
  const [newSection, setNewSection] = useState<Localized | null>(null);

  const detail = useQuery({ queryKey: ["store-detail"], queryFn: () => storeApi.detail() });
  const sections = useQuery({ queryKey: ["store-menu"], queryFn: () => storeApi.menu() });
  const media = useQuery({
    queryKey: ["store-media", "menu_item"],
    queryFn: () => storeApi.media("menu_item"),
  });

  const primaryLang: Lang = detail.data?.store.primaryLang ?? "tk";

  // A modal that cannot be dismissed with Escape traps anyone not using a mouse.
  useEffect(() => {
    if (!editingItem) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setEditingItem(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingItem]);

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["store-menu"] });
    await queryClient.invalidateQueries({ queryKey: ["store-media", "menu_item"] });
  };

  const fail = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : t("error_generic"));

  const createSection = useMutation({
    mutationFn: (name: Localized) => storeApi.createSection(name),
    onSuccess: async () => {
      setNewSection(null);
      setError("");
      await refresh();
    },
    onError: fail,
  });

  const removeSection = useMutation({
    mutationFn: (id: string) => storeApi.deleteSection(id),
    onSuccess: refresh,
    onError: fail,
  });

  const reorderSections = useMutation({
    mutationFn: (ids: string[]) => storeApi.reorderSections(ids),
    onSuccess: refresh,
    onError: fail,
  });

  const saveItem = useMutation({
    mutationFn: async (item: Partial<MenuItemRecord> & { sectionId: string }) => {
      const body = {
        sectionId: item.sectionId,
        name: item.name ?? {},
        description: item.description ?? {},
        priceMinor: item.priceMinor ?? 0,
        mediaId: item.mediaId ?? null,
        isAvailable: item.isAvailable ?? true,
      };
      if (item.id) await storeApi.updateItem(item.id, body);
      else await storeApi.createItem(body);
    },
    onSuccess: async () => {
      setEditingItem(null);
      setError("");
      await refresh();
    },
    onError: fail,
  });

  const removeItem = useMutation({
    mutationFn: (id: string) => storeApi.deleteItem(id),
    onSuccess: refresh,
    onError: fail,
  });

  const uploadPhoto = useMutation({
    mutationFn: (file: File) => storeApi.uploadMedia("menu_item", file),
    onSuccess: async (result) => {
      setEditingItem((prev) =>
        prev ? { ...prev, mediaId: result.media.id } : prev,
      );
      await refresh();
    },
    onError: fail,
  });

  if (sections.isLoading || detail.isLoading) return <MenuSkeleton />;

  const list = sections.data ?? [];
  const images: MediaItem[] = media.data?.media ?? [];
  const imageById = new Map(images.map((image) => [image.id, image]));

  const moveSection = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= list.length) return;
    const ids = list.map((section) => section.id);
    [ids[index], ids[target]] = [ids[target], ids[index]];
    reorderSections.mutate(ids);
  };

  return (
    <div className="space-y-6 pb-4">
      <PageHeader
        title={t("portal_menu")}
        action={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => setNewSection({})}
          >
            {t("menu_add_section")}
          </Button>
        }
      />

      {sections.isError && <ErrorNote message={t("error_network")} />}
      {error && <ErrorNote message={error} />}

      {/* Adding a section happens in place, tinted in the accent so it reads as
          a pending draft rather than a saved section. */}
      {newSection && (
        <div className="space-y-4 rounded-panel border border-clay-200 bg-clay-50 p-5 sm:p-6 dark:border-clay-500/30 dark:bg-clay-500/10">
          <LocalizedField
            label={t("menu_section_name")}
            value={newSection}
            onChange={setNewSection}
            primaryLang={primaryLang}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              loading={createSection.isPending}
              onClick={() => createSection.mutate(newSection)}
            >
              {t("action_add")}
            </Button>
            <Button variant="ghost" onClick={() => setNewSection(null)}>
              {t("action_cancel")}
            </Button>
          </div>
        </div>
      )}

      {list.length === 0 && !newSection ? (
        <EmptyState
          icon={<UtensilsCrossed className="h-6 w-6" />}
          title={t("menu_empty")}
          description={t("menu_empty_hint")}
          action={
            <Button
              icon={<Plus className="h-4 w-4" />}
              onClick={() => setNewSection({})}
            >
              {t("menu_add_section")}
            </Button>
          }
        />
      ) : (
        <div className="space-y-5">
          {list.map((section, index) => (
            <section key={section.id} className="panel overflow-hidden">
              <div className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-4 sm:px-6">
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <h2 className="truncate font-display text-lg font-semibold text-sand-900 dark:text-sand-50">
                    {pickLocalized(section.name, lang, primaryLang)}
                  </h2>
                  <Badge className="shrink-0 tabular-nums">
                    {section.items.length}
                  </Badge>
                </div>

                <div className="flex shrink-0 items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => moveSection(index, -1)}
                    disabled={index === 0}
                    className="grid h-9 w-9 place-items-center rounded-lg text-sand-500 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-900 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-sand-800 dark:hover:text-sand-100"
                    aria-label="Move up"
                  >
                    <ChevronUp className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveSection(index, 1)}
                    disabled={index === list.length - 1}
                    className="grid h-9 w-9 place-items-center rounded-lg text-sand-500 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-900 disabled:opacity-30 disabled:hover:bg-transparent dark:hover:bg-sand-800 dark:hover:text-sand-100"
                    aria-label="Move down"
                  >
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      if (confirm(t("menu_delete_section_confirm"))) {
                        removeSection.mutate(section.id);
                      }
                    }}
                    className="grid h-9 w-9 place-items-center rounded-lg text-sand-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                    aria-label={t("action_delete")}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {section.items.length === 0 ? (
                <p className="px-4 pt-5 text-sm text-sand-600 sm:px-6 dark:text-sand-500">
                  {t("empty_none")}
                </p>
              ) : (
                <ul className="divide-y divide-[var(--border-subtle)]">
                  {section.items.map((item) => {
                    const image = item.mediaId ? imageById.get(item.mediaId) : undefined;
                    const name = pickLocalized(item.name, lang, primaryLang);
                    const description = pickLocalized(
                      item.description,
                      lang,
                      primaryLang,
                    );
                    return (
                      <li
                        key={item.id}
                        className="flex items-center gap-3 px-4 py-3 transition-colors duration-200 hover:bg-sand-100/60 sm:px-6 dark:hover:bg-sand-800/40"
                      >
                        {image ? (
                          <div className="photo-frame h-12 w-12 shrink-0 rounded-card">
                            <img
                              src={image.thumbUrlJpeg}
                              alt=""
                              loading="lazy"
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-card surface-sunken text-sand-400 dark:text-sand-600">
                            <ImageOff className="h-4 w-4" strokeWidth={1.75} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate text-sm font-medium ${
                              item.isAvailable
                                ? "text-sand-900 dark:text-sand-100"
                                : "text-sand-500 line-through"
                            }`}
                          >
                            {name}
                          </p>
                          {/* An unavailable dish says so in words as well as
                              striking the name through. */}
                          {(description || !item.isAvailable) && (
                            <p className="mt-0.5 flex min-w-0 items-baseline gap-2 text-xs">
                              {!item.isAvailable && (
                                <span className="shrink-0 font-semibold text-clay-700 dark:text-clay-300">
                                  {t("menu_item_unavailable")}
                                </span>
                              )}
                              {description && (
                                <span className="truncate text-sand-600 dark:text-sand-500">
                                  {description}
                                </span>
                              )}
                            </p>
                          )}
                        </div>

                        <span className="shrink-0 text-right text-sm font-semibold tabular-nums text-sand-900 dark:text-sand-100">
                          {formatPrice(item.priceMinor, lang)}
                          <span className="ml-1 text-xs font-normal text-sand-500">
                            {item.currency}
                          </span>
                        </span>

                        <div className="flex shrink-0 items-center gap-0.5">
                          <button
                            type="button"
                            onClick={() => setEditingItem({ ...item })}
                            className="grid h-9 w-9 place-items-center rounded-lg text-sand-500 transition-colors duration-200 hover:bg-sand-200/70 hover:text-clay-700 dark:hover:bg-sand-800 dark:hover:text-clay-300"
                            aria-label={t("action_edit")}
                            title={t("action_edit")}
                          >
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => removeItem.mutate(item.id)}
                            className="grid h-9 w-9 place-items-center rounded-lg text-sand-500 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 dark:hover:bg-red-500/10 dark:hover:text-red-300"
                            aria-label={t("action_delete")}
                            title={t("action_delete")}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              <div className="px-4 py-4 sm:px-6">
                <Button
                  size="sm"
                  variant="secondary"
                  icon={<Plus className="h-3.5 w-3.5" />}
                  onClick={() =>
                    setEditingItem({
                      sectionId: section.id,
                      name: {},
                      description: {},
                      priceMinor: 0,
                      isAvailable: true,
                    })
                  }
                >
                  {t("menu_add_item")}
                </Button>
              </div>
            </section>
          ))}
        </div>
      )}

      {editingItem && (
        <div
          className="fixed inset-0 z-50 grid place-items-end overflow-y-auto bg-sand-950/60 p-0 backdrop-blur-sm sm:place-items-center sm:p-6"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setEditingItem(null);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="menu-item-dialog-title"
            className="flex max-h-[92vh] w-full max-w-lg flex-col overflow-hidden rounded-t-panel border border-[var(--border-subtle)] bg-[var(--surface-card)] shadow-deep sm:rounded-panel"
          >
            <div className="flex items-start justify-between gap-4 border-b border-[var(--border-subtle)] px-5 py-4 sm:px-6">
              <h2
                id="menu-item-dialog-title"
                className="font-display text-xl font-semibold text-sand-900 dark:text-sand-50"
              >
                {editingItem.id ? t("action_edit") : t("menu_add_item")}
              </h2>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="-mr-1.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg text-sand-500 transition-colors duration-200 hover:bg-sand-100 hover:text-sand-900 dark:hover:bg-sand-800 dark:hover:text-sand-100"
                aria-label={t("action_close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5 sm:px-6">
              <LocalizedField
                label={t("menu_item_name")}
                value={editingItem.name ?? {}}
                onChange={(name) =>
                  setEditingItem((prev) => (prev ? { ...prev, name } : prev))
                }
                primaryLang={primaryLang}
              />

              <LocalizedField
                label={t("menu_item_description")}
                value={editingItem.description ?? {}}
                onChange={(description) =>
                  setEditingItem((prev) => (prev ? { ...prev, description } : prev))
                }
                primaryLang={primaryLang}
                multiline
                rows={2}
              />

              <Field label={t("menu_item_price")} required>
                <div className="flex items-center gap-2">
                  <Input
                    inputMode="decimal"
                    defaultValue={
                      editingItem.priceMinor ? formatPriceInput(editingItem.priceMinor) : ""
                    }
                    onChange={(e) => {
                      const parsed = parsePrice(e.target.value);
                      if (parsed !== null) {
                        setEditingItem((prev) =>
                          prev ? { ...prev, priceMinor: parsed } : prev,
                        );
                      }
                    }}
                    placeholder="45"
                    className="tabular-nums"
                  />
                  <span className="shrink-0 rounded-xl border border-[var(--border-subtle)] surface-sunken px-3.5 py-2.5 text-sm font-semibold text-sand-600 dark:text-sand-400">
                    {t("menu_currency")}
                  </span>
                </div>
              </Field>

              <div className="space-y-2.5">
                <span className="block text-sm font-semibold text-sand-800 dark:text-sand-200">
                  {t("menu_item_photo")}
                </span>
                <div className="flex flex-wrap gap-2.5">
                  <label
                    className={`grid h-16 w-16 cursor-pointer place-items-center rounded-card border border-dashed border-sand-300 text-sand-500 transition-colors duration-200 hover:border-clay-400 hover:text-clay-700 dark:border-sand-700 dark:hover:text-clay-300 ${
                      uploadPhoto.isPending ? "opacity-50" : ""
                    }`}
                  >
                    <ImagePlus className="h-5 w-5" />
                    <span className="sr-only">{t("action_upload")}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      disabled={uploadPhoto.isPending}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) uploadPhoto.mutate(file);
                        e.target.value = "";
                      }}
                    />
                  </label>

                  {images.map((image) => {
                    const selected = editingItem.mediaId === image.id;
                    return (
                      <button
                        key={image.id}
                        type="button"
                        aria-pressed={selected}
                        onClick={() =>
                          setEditingItem((prev) =>
                            prev
                              ? {
                                  ...prev,
                                  mediaId: prev.mediaId === image.id ? null : image.id,
                                }
                              : prev,
                          )
                        }
                        className={`relative h-16 w-16 overflow-hidden rounded-card transition-all duration-200 ease-out-soft ${
                          selected
                            ? "ring-2 ring-clay-600 ring-offset-2 ring-offset-[var(--surface-card)]"
                            : "opacity-75 hover:opacity-100"
                        }`}
                      >
                        <img
                          src={image.thumbUrlJpeg}
                          alt=""
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        {/* A tick as well as the ring: selection should not be
                            carried by colour alone. */}
                        {selected && (
                          <span className="absolute bottom-1 right-1 grid h-5 w-5 place-items-center rounded-full bg-clay-600 text-white">
                            <Check className="h-3 w-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-card border border-[var(--border-subtle)] surface-sunken p-4">
                <Toggle
                  checked={editingItem.isAvailable ?? true}
                  onChange={(isAvailable) =>
                    setEditingItem((prev) => (prev ? { ...prev, isAvailable } : prev))
                  }
                  label={
                    editingItem.isAvailable ?? true
                      ? t("menu_item_available")
                      : t("menu_item_unavailable")
                  }
                />
              </div>
            </div>

            <div className="flex items-center gap-2 border-t border-[var(--border-subtle)] px-5 py-4 sm:px-6">
              <Button
                loading={saveItem.isPending}
                onClick={() => saveItem.mutate(editingItem)}
              >
                {t("action_save")}
              </Button>
              <Button variant="ghost" onClick={() => setEditingItem(null)}>
                {t("action_cancel")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Two sections' worth of shape, so the page does not collapse then expand. */
function MenuSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between gap-4">
        <Skeleton className="h-9 w-40" />
        <Skeleton className="h-10 w-36 rounded-xl" />
      </div>
      {Array.from({ length: 2 }, (_, section) => (
        <div key={section} className="panel overflow-hidden">
          <div className="border-b border-[var(--border-subtle)] px-4 py-4 sm:px-6">
            <Skeleton className="h-6 w-40" />
          </div>
          <div className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 3 }, (_, row) => (
              <div key={row} className="flex items-center gap-3 px-4 py-3 sm:px-6">
                <Skeleton className="h-12 w-12 shrink-0 rounded-card" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
                <Skeleton className="h-4 w-14 shrink-0" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
