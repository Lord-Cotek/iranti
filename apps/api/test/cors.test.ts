import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { corsHeaders } from "@/lib/cors";
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

  it("never uses a wildcard", () => {
    expect(Object.values(corsHeaders("https://iranti.cotek.app"))).not.toContain("*");
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

describe("sign-up allowlist", () => {
  it("is open outside production when unset, closed in production", async () => {
    const { signupAllowed } = await import("@/lib/env");
    delete process.env.SIGNUP_ALLOWLIST;
    process.env.VERCEL_ENV = "preview";
    resetEnvCache();
    expect(signupAllowed("a@b.test")).toBe(true);
    process.env.VERCEL_ENV = "production";
    resetEnvCache();
    expect(signupAllowed("a@b.test")).toBe(false);
    process.env.SIGNUP_ALLOWLIST = "temi@example.com, @cotek.app";
    resetEnvCache();
    expect(signupAllowed("Temi@Example.com")).toBe(true);
    expect(signupAllowed("x@cotek.app")).toBe(true);
    expect(signupAllowed("x@cotek.app.evil.test")).toBe(false);
    expect(signupAllowed("someone@else.test")).toBe(false);
    delete process.env.SIGNUP_ALLOWLIST;
    delete process.env.VERCEL_ENV;
    resetEnvCache();
  });
});
