import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, MapPin, Save } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { ApiError } from "../../api/client";
import { publicApi } from "../../api/public";
import { storeApi } from "../../api/store";
import LocalizedField from "../../components/LocalizedField";
import MapView, { ASHGABAT_CENTER } from "../../components/MapView";
import {
  Button,
  Card,
  CheckboxPill,
  ErrorNote,
  Field,
  Input,
  PageHeader,
  SectionTitle,
  Select,
  Skeleton,
  Toggle,
  inputClass,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import { pickLocalized } from "../../lib/format";
import type { Localized, PriceTier } from "../../types/api";

const PRICE_TIERS: PriceTier[] = ["$", "$$", "$$$", "$$$$"];
const PAYMENT_METHODS = ["cash", "card", "bank_transfer"];
const MAX_CATEGORIES = 8;

/**
 * One numbered chapter of a long form.
 *
 * The form runs to eight groups, which is far too much to meet as one column of
 * fields. Each group gets its own card, a numbered gutter and an accented rule,
 * so an owner can find where they left off by scanning rather than reading.
 */
function FormSection({
  index,
  title,
  description,
  action,
  children,
}: {
  index: number;
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  return (
    <Card>
      <div className="flex gap-4 sm:gap-5">
        <span
          aria-hidden
          className="mt-0.5 hidden h-8 w-8 shrink-0 place-items-center rounded-full bg-clay-50 font-display text-sm font-semibold tabular-nums text-clay-700 sm:grid dark:bg-clay-500/10 dark:text-clay-300"
        >
          {index}
        </span>
        <div className="min-w-0 flex-1">
          <SectionTitle title={title} description={description} action={action} rule />
          {children}
        </div>
      </div>
    </Card>
  );
}

export default function StoreListingPage() {
  const { t, lang } = useLanguage();
  const queryClient = useQueryClient();
  const [error, setError] = useState("");
  const [savedAt, setSavedAt] = useState(0);

  const detail = useQuery({ queryKey: ["store-detail"], queryFn: () => storeApi.detail() });
  const options = useQuery({ queryKey: ["public-filters"], queryFn: () => publicApi.filters() });
  const categories = useQuery({
    queryKey: ["public-categories", lang],
    queryFn: () => publicApi.categories(lang),
  });
  const [form, setForm] = useState<Record<string, unknown> | null>(null);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

  useEffect(() => {
    if (!detail.data || form) return;
    const s = detail.data.store;
    setForm({
      name: s.name,
      description: s.description,
      address: s.address,
      closureNote: s.closureNote,
      neighborhood: s.neighborhood ?? "",
      lat: s.lat,
      lng: s.lng,
      priceTier: s.priceTier,
      phone: s.phone ?? "",
      phoneSecondary: s.phoneSecondary ?? "",
      website: s.website ?? "",
      instagram: s.instagram ?? "",
      tiktok: s.tiktok ?? "",
      telegram: s.telegram ?? "",
      whatsapp: s.whatsapp ?? "",
      dineIn: s.dineIn,
      takeaway: s.takeaway,
      delivery: s.delivery,
      deliveryPhone: s.deliveryPhone ?? "",
      reservationPhone: s.reservationPhone ?? "",
      capacity: s.capacity,
      banquetHall: s.banquetHall,
      amenities: s.amenities,
      paymentMethods: s.paymentMethods,
      temporarilyClosed: s.temporarilyClosed,
      openingSoon: s.openingSoon,
      businessRegNo: s.businessRegNo ?? "",
    });
    setSelectedCategories(detail.data.categories.map((c) => c.id));
  }, [detail.data, form]);

  const save = useMutation({
    mutationFn: async () => {
      if (!form) return;
      // Empty strings mean "cleared"; the API turns them into nulls.
      await storeApi.update(form);
      await storeApi.setCategories(selectedCategories);
    },
    onSuccess: async () => {
      setError("");
      setSavedAt(Date.now());
      await queryClient.invalidateQueries({ queryKey: ["store-detail"] });
    },
    onError: (err) =>
      setError(err instanceof ApiError ? err.message : t("error_generic")),
  });

  if (detail.isError) return <ErrorNote message={t("error_generic")} />;
  if (detail.isLoading || !form) return <ListingSkeleton />;

  const primaryLang = detail.data!.store.primaryLang;
  const set = (patch: Record<string, unknown>) =>
    setForm((prev) => ({ ...(prev ?? {}), ...patch }));

  const coords =
    typeof form.lat === "number" && typeof form.lng === "number"
      ? ([form.lng as number, form.lat as number] as [number, number])
      : null;

  const toggleList = (key: string, value: string, on: boolean) => {
    const list = (form[key] as string[] | undefined) ?? [];
    set({ [key]: on ? [...list, value] : list.filter((v) => v !== value) });
  };

  return (
    <div>
      {/* The h1 names the listing being edited; the chapters below carry the
          section headings. */}
      <PageHeader
        title={
          pickLocalized(detail.data!.store.name, lang, primaryLang) ||
          t("portal_listing")
        }
      />

      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate();
        }}
      >
        <FormSection index={1} title={t("portal_listing")}>
          <div className="space-y-5">
            <LocalizedField
              label={t("store_name")}
              value={form.name as Localized}
              onChange={(next) => set({ name: next })}
              primaryLang={primaryLang}
            />
            <LocalizedField
              label={t("form_description")}
              value={form.description as Localized}
              onChange={(next) => set({ description: next })}
              primaryLang={primaryLang}
              multiline
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label={t("form_price_tier")}>
                <Select
                  value={form.priceTier as string}
                  onChange={(e) => set({ priceTier: e.target.value })}
                >
                  {PRICE_TIERS.map((tier) => (
                    <option key={tier} value={tier}>
                      {tier}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>
          </div>
        </FormSection>

        <FormSection
          index={2}
          title={t("form_categories")}
          description={t("form_categories_hint")}
          action={
            <span className="text-sm font-semibold tabular-nums text-sand-700 dark:text-sand-300">
              {selectedCategories.length}/{MAX_CATEGORIES}
            </span>
          }
        >
          {categories.isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-24" />
              ))}
            </div>
          ) : categories.isError ? (
            <ErrorNote message={t("error_generic")} />
          ) : (categories.data ?? []).length === 0 ? (
            <p className="text-sm text-sand-600 dark:text-sand-500">{t("empty_none")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {categories.data?.map((category) => {
                const categoryId = category.id;
                if (!categoryId) return null;
                return (
                  <CheckboxPill
                    key={category.slug}
                    checked={selectedCategories.includes(categoryId)}
                    onChange={(on) =>
                      setSelectedCategories((prev) =>
                        on
                          ? // The API caps the selection at 8, so the extra chip
                            // simply does not latch rather than failing on save.
                            prev.length < MAX_CATEGORIES
                            ? [...prev, categoryId]
                            : prev
                          : prev.filter((c) => c !== categoryId),
                      )
                    }
                  >
                    {category.icon} {category.name}
                  </CheckboxPill>
                );
              })}
            </div>
          )}
        </FormSection>

        <FormSection
          index={3}
          title={t("detail_location")}
          description={t("form_location_hint")}
        >
          <div className="space-y-4">
            <LocalizedField
              label={t("form_address")}
              value={form.address as Localized}
              onChange={(next) => set({ address: next })}
              primaryLang={primaryLang}
            />
            <Field label={t("form_neighborhood")}>
              <Input
                list="neighborhood-options"
                value={form.neighborhood as string}
                onChange={(e) => set({ neighborhood: e.target.value })}
              />
            </Field>
            <datalist id="neighborhood-options">
              {options.data?.neighborhoods.map((n) => (
                <option key={n} value={n} />
              ))}
            </datalist>

            <MapView
              className="h-72"
              center={coords ?? ASHGABAT_CENTER}
              zoom={coords ? 16 : 12}
              markers={coords ? [{ id: "self", lng: coords[0], lat: coords[1] }] : []}
              onMapClick={({ lng, lat }) => set({ lat, lng })}
            />

            {/* The read-out sits under the map as a sunken plate, so a set
                position is confirmed in figures as well as by the pin. */}
            <p className="surface-sunken flex items-center gap-2 rounded-card border border-[var(--border-subtle)] px-3.5 py-2.5 text-xs text-sand-600 dark:text-sand-400">
              <MapPin className="h-3.5 w-3.5 shrink-0 text-clay-600 dark:text-clay-400" />
              {coords ? (
                <span className="tabular-nums">
                  {coords[1].toFixed(5)}, {coords[0].toFixed(5)}
                </span>
              ) : (
                <span>{t("form_location_pick")}</span>
              )}
            </p>
          </div>
        </FormSection>

        <FormSection index={4} title={t("detail_contact")}>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("store_phone")} required>
              <Input
                type="tel"
                className="tabular-nums"
                value={form.phone as string}
                onChange={(e) => set({ phone: e.target.value })}
              />
            </Field>
            <Field label={t("form_phone_secondary")}>
              <Input
                type="tel"
                className="tabular-nums"
                value={form.phoneSecondary as string}
                onChange={(e) => set({ phoneSecondary: e.target.value })}
              />
            </Field>
            <Field label={t("form_website")}>
              <Input
                type="url"
                placeholder="https://"
                value={form.website as string}
                onChange={(e) => set({ website: e.target.value })}
              />
            </Field>
            <Field label={t("form_instagram")}>
              <Input
                value={form.instagram as string}
                onChange={(e) => set({ instagram: e.target.value })}
                placeholder="@handle"
              />
            </Field>
            <Field label={t("form_telegram")}>
              <Input
                value={form.telegram as string}
                onChange={(e) => set({ telegram: e.target.value })}
                placeholder="@handle"
              />
            </Field>
            <Field label={t("form_tiktok")}>
              <Input
                value={form.tiktok as string}
                onChange={(e) => set({ tiktok: e.target.value })}
                placeholder="@handle"
              />
            </Field>
            <Field label={t("form_whatsapp")}>
              <Input
                type="tel"
                className="tabular-nums"
                value={form.whatsapp as string}
                onChange={(e) => set({ whatsapp: e.target.value })}
              />
            </Field>
            <Field label={t("form_reservation_phone")}>
              <Input
                type="tel"
                className="tabular-nums"
                value={form.reservationPhone as string}
                onChange={(e) => set({ reservationPhone: e.target.value })}
              />
            </Field>
          </div>
        </FormSection>

        <FormSection index={5} title={t("form_service_options")}>
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="surface-sunken space-y-3.5 rounded-card border border-[var(--border-subtle)] p-4">
              <Toggle
                checked={form.dineIn as boolean}
                onChange={(v) => set({ dineIn: v })}
                label={t("service_dine_in")}
              />
              <Toggle
                checked={form.takeaway as boolean}
                onChange={(v) => set({ takeaway: v })}
                label={t("service_takeaway")}
              />
              <Toggle
                checked={form.delivery as boolean}
                onChange={(v) => set({ delivery: v })}
                label={t("service_delivery")}
              />
              <Toggle
                checked={form.banquetHall as boolean}
                onChange={(v) => set({ banquetHall: v })}
                label={t("form_banquet_hall")}
              />
            </div>
            <div className="space-y-4">
              <Field label={t("form_capacity")}>
                <Input
                  type="number"
                  min={1}
                  className="tabular-nums"
                  value={(form.capacity as number | null) ?? ""}
                  onChange={(e) =>
                    set({ capacity: e.target.value ? Number(e.target.value) : null })
                  }
                />
              </Field>
              {(form.delivery as boolean) && (
                <Field label={t("form_delivery_phone")}>
                  <Input
                    type="tel"
                    className="tabular-nums"
                    value={form.deliveryPhone as string}
                    onChange={(e) => set({ deliveryPhone: e.target.value })}
                  />
                </Field>
              )}
            </div>
          </div>
        </FormSection>

        <FormSection index={6} title={t("detail_amenities")}>
          {options.isLoading ? (
            <div className="flex flex-wrap gap-2">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-8 w-28" />
              ))}
            </div>
          ) : options.isError ? (
            <ErrorNote message={t("error_generic")} />
          ) : (options.data?.amenities ?? []).length === 0 ? (
            <p className="text-sm text-sand-600 dark:text-sand-500">{t("empty_none")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {options.data?.amenities.map((amenity) => (
                <CheckboxPill
                  key={amenity}
                  checked={((form.amenities as string[]) ?? []).includes(amenity)}
                  onChange={(on) => toggleList("amenities", amenity, on)}
                >
                  {t(`amenity_${amenity}` as TranslationKey)}
                </CheckboxPill>
              ))}
            </div>
          )}

          <h3 className="mb-2.5 mt-6 text-xs font-bold uppercase tracking-wider text-sand-500">
            {t("detail_payment")}
          </h3>
          <div className="flex flex-wrap gap-2">
            {PAYMENT_METHODS.map((method) => (
              <CheckboxPill
                key={method}
                checked={((form.paymentMethods as string[]) ?? []).includes(method)}
                onChange={(on) => toggleList("paymentMethods", method, on)}
              >
                {t(`payment_${method}` as TranslationKey)}
              </CheckboxPill>
            ))}
          </div>
        </FormSection>

        <FormSection index={7} title={t("form_temporarily_closed")}>
          <div className="space-y-4">
            <div className="surface-sunken space-y-3.5 rounded-card border border-[var(--border-subtle)] p-4">
              <Toggle
                checked={form.temporarilyClosed as boolean}
                onChange={(v) => set({ temporarilyClosed: v })}
                label={t("form_temporarily_closed")}
              />
              <Toggle
                checked={form.openingSoon as boolean}
                onChange={(v) => set({ openingSoon: v })}
                label={t("form_opening_soon")}
              />
            </div>
            {(form.temporarilyClosed as boolean) && (
              <LocalizedField
                label={t("form_closure_note")}
                value={form.closureNote as Localized}
                onChange={(next) => set({ closureNote: next })}
                primaryLang={primaryLang}
                multiline
                rows={2}
              />
            )}
          </div>
        </FormSection>

        <FormSection
          index={8}
          title={t("form_business_reg")}
          description={t("form_business_reg_hint")}
        >
          <input
            type="text"
            aria-label={t("form_business_reg")}
            className={`${inputClass} sm:max-w-xs`}
            value={form.businessRegNo as string}
            onChange={(e) => set({ businessRegNo: e.target.value })}
          />
        </FormSection>

        {error && <ErrorNote message={error} />}

        {/* Save dock. Anchored to the foot of the column with a top rule and a
            lifted edge, so it reads as part of the form rather than a chip
            drifting over it. */}
        <div className="sticky bottom-0 z-20">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-panel border border-b-0 border-[var(--border-subtle)] bg-[var(--surface-card)]/95 px-4 py-3.5 shadow-lifted backdrop-blur-md sm:px-5">
            <p className="min-w-0 text-sm">
              {save.isPending ? (
                <span className="text-sand-600 dark:text-sand-400">
                  {t("action_saving")}
                </span>
              ) : savedAt > 0 ? (
                <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700 dark:text-emerald-400">
                  <Check className="h-4 w-4 shrink-0" />
                  {t("saved")}
                </span>
              ) : null}
            </p>
            <Button
              type="submit"
              loading={save.isPending}
              icon={<Save className="h-4 w-4" />}
            >
              {t("action_save")}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}

/** Mirrors the card rhythm above so the page does not jump when data lands. */
function ListingSkeleton() {
  return (
    <div>
      <Skeleton className="h-9 w-48" />
      <div className="mt-7 space-y-5">
        {Array.from({ length: 3 }, (_, i) => (
          <Card key={i}>
            <Skeleton className="h-6 w-40" />
            <div className="mt-5 space-y-3">
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-full" />
              <Skeleton className="h-11 w-2/3" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
