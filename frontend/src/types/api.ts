import type { Lang } from "../i18n/translations";

/** A translatable field as stored: every language optional. */
export type Localized = Partial<Record<Lang, string>>;

export type StoreStatus =
  | "draft"
  | "pending"
  | "approved"
  | "rejected"
  | "suspended";

export type PriceTier = "$" | "$$" | "$$$" | "$$$$";

export type MediaKind = "cover" | "gallery" | "menu_item" | "venue_proof";

export interface MediaItem {
  id: string;
  kind: MediaKind;
  width: number;
  height: number;
  bytes: number;
  sortOrder: number;
  createdAt: string;
  url: string;
  urlJpeg: string;
  thumbUrl: string;
  thumbUrlJpeg: string;
}

export interface Coordinates {
  lat: number;
  lng: number;
}

export interface CategorySummary {
  /** Present on the public categories list; omitted where a store's own
      categories are embedded in a listing response. */
  id?: string;
  slug: string;
  name: string;
  icon: string | null;
  storeCount?: number;
}

// ── Public shapes (localised server-side) ────────────────────────────────────

export interface PublicStoreSummary {
  id: string;
  slug: string;
  name: string;
  description: string;
  address: string;
  neighborhood: string | null;
  city: string;
  coordinates: Coordinates | null;
  priceTier: PriceTier;
  phone: string | null;
  amenities: string[];
  service: { dineIn: boolean; takeaway: boolean; delivery: boolean };
  temporarilyClosed: boolean;
  openingSoon: boolean;
  openNow: boolean;
  cover: MediaItem | null;
  categories: CategorySummary[];
  views: number;
  createdAt: string;
}

export interface HourEntry {
  weekday: number;
  isClosed: boolean;
  opens: string | null;
  closes: string | null;
}

export interface SpecialHourEntry {
  date: string;
  isClosed: boolean;
  opens: string | null;
  closes: string | null;
  note: string;
}

export interface PublicMenuItem {
  id: string;
  name: string;
  description: string;
  priceMinor: number;
  currency: string;
  image: MediaItem | null;
}

export interface PublicMenuSection {
  id: string;
  name: string;
  items: PublicMenuItem[];
}

export interface PublicStoreDetail {
  id: string;
  slug: string;
  primaryLang: Lang;
  name: string;
  description: string;
  location: {
    address: string;
    neighborhood: string | null;
    city: string;
    coordinates: Coordinates | null;
  };
  contact: {
    phone: string | null;
    phoneSecondary: string | null;
    website: string | null;
    instagram: string | null;
    tiktok: string | null;
    telegram: string | null;
    whatsapp: string | null;
    reservationPhone: string | null;
    deliveryPhone: string | null;
  };
  priceTier: PriceTier;
  service: {
    dineIn: boolean;
    takeaway: boolean;
    delivery: boolean;
    banquetHall: boolean;
    capacity: number | null;
  };
  amenities: string[];
  paymentMethods: string[];
  temporarilyClosed: boolean;
  closureNote: string;
  openingSoon: boolean;
  openNow: boolean;
  hours: HourEntry[];
  specialHours: SpecialHourEntry[];
  categories: CategorySummary[];
  cover: MediaItem | null;
  gallery: MediaItem[];
  menu: PublicMenuSection[];
  views: number;
}

export interface Paginated<T> {
  total: number;
  page: number;
  perPage: number;
}

export interface PublicStoreList extends Paginated<PublicStoreSummary> {
  stores: PublicStoreSummary[];
}

export interface FilterOptions {
  neighborhoods: string[];
  priceTiers: PriceTier[];
  amenities: string[];
}

export interface Insights {
  totals: {
    stores: number;
    withDelivery: number;
    withBanquet: number;
    totalViews: number;
    menuItems: number;
  };
  menuPrices: { avgMinor: number; minMinor: number; maxMinor: number };
  byCategory: { slug: string; name: string; icon: string | null; count: number }[];
  byNeighborhood: { neighborhood: string; count: number }[];
  byPriceTier: { priceTier: string; count: number }[];
  mostViewed: { slug: string; name: string; views: number }[];
  newest: { slug: string; name: string; createdAt: string }[];
}

// ── Owner portal shapes (raw, multilingual) ──────────────────────────────────

export interface StoreRecord {
  id: string;
  slug: string;
  status: StoreStatus;
  primaryLang: Lang;
  name: Localized;
  description: Localized;
  address: Localized;
  city: string;
  neighborhood: string | null;
  lat: number | null;
  lng: number | null;
  priceTier: PriceTier;
  phone: string | null;
  phoneSecondary: string | null;
  website: string | null;
  instagram: string | null;
  tiktok: string | null;
  telegram: string | null;
  whatsapp: string | null;
  dineIn: boolean;
  takeaway: boolean;
  delivery: boolean;
  deliveryPhone: string | null;
  reservationPhone: string | null;
  capacity: number | null;
  banquetHall: boolean;
  amenities: string[];
  paymentMethods: string[];
  temporarilyClosed: boolean;
  closureNote: Localized;
  openingSoon: boolean;
  businessRegNo: string | null;
  views: number;
  rejectionReason: string | null;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OwnerAccount {
  id: string;
  phone: string;
  fullName: string;
  position: string | null;
  personalPhone: string | null;
  isActive: boolean;
  lastLoginAt: string | null;
}

export interface StoreDetailResponse {
  store: StoreRecord;
  hours: (HourEntry & { id: string })[];
  specialHours: {
    id: string;
    date: string;
    isClosed: boolean;
    opens: string | null;
    closes: string | null;
    note: Localized;
  }[];
  categories: { id: string; slug: string; name: Localized; icon: string | null }[];
  media: MediaItem[];
  owners: OwnerAccount[];
  blockers: string[];
}

export interface MenuSectionRecord {
  id: string;
  name: Localized;
  sortOrder: number;
  items: MenuItemRecord[];
}

export interface MenuItemRecord {
  id: string;
  sectionId: string;
  name: Localized;
  description: Localized;
  priceMinor: number;
  currency: string;
  mediaId: string | null;
  isAvailable: boolean;
  sortOrder: number;
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export type AdminRole = "owner" | "moderator";

export interface AdminAccount {
  id: string;
  username: string;
  name: string;
  role: AdminRole;
  isActive?: boolean;
  mustChangePassword: boolean;
  lastLoginAt?: string | null;
  createdAt?: string;
}

export interface StoreSession {
  user: {
    id: string;
    phone: string;
    fullName: string;
    mustChangePassword: boolean;
  };
  store: { id: string; slug: string; status: StoreStatus; name: Localized };
  impersonated?: boolean;
}

// ── Admin ────────────────────────────────────────────────────────────────────

export interface AdminStoreSummary {
  id: string;
  slug: string;
  status: StoreStatus;
  primaryLang: Lang;
  name: Localized;
  neighborhood: string | null;
  phone: string | null;
  views: number;
  submittedAt: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminStats {
  statusCounts: Record<StoreStatus, number>;
  totals: {
    owners: number;
    menuItems: number;
    images: number;
    storageBytes: number;
    totalViews: number;
  };
  recent: { id: string; name: Localized; status: StoreStatus; createdAt: string }[];
}

export interface AuditEntry {
  id: string;
  actorType: string;
  actorId: string | null;
  actorLabel: string | null;
  impersonatedByAdminId: string | null;
  action: string;
  targetType: string | null;
  targetId: string | null;
  meta: Record<string, unknown>;
  ip: string | null;
  createdAt: string;
}
