import type { Lang } from "../i18n/translations";
import type {
  Localized,
  MediaItem,
  MediaKind,
  MenuItemRecord,
  MenuSectionRecord,
  StoreDetailResponse,
  StoreRecord,
  StoreSession,
} from "../types/api";
import { del, get, patch, post, put, upload } from "./client";

export interface RegisterPayload {
  owner: {
    fullName: string;
    position?: string;
    phone: string;
    personalPhone?: string;
    password: string;
  };
  store: {
    name: Localized;
    primaryLang: Lang;
    phone: string;
  };
}

export interface HoursPayload {
  hours: {
    weekday: number;
    isClosed: boolean;
    opens?: string | null;
    closes?: string | null;
  }[];
}

export interface SpecialHoursPayload {
  entries: {
    date: string;
    isClosed: boolean;
    opens?: string | null;
    closes?: string | null;
    note?: Localized;
  }[];
}

export const storeApi = {
  register: (payload: RegisterPayload) =>
    post<{ store: StoreRecord; user: { id: string; phone: string } }>(
      "/store/register",
      payload,
    ),

  signIn: (phone: string, password: string) =>
    post<StoreSession>("/auth/store/login", { phone, password }),

  signOut: () => post<{ ok: true }>("/auth/store/logout"),

  me: () => get<StoreSession>("/auth/store/me"),

  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ ok: true }>("/auth/store/change-password", {
      currentPassword,
      newPassword,
    }),

  detail: () => get<StoreDetailResponse>("/store/me"),

  completeness: () => get<{ blockers: string[] }>("/store/me/completeness"),

  update: (patchBody: Partial<Record<string, unknown>>) =>
    patch<{ store: StoreRecord }>("/store/me", patchBody),

  setHours: (payload: HoursPayload) =>
    put<{ ok: true }>("/store/me/hours", payload),

  setSpecialHours: (payload: SpecialHoursPayload) =>
    put<{ ok: true }>("/store/me/special-hours", payload),

  setCategories: (categoryIds: string[]) =>
    put<{ ok: true }>("/store/me/categories", { categoryIds }),

  submit: () => post<{ store: StoreRecord }>("/store/me/submit"),

  // ── Menu ───────────────────────────────────────────────────────────────────

  menu: () =>
    get<{ sections: MenuSectionRecord[] }>("/store/me/menu").then(
      (r) => r.sections,
    ),

  createSection: (name: Localized) =>
    post<{ section: MenuSectionRecord }>("/store/me/menu/sections", { name }),

  updateSection: (sectionId: string, name: Localized) =>
    patch<{ section: MenuSectionRecord }>(
      `/store/me/menu/sections/${sectionId}`,
      { name },
    ),

  deleteSection: (sectionId: string) =>
    del<{ ok: true }>(`/store/me/menu/sections/${sectionId}`),

  reorderSections: (ids: string[]) =>
    put<{ ok: true }>("/store/me/menu/sections/order", { ids }),

  createItem: (body: {
    sectionId: string;
    name: Localized;
    description?: Localized;
    priceMinor: number;
    mediaId?: string | null;
    isAvailable?: boolean;
  }) => post<{ item: MenuItemRecord }>("/store/me/menu/items", body),

  updateItem: (itemId: string, body: Record<string, unknown>) =>
    patch<{ item: MenuItemRecord }>(`/store/me/menu/items/${itemId}`, body),

  deleteItem: (itemId: string) =>
    del<{ ok: true }>(`/store/me/menu/items/${itemId}`),

  reorderItems: (ids: string[]) =>
    put<{ ok: true }>("/store/me/menu/items/order", { ids }),

  // ── Media ──────────────────────────────────────────────────────────────────

  media: (kind?: MediaKind) =>
    get<{ media: MediaItem[]; quotas: Record<MediaKind, number> }>(
      "/store/me/media",
      kind ? { kind } : undefined,
    ),

  uploadMedia: (kind: MediaKind, file: File) => {
    const form = new FormData();
    form.append("kind", kind);
    form.append("image", file);
    return upload<{ media: MediaItem }>("/store/me/media", form);
  },

  deleteMedia: (mediaId: string) =>
    del<{ ok: true }>(`/store/me/media/${mediaId}`),

  reorderMedia: (kind: MediaKind, ids: string[]) =>
    put<{ ok: true }>("/store/me/media/order", { kind, ids }),
};
