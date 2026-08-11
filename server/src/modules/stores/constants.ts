/**
 * Stable keys for the checkbox-style fields. Storing keys rather than display
 * text keeps them translatable in the frontend and filterable in the database.
 */
export const AMENITIES = [
  "wifi",
  "parking",
  "air_conditioning",
  "outdoor_seating",
  "family_section",
  "kids_area",
  "wheelchair_access",
  "prayer_room",
  "live_music",
  "smoking_area",
  "halal",
  "alcohol_served",
] as const;
export type Amenity = (typeof AMENITIES)[number];

export const PAYMENT_METHODS = ["cash", "card", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export const PRICE_TIERS = ["$", "$$", "$$$", "$$$$"] as const;
export type PriceTier = (typeof PRICE_TIERS)[number];

/** 0 = Monday through 6 = Sunday. */
export const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6] as const;

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
