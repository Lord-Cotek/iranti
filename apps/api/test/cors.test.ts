import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { corsHeaders, json } from "@/lib/cors";
import { resetEnvCache } from "@/lib/env";
import { checkHealth } from "@/lib/health";

beforeEach(() => {
  process.env.WEB_ORIGIN = "https://iranti.cotek.app";
  process.env.CAPACITOR_ORIGINS = "capacitor://localhost,https://localhost";
  resetEnvCache();
});
afterEach(() => resetEnvCache());

describe("CORS allowlist", () => {
  it("echoes allowed origins with credentials", () => {
    for (const origin of [
      "https://iranti.cotek.app",
      "capacitor://localhost",
      "https://localhost",
    ]) {
      const h = corsHeaders(origin);
      expect(h["Access-Control-Allow-Origin"]).toBe(origin);
      expect(h["Access-Control-Allow-Credentials"]).toBe("true");
    }
  });

  it("gives nothing to other origins, including look-alikes", () => {
    for (const origin of [
      "https://evil.example",
      "https://iranti.cotek.app.evil.example",
      "http://iranti.cotek.app",
      "null",
    ]) {
      expect(corsHeaders(origin)["Access-Control-Allow-Origin"]).toBeUndefined();
    }
    expect(corsHeaders(null)).toEqual({ Vary: "Origin" });
  });

  it("never uses a wildcard", async () => {
    const res = json(new Request("https://api.test/x", { headers: { origin: "https://x.y" } }), {});
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });
});

describe("health", () => {
  it("reports ok without a database and degraded when the probe fails", async () => {
    const ok = await checkHealth(async () => "unconfigured", new Date(0));
    expect(ok).toMatchObject({ status: "ok", service: "iranti-api", db: "unconfigured" });
    const bad = await checkHealth(async () => "error");
    expect(bad.status).toBe("degraded");
  });
});
