import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, Pencil, Plus, Tags, Trash2 } from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import LocalizedField from "../../components/LocalizedField";
import {
  Button,
  EmptyState,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  Skeleton,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { pickLocalized } from "../../lib/format";
import type { Localized } from "../../types/api";

export default function AdminCategoriesPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<{ name: Localized; icon: string } | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [editing, setEditing] = useState<{
    id: string;
    name: Localized;
    icon: string;
  } | null>(null);

  const categories = useQuery({
    queryKey: ["admin-categories"],
    queryFn: () => adminApi.categories(),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["admin-categories"] });

  const fail = (err: unknown) =>
    setError(err instanceof ApiError ? err.message : t("error_generic"));

  const create = useMutation({
    mutationFn: () => adminApi.createCategory({ name: draft!.name, icon: draft!.icon }),
    onSuccess: async () => {
      setDraft(null);
      setError("");
      await refresh();
    },
    onError: fail,
  });

  const update = useMutation({
    mutationFn: () =>
      adminApi.updateCategory(editing!.id, {
        name: editing!.name,
        icon: editing!.icon,
      }),
    onSuccess: async () => {
      setEditing(null);
      setError("");
      await refresh();
    },
    onError: fail,
  });

  const remove = useMutation({
    mutationFn: (id: string) => adminApi.deleteCategory(id),
    onSuccess: async () => {
      setError("");
      await refresh();
    },
    onError: fail,
  });

  const list = categories.data ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("admin_categories")}
        action={
          <Button
            icon={<Plus className="h-4 w-4" />}
            onClick={() => {
              setConfirming(null);
              setEditing(null);
              setDraft({ name: {}, icon: "🍽️" });
            }}
          >
            {t("action_add")}
          </Button>
        }
      />

      {error && <ErrorNote message={error} />}

      {/* New category. A raised sheet above the list rather than a row in it,
          so an unsaved draft is never mistaken for a saved category. */}
      {draft && (
        <div className="panel border-clay-200 p-5 sm:p-6 dark:border-clay-500/30">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div className="sm:w-24">
              <Field label="Icon">
                <Input
                  value={draft.icon}
                  onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                  maxLength={4}
                  className="text-center text-xl"
                />
              </Field>
            </div>
            <div className="min-w-0 flex-1">
              <LocalizedField
                label={t("filter_category")}
                value={draft.name}
                onChange={(name) => setDraft({ ...draft, name })}
                primaryLang="en"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
            <Button loading={create.isPending} onClick={() => create.mutate()}>
              {t("action_add")}
            </Button>
            <Button variant="ghost" onClick={() => setDraft(null)}>
              {t("action_cancel")}
            </Button>
          </div>
        </div>
      )}

      <div className="panel overflow-hidden">
        {/* Column headings, so the count on the right reads as a column
            rather than as decoration on each row. */}
        <div className="surface-sunken flex items-center gap-4 border-b border-[var(--border-subtle)] px-4 py-3 sm:px-5">
          <span className="flex-1 text-[11px] font-bold uppercase tracking-[0.12em] text-sand-600 dark:text-sand-400">
            {t("filter_category")}
          </span>
          <span className="w-16 text-right text-[11px] font-bold uppercase tracking-[0.12em] text-sand-600 dark:text-sand-400">
            {t("admin_stores")}
          </span>
          <span className="w-20" aria-hidden />
        </div>

        {categories.isLoading ? (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {Array.from({ length: 6 }, (_, i) => (
              <li key={i} className="flex items-center gap-4 px-4 py-4 sm:px-5">
                <Skeleton className="h-11 w-11 rounded-card" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-24" />
                </div>
                <Skeleton className="h-4 w-8" />
              </li>
            ))}
          </ul>
        ) : categories.isError ? (
          <div className="p-5">
            <ErrorNote message={t("error_generic")} />
          </div>
        ) : list.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<Tags className="h-6 w-6" />}
              title={t("empty_none")}
              action={
                <Button
                  icon={<Plus className="h-4 w-4" />}
                  onClick={() => setDraft({ name: {}, icon: "🍽️" })}
                >
                  {t("action_add")}
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="divide-y divide-[var(--border-subtle)]">
            {list.map((category) => {
              const isEditing = editing?.id === category.id;
              const isConfirming = confirming === category.id;
              const inUse = category.storeCount > 0;

              return (
                <li
                  key={category.id}
                  className={`px-4 py-3.5 transition-colors duration-200 sm:px-5 ${
                    isConfirming
                      ? "bg-red-50/70 dark:bg-red-500/5"
                      : isEditing
                        ? "bg-sand-100/60 dark:bg-sand-900/40"
                        : "hover:bg-sand-100/60 dark:hover:bg-sand-900/40"
                  }`}
                >
                  {/* The identity row never moves: editing opens beneath it and
                      the destructive prompt swaps only the button cluster, so
                      neither ever shifts the rows around it. */}
                  <div className="flex items-center gap-4">
                    <span
                      aria-hidden
                      className="surface-sunken grid h-11 w-11 shrink-0 place-items-center rounded-card border border-[var(--border-subtle)] text-xl"
                    >
                      {category.icon || "🍽️"}
                    </span>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-sand-900 dark:text-sand-50">
                        {pickLocalized(category.name, lang, "en")}
                      </p>
                      <p className="truncate font-mono text-xs text-sand-600 dark:text-sand-500">
                        {category.slug}
                        {/* The count has no room for a column at 375px, so it
                            joins the secondary line there instead. */}
                        <span className="font-sans tabular-nums sm:hidden">
                          {" · "}
                          {category.storeCount} {t("admin_stores")}
                        </span>
                      </p>
                    </div>

                    <span
                      className={`hidden w-16 shrink-0 text-right text-sm tabular-nums sm:block ${
                        inUse
                          ? "font-semibold text-sand-900 dark:text-sand-100"
                          : "text-sand-500"
                      }`}
                    >
                      {category.storeCount}
                    </span>

                    {isConfirming ? (
                      <div className="flex shrink-0 items-center gap-1.5">
                        <AlertTriangle
                          aria-hidden
                          className="h-4 w-4 text-red-700 dark:text-red-400"
                        />
                        <Button
                          size="sm"
                          variant="danger"
                          loading={remove.isPending}
                          onClick={() => {
                            setConfirming(null);
                            remove.mutate(category.id);
                          }}
                        >
                          {t("action_delete")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setConfirming(null)}
                        >
                          {t("action_cancel")}
                        </Button>
                      </div>
                    ) : (
                      <div className="flex w-20 shrink-0 items-center justify-end gap-1">
                        <button
                          type="button"
                          aria-label={t("action_edit")}
                          aria-expanded={isEditing}
                          title={t("action_edit")}
                          onClick={() =>
                            setEditing(
                              isEditing
                                ? null
                                : {
                                    id: category.id,
                                    name: category.name,
                                    icon: category.icon ?? "",
                                  },
                            )
                          }
                          className={`rounded-lg p-2 transition-colors duration-200 ${
                            isEditing
                              ? "bg-clay-100 text-clay-700 dark:bg-clay-500/15 dark:text-clay-300"
                              : "text-sand-600 hover:bg-sand-200/70 hover:text-clay-700 dark:text-sand-400 dark:hover:bg-sand-800 dark:hover:text-clay-300"
                          }`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setConfirming(category.id)}
                          disabled={inUse}
                          aria-label={t("action_delete")}
                          title={
                            inUse
                              ? `${category.storeCount} · ${t("admin_stores")}`
                              : t("action_delete")
                          }
                          className="rounded-lg p-2 text-sand-600 transition-colors duration-200 hover:bg-red-50 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-sand-600 dark:text-sand-400 dark:hover:bg-red-500/10 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing && (
                    <div className="ml-1 mt-4 space-y-4 border-l-2 border-clay-500 pl-4 sm:ml-5 sm:pl-5">
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                        <div className="sm:w-24">
                          <Field label="Icon">
                            <Input
                              value={editing.icon}
                              onChange={(e) =>
                                setEditing({ ...editing, icon: e.target.value })
                              }
                              maxLength={4}
                              className="text-center text-xl"
                            />
                          </Field>
                        </div>
                        <div className="min-w-0 flex-1">
                          <LocalizedField
                            label={t("filter_category")}
                            value={editing.name}
                            onChange={(name) => setEditing({ ...editing, name })}
                            primaryLang="en"
                          />
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Button
                          size="sm"
                          loading={update.isPending}
                          onClick={() => update.mutate()}
                        >
                          {t("action_save")}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(null)}
                        >
                          {t("action_cancel")}
                        </Button>
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
