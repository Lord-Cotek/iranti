import type { HealthResponse } from "@iranti/core";
import { env } from "./env";

export type DbProbe = () => Promise<"ok" | "unconfigured" | "error">;

export async function checkHealth(probe: DbProbe, now = new Date()): Promise<HealthResponse> {
  const db = await probe();
  return {
    status: db === "error" ? "degraded" : "ok",
    service: "iranti-api",
    version: env().VERCEL_GIT_COMMIT_SHA?.slice(0, 12) ?? "dev",
    time: now.toISOString(),
    db,
  };
}
