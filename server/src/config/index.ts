import "dotenv/config";
import path from "path";
import { z } from "zod";

/**
 * Environment contract. Parsed once at boot; a bad value stops the process
 * immediately rather than surfacing as a confusing runtime error later.
 */
const schema = z.object({
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  PORT: z.coerce.number().int().positive().default(4080),

  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),

  /** Public origin, used for cookie security and CORS in production. */
  PUBLIC_ORIGIN: z.string().url().optional(),

  /** Set when the app sits behind Caddy/nginx so req.ip reflects the client. */
  TRUST_PROXY: z
    .enum(["true", "false"])
    .default("true")
    .transform((v) => v === "true"),

  SESSION_TTL_DAYS: z.coerce.number().int().positive().default(30),

  /** Writable volume for uploaded media. */
  UPLOAD_DIR: z.string().default("/data/uploads"),
  /**
   * Map bundle location. Baked into the image under /app rather than /data,
   * so mounting a volume at /data/uploads cannot shadow it.
   */
  MAPS_DIR: z.string().default("/app/maps"),

  MAX_UPLOAD_MB: z.coerce.number().positive().default(8),
  MAX_GALLERY_IMAGES: z.coerce.number().int().positive().default(12),
  MIN_VENUE_PROOF_IMAGES: z.coerce.number().int().nonnegative().default(2),

  /** Username created on first boot when no admin exists. */
  BOOTSTRAP_ADMIN_USERNAME: z.string().min(3).default("admin"),
  /**
   * Optional fixed password for the bootstrap admin. When unset a random one is
   * generated and printed to the log exactly once.
   */
  BOOTSTRAP_ADMIN_PASSWORD: z.string().min(12).optional(),

  /** Failed logins allowed per identifier before a temporary lockout. */
  LOGIN_MAX_ATTEMPTS: z.coerce.number().int().positive().default(8),
  LOGIN_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),
});

/**
 * Docker Compose renders an unset variable as an empty string rather than
 * omitting it, so `${BOOTSTRAP_ADMIN_PASSWORD:-}` arrives as "" and would fail
 * an optional field's own validation. Treating empty as absent is what the
 * compose file actually means.
 */
const presentEnv = Object.fromEntries(
  Object.entries(process.env).filter(([, value]) => value !== ""),
);

const parsed = schema.safeParse(presentEnv);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((i) => `  ${i.path.join(".") || "(root)"}: ${i.message}`)
    .join("\n");
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

const env = parsed.data;

const isProduction = env.NODE_ENV === "production";

export const config = {
  ...env,
  isProduction,
  isTest: env.NODE_ENV === "test",
  /** Cookies may only carry the Secure flag when the site is actually served over TLS. */
  secureCookies: isProduction && (env.PUBLIC_ORIGIN ?? "").startsWith("https://"),
  sessionTtlMs: env.SESSION_TTL_DAYS * 24 * 60 * 60 * 1000,
  maxUploadBytes: Math.round(env.MAX_UPLOAD_MB * 1024 * 1024),
  uploadDir: path.resolve(env.UPLOAD_DIR),
  mapsDir: path.resolve(env.MAPS_DIR),
} as const;

export type Config = typeof config;
