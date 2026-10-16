import { json, preflight } from "@/lib/cors";
import { db, isDbConfigured } from "@/lib/db";
import { checkHealth } from "@/lib/health";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function probeDb() {
  if (!isDbConfigured()) return "unconfigured" as const;
  try {
    await db().$queryRaw`SELECT 1`;
    return "ok" as const;
  } catch {
    // Deliberately no error detail: driver errors can echo connection strings.
    console.error("health: database probe failed");
    return "error" as const;
  }
}

export async function GET(request: Request) {
  const health = await checkHealth(probeDb);
  return json(request, health, { status: health.status === "ok" ? 200 : 503 });
}

export function OPTIONS(request: Request) {
  return preflight(request);
}
