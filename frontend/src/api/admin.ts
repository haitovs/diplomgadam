import type {
  AdminAccount,
  AdminRole,
  AdminStats,
  AdminStoreSummary,
  AuditEntry,
  Localized,
  StoreDetailResponse,
  StoreRecord,
  StoreStatus,
} from "../types/api";
import { del, get, patch, post, put } from "./client";

export interface AdminStoreListQuery {
  status?: StoreStatus;
  search?: string;
  page?: number;
  perPage?: number;
}

export const adminApi = {
  signIn: (username: string, password: string) =>
    post<{ admin: AdminAccount }>("/auth/admin/login", { username, password }),

  signOut: () => post<{ ok: true }>("/auth/admin/logout"),

  me: () => get<{ admin: AdminAccount }>("/auth/admin/me").then((r) => r.admin),

  changePassword: (currentPassword: string, newPassword: string) =>
    post<{ ok: true }>("/auth/admin/change-password", {
      currentPassword,
      newPassword,
    }),

  stats: () => get<AdminStats>("/admin/stats"),

  stores: (query: AdminStoreListQuery = {}) =>
    get<{
      stores: AdminStoreSummary[];
      total: number;
      page: number;
      perPage: number;
    }>("/admin/stores", {
      ...query,
      page: query.page ?? 1,
      perPage: query.perPage ?? 20,
    }),

  store: (storeId: string) =>
    get<StoreDetailResponse>(`/admin/stores/${storeId}`),

  updateStore: (storeId: string, body: Record<string, unknown>) =>
    patch<{ store: StoreRecord }>(`/admin/stores/${storeId}`, body),

  approve: (storeId: string) =>
    post<{ store: StoreRecord }>(`/admin/stores/${storeId}/approve`),

  reject: (storeId: string, reason: string) =>
    post<{ store: StoreRecord }>(`/admin/stores/${storeId}/reject`, { reason }),

  suspend: (storeId: string, reason: string) =>
    post<{ store: StoreRecord }>(`/admin/stores/${storeId}/suspend`, { reason }),

  reinstate: (storeId: string) =>
    post<{ store: StoreRecord }>(`/admin/stores/${storeId}/reinstate`),

  deleteStore: (storeId: string) =>
    del<{ ok: true }>(`/admin/stores/${storeId}`),

  resetOwnerPassword: (storeId: string, userId: string) =>
    post<{ phone: string; temporaryPassword: string }>(
      `/admin/stores/${storeId}/owners/${userId}/reset-password`,
    ),

  setOwnerActive: (storeId: string, userId: string, isActive: boolean) =>
    post<{ ok: true }>(`/admin/stores/${storeId}/owners/${userId}/active`, {
      isActive,
    }),

  impersonate: (storeId: string) =>
    post<{ ok: true; storeId: string; ownerName: string }>(
      `/admin/stores/${storeId}/impersonate`,
    ),

  stopImpersonation: () => post<{ ok: true }>("/admin/stop-impersonation"),

  // ── Categories ─────────────────────────────────────────────────────────────

  categories: () =>
    get<{
      categories: {
        id: string;
        slug: string;
        name: Localized;
        icon: string | null;
        sortOrder: number;
        storeCount: number;
      }[];
    }>("/admin/categories").then((r) => r.categories),

  createCategory: (body: { name: Localized; icon?: string | null; slug?: string }) =>
    post<{ category: { id: string } }>("/admin/categories", body),

  updateCategory: (
    categoryId: string,
    body: { name?: Localized; icon?: string | null },
  ) => patch<{ category: { id: string } }>(`/admin/categories/${categoryId}`, body),

  deleteCategory: (categoryId: string) =>
    del<{ ok: true }>(`/admin/categories/${categoryId}`),

  reorderCategories: (ids: string[]) =>
    put<{ ok: true }>("/admin/categories/order", { ids }),

  // ── Administrators ─────────────────────────────────────────────────────────

  admins: () =>
    get<{ admins: AdminAccount[] }>("/admin/admins").then((r) => r.admins),

  createAdmin: (body: {
    username: string;
    name: string;
    role: AdminRole;
    password: string;
  }) => post<{ admin: AdminAccount }>("/admin/admins", body),

  updateAdmin: (
    adminId: string,
    body: { name?: string; role?: AdminRole; isActive?: boolean },
  ) => patch<{ admin: AdminAccount }>(`/admin/admins/${adminId}`, body),

  resetAdminPassword: (adminId: string) =>
    post<{ username: string; temporaryPassword: string }>(
      `/admin/admins/${adminId}/reset-password`,
    ),

  deleteAdmin: (adminId: string) => del<{ ok: true }>(`/admin/admins/${adminId}`),

  // ── Audit ──────────────────────────────────────────────────────────────────

  audit: (query: { page?: number; perPage?: number; action?: string } = {}) =>
    get<{
      entries: AuditEntry[];
      total: number;
      page: number;
      perPage: number;
    }>("/admin/audit", { ...query, page: query.page ?? 1, perPage: query.perPage ?? 30 }),
};
