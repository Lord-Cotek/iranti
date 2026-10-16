import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it } from "vitest";
import { middleware } from "../middleware";
import { resetEnvCache } from "@/lib/env";

beforeEach(() => resetEnvCache());

const req = (method: string, origin?: string) =>
  new NextRequest("http://localhost:3001/api/vault/items", {
    method,
    headers: origin ? { origin } : {},
  });

describe("API middleware", () => {
  it("answers preflight for the web origin", () => {
    const res = middleware(req("OPTIONS", "http://localhost:3000"));
    expect(res.status).toBe(204);
    expect(res.headers.get("access-control-allow-origin")).toBe("http://localhost:3000");
    expect(res.headers.get("access-control-allow-headers")).toContain("x-iranti-proof");
  });

  it("blocks state-changing requests from other origins", async () => {
    for (const method of ["POST", "PUT", "DELETE"]) {
      const res = middleware(req(method, "https://evil.example"));
      expect(res.status).toBe(403);
    }
  });

  it("lets reads through without granting CORS to other origins", () => {
    const res = middleware(req("GET", "https://evil.example"));
    expect(res.status).toBe(200);
    expect(res.headers.get("access-control-allow-origin")).toBeNull();
  });

  it("allows requests with no Origin (server-to-server, native)", () => {
    expect(middleware(req("POST")).status).toBe(200);
  });
});
