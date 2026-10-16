import { z } from "zod";

/**
 * Server configuration, validated lazily so `next build` works without secrets. Never log
 * the parsed object: it holds credentials.
 */
const ServerEnv = z.object({
  DATABASE_URL: z.string().url().optional(),
  AUTH_URL: z.string().url().default("http://localhost:3001"),
  WEB_ORIGIN: z.string().url().default("http://localhost:3000"),
  CAPACITOR_ORIGINS: z.string().default("capacitor://localhost,https://localhost"),
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
