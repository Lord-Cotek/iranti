import { z } from "zod";

/**
 * Server configuration, validated lazily so `next build` works without secrets. Never log
 * the parsed object: it holds credentials.
 */
const ServerEnv = z.object({
  DATABASE_URL: z.string().min(1).optional(),
  AUTH_SECRET: z.string().min(32).optional(),
  AUTH_URL: z.string().url().default("http://localhost:3001"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  CAPACITOR_ORIGINS: z.string().default("capacitor://localhost,https://localhost"),
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().optional(),
  R2_ACCOUNT_ID: z.string().optional(),
  R2_ACCESS_KEY_ID: z.string().optional(),
  R2_SECRET_ACCESS_KEY: z.string().optional(),
  R2_BUCKET: z.string().default("iranti-vault"),
  /** Test/dev override for the S3-compatible endpoint. */
  R2_ENDPOINT: z.string().url().optional(),
  /** Local only: keep sent emails in memory and expose them at /api/dev/mail. */
  IRANTI_DEV_MAIL: z.string().optional(),
  /** Local e2e only: raise auth rate limits (many sign-ups from one IP). Ignored on Vercel. */
  IRANTI_E2E_RELAX_RATE_LIMIT: z.string().optional(),
  /**
   * Comma-separated emails or @domains allowed to create accounts. Unset: open everywhere
   * except Vercel production, where sign-ups stay closed until this is set (pre-launch).
   */
  SIGNUP_ALLOWLIST: z.string().optional(),
  VERCEL: z.string().optional(),
  VERCEL_ENV: z.string().optional(),
  VERCEL_GIT_COMMIT_SHA: z.string().optional(),
});

export type ServerEnv = z.infer<typeof ServerEnv>;

let cached: ServerEnv | null = null;

export function env(): ServerEnv {
  cached ??= ServerEnv.parse(process.env);
  return cached;
}

/** For tests only. */
export function resetEnvCache(): void {
  cached = null;
}

/** e2e rate-limit relaxation can never be on in a Vercel deployment. */
export function relaxedRateLimits(): boolean {
  const e = env();
  return e.IRANTI_E2E_RELAX_RATE_LIMIT === "1" && !e.VERCEL;
}

/** The dev mail sink can never be on in a Vercel deployment. */
export function devMailEnabled(): boolean {
  const e = env();
  return e.IRANTI_DEV_MAIL === "1" && !e.VERCEL;
}

export function signupAllowed(email: string): boolean {
  const e = env();
  const list = (e.SIGNUP_ALLOWLIST ?? "")
    .split(",")
    .map((x) => x.trim().toLowerCase())
    .filter(Boolean);
  if (list.length === 0) return e.VERCEL_ENV !== "production";
  const address = email.trim().toLowerCase();
  const domain = address.slice(address.lastIndexOf("@"));
  return list.includes(address) || list.includes(domain);
}
