import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, ImagePlus, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { ApiError } from "../../api/client";
import { storeApi } from "../../api/store";
import LocalizedField from "../../components/LocalizedField";
import {
  Button,
  Card,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  SectionTitle,
  Spinner,
  Toggle,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { formatPrice, parsePrice, pickLocalized } from "../../lib/format";
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

  if (sections.isLoading || detail.isLoading) return <Spinner />;

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
    <div className="space-y-5">
      <Card>
        <SectionTitle
          title={t("portal_menu")}
          action={
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setNewSection({})}
            >
              {t("menu_add_section")}
            </Button>
          }
        />

        {newSection && (
          <div className="mb-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
            <LocalizedField
              label={t("menu_section_name")}
              value={newSection}
              onChange={setNewSection}
              primaryLang={primaryLang}
            />
            <div className="flex gap-2">
              <Button
                size="sm"
                loading={createSection.isPending}
                onClick={() => createSection.mutate(newSection)}
              >
                {t("action_add")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setNewSection(null)}>
                {t("action_cancel")}
              </Button>
            </div>
          </div>
        )}

        {error && <ErrorNote message={error} />}

        {list.length === 0 && !newSection ? (
          <EmptyState title={t("menu_empty")} description={t("menu_empty_hint")} />
        ) : (
          <div className="space-y-4">
            {list.map((section, index) => (
              <div
                key={section.id}
                className="rounded-xl border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 px-4 py-3 dark:border-slate-800">
                  <h3 className="font-semibold text-slate-800 dark:text-slate-100">
                    {pickLocalized(section.name, lang, primaryLang)}
                  </h3>
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      onClick={() => moveSection(index, -1)}
                      disabled={index === 0}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      aria-label="Move up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveSection(index, 1)}
                      disabled={index === list.length - 1}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 disabled:opacity-30 dark:hover:bg-slate-800"
                      aria-label="Move down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(t("menu_delete_section_confirm"))) {
                          removeSection.mutate(section.id);
                        }
                      }}
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                      aria-label={t("action_delete")}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                  {section.items.map((item) => {
                    const image = item.mediaId ? imageById.get(item.mediaId) : undefined;
                    return (
                      <li key={item.id} className="flex items-center gap-3 px-4 py-3">
                        {image ? (
                          <img
                            src={image.thumbUrlJpeg}
                            alt=""
                            className="h-12 w-12 shrink-0 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-12 w-12 shrink-0 rounded-lg bg-slate-100 dark:bg-slate-800" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p
                            className={`truncate font-medium ${
                              item.isAvailable
                                ? "text-slate-800 dark:text-slate-100"
                                : "text-slate-400 line-through"
                            }`}
                          >
                            {pickLocalized(item.name, lang, primaryLang)}
                          </p>
                          <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                            {pickLocalized(item.description, lang, primaryLang)}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold tabular-nums text-slate-700 dark:text-slate-200">
                          {formatPrice(item.priceMinor, lang)} {item.currency}
                        </span>
                        <div className="flex shrink-0 gap-0.5">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingItem({ ...item })}
                          >
                            {t("action_edit")}
                          </Button>
                          <button
                            type="button"
                            onClick={() => removeItem.mutate(item.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-500/10"
                            aria-label={t("action_delete")}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                <div className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="secondary"
                    icon={<Plus className="w-3.5 h-3.5" />}
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
              </div>
            ))}
          </div>
        )}
      </Card>

      {editingItem && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="glass-panel max-h-[90vh] w-full max-w-lg space-y-4 overflow-y-auto p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                {editingItem.id ? t("action_edit") : t("menu_add_item")}
              </h3>
              <button
                type="button"
                onClick={() => setEditingItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                aria-label={t("action_close")}
              >
                <X className="w-4 h-4" />
              </button>
            </div>

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

            <Field label={`${t("menu_item_price")} (${t("menu_currency")})`} required>
              <Input
                inputMode="decimal"
                defaultValue={
                  editingItem.priceMinor ? String(editingItem.priceMinor / 100) : ""
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
              />
            </Field>

            <div className="space-y-2">
              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                {t("menu_item_photo")}
              </span>
              <div className="flex flex-wrap gap-2">
                <label className="grid h-16 w-16 cursor-pointer place-items-center rounded-lg border border-dashed border-slate-300 text-slate-400 hover:border-brand-400 hover:text-brand-500 dark:border-slate-600">
                  <ImagePlus className="w-5 h-5" />
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) uploadPhoto.mutate(file);
                    }}
                  />
                </label>
                {images.map((image) => (
                  <button
                    key={image.id}
                    type="button"
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
                    className={`h-16 w-16 overflow-hidden rounded-lg border-2 transition ${
                      editingItem.mediaId === image.id
                        ? "border-brand-500"
                        : "border-transparent opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={image.thumbUrlJpeg} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </div>

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

            <div className="flex gap-2 pt-1">
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
