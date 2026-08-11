import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Save } from "lucide-react";
import { useEffect, useState } from "react";
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
  SectionTitle,
  Select,
  Spinner,
  Toggle,
} from "../../components/ui";
import { useLanguage } from "../../i18n/LanguageContext";
import type { TranslationKey } from "../../i18n/translations";
import type { Localized, PriceTier } from "../../types/api";

const PRICE_TIERS: PriceTier[] = ["$", "$$", "$$$", "$$$$"];
const PAYMENT_METHODS = ["cash", "card", "bank_transfer"];

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

  if (detail.isLoading || !form) return <Spinner />;

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
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <Card>
        <SectionTitle title={t("portal_listing")} />
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
            <Field label={t("form_capacity")}>
              <Input
                type="number"
                min={1}
                value={(form.capacity as number | null) ?? ""}
                onChange={(e) =>
                  set({ capacity: e.target.value ? Number(e.target.value) : null })
                }
              />
            </Field>
          </div>
        </div>
      </Card>

      <Card>
        <SectionTitle title={t("form_categories")} description={t("form_categories_hint")} />
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
                        prev.length < 8
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
      </Card>

      <Card>
        <SectionTitle title={t("detail_location")} description={t("form_location_hint")} />
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
            markers={
              coords
                ? [{ id: "self", lng: coords[0], lat: coords[1] }]
                : []
            }
            onMapClick={({ lng, lat }) => set({ lat, lng })}
          />
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {coords
              ? `${coords[1].toFixed(5)}, ${coords[0].toFixed(5)}`
              : t("form_location_pick")}
          </p>
        </div>
      </Card>

      <Card>
        <SectionTitle title={t("detail_contact")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("store_phone")} required>
            <Input
              type="tel"
              value={form.phone as string}
              onChange={(e) => set({ phone: e.target.value })}
            />
          </Field>
          <Field label={t("form_phone_secondary")}>
            <Input
              type="tel"
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
              value={form.whatsapp as string}
              onChange={(e) => set({ whatsapp: e.target.value })}
            />
          </Field>
          <Field label={t("form_reservation_phone")}>
            <Input
              type="tel"
              value={form.reservationPhone as string}
              onChange={(e) => set({ reservationPhone: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      <Card>
        <SectionTitle title={t("form_service_options")} />
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-3">
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
          {(form.delivery as boolean) && (
            <Field label={t("form_delivery_phone")}>
              <Input
                type="tel"
                value={form.deliveryPhone as string}
                onChange={(e) => set({ deliveryPhone: e.target.value })}
              />
            </Field>
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle title={t("detail_amenities")} />
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

        <h3 className="mb-2 mt-5 text-sm font-semibold text-slate-700 dark:text-slate-200">
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
      </Card>

      <Card>
        <SectionTitle title={t("form_temporarily_closed")} />
        <div className="space-y-4">
          <Toggle
            checked={form.temporarilyClosed as boolean}
            onChange={(v) => set({ temporarilyClosed: v })}
            label={t("form_temporarily_closed")}
          />
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
          <Toggle
            checked={form.openingSoon as boolean}
            onChange={(v) => set({ openingSoon: v })}
            label={t("form_opening_soon")}
          />
          <Field label={t("form_business_reg")} hint={t("form_business_reg_hint")}>
            <Input
              value={form.businessRegNo as string}
              onChange={(e) => set({ businessRegNo: e.target.value })}
            />
          </Field>
        </div>
      </Card>

      {error && <ErrorNote message={error} />}

      <div className="sticky bottom-3 flex items-center gap-3">
        <Button type="submit" loading={save.isPending} icon={<Save className="w-4 h-4" />}>
          {t("action_save")}
        </Button>
        {savedAt > 0 && !save.isPending && (
          <span className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            {t("saved")}
          </span>
        )}
      </div>
    </form>
  );
}
