import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api/admin";
import { ApiError } from "../../api/client";
import LocalizedField from "../../components/LocalizedField";
import {
  Badge,
  Button,
  Card,
  ErrorNote,
  Field,
  Input,
  SectionTitle,
  Spinner,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import { pickLocalized } from "../../lib/format";
import type { Localized } from "../../types/api";

export default function AdminCategoriesPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<{ name: Localized; icon: string } | null>(null);
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

  if (categories.isLoading) return <Spinner />;

  return (
    <div className="space-y-5">
      <Card>
        <SectionTitle
          title={t("admin_categories")}
          action={
            <Button
              size="sm"
              icon={<Plus className="w-3.5 h-3.5" />}
              onClick={() => setDraft({ name: {}, icon: "🍽️" })}
            >
              {t("action_add")}
            </Button>
          }
        />

        {error && <ErrorNote message={error} />}

        {draft && (
          <div className="mb-4 space-y-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4 dark:border-brand-500/30 dark:bg-brand-500/5">
            <LocalizedField
              label={t("filter_category")}
              value={draft.name}
              onChange={(name) => setDraft({ ...draft, name })}
              primaryLang="en"
            />
            <Field label="Icon">
              <Input
                value={draft.icon}
                onChange={(e) => setDraft({ ...draft, icon: e.target.value })}
                maxLength={4}
                className="w-24"
              />
            </Field>
            <div className="flex gap-2">
              <Button size="sm" loading={create.isPending} onClick={() => create.mutate()}>
                {t("action_add")}
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setDraft(null)}>
                {t("action_cancel")}
              </Button>
            </div>
          </div>
        )}

        <ul className="divide-y divide-sand-100 dark:divide-sand-800">
          {categories.data?.map((category) => (
            <li key={category.id} className="py-3">
              {editing?.id === category.id ? (
                <div className="space-y-3">
                  <LocalizedField
                    label={t("filter_category")}
                    value={editing.name}
                    onChange={(name) => setEditing({ ...editing, name })}
                    primaryLang="en"
                  />
                  <Field label="Icon">
                    <Input
                      value={editing.icon}
                      onChange={(e) => setEditing({ ...editing, icon: e.target.value })}
                      maxLength={4}
                      className="w-24"
                    />
                  </Field>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      loading={update.isPending}
                      onClick={() => update.mutate()}
                    >
                      {t("action_save")}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>
                      {t("action_cancel")}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-lg">{category.icon}</span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium text-sand-800 dark:text-sand-100">
                      {pickLocalized(category.name, lang, "en")}
                    </p>
                    <p className="truncate text-xs text-sand-500">{category.slug}</p>
                  </div>
                  <Badge>{category.storeCount}</Badge>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      setEditing({
                        id: category.id,
                        name: category.name,
                        icon: category.icon ?? "",
                      })
                    }
                  >
                    {t("action_edit")}
                  </Button>
                  <button
                    type="button"
                    onClick={() => remove.mutate(category.id)}
                    disabled={category.storeCount > 0}
                    title={
                      category.storeCount > 0
                        ? `${category.storeCount} ${t("admin_stores")}`
                        : t("action_delete")
                    }
                    className="rounded-lg p-1.5 text-sand-500 transition hover:bg-rose-50 hover:text-rose-600 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-rose-500/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
