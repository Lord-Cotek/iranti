import { describe, expect, it } from "vitest";
import {
  BankAccountPayload,
  createApiClient,
  defaultTier,
  isTypeInSection,
  PersonPayload,
  SECTIONS,
} from "../src";

describe("vault model", () => {
  it("covers every §5 section", () => {
    expect(SECTIONS).toEqual([
      "people",
      "assets",
      "obligations",
      "insurance",
      "documents",
      "wishes",
      "digital",
      "sealed_note",
    ]);
  });

  it("checks types belong to their section", () => {
    expect(isTypeInSection("assets", "bank_account")).toBe(true);
    expect(isTypeInSection("wishes", "bank_account")).toBe(false);
  });

  it("puts first-days items in the urgent tier by default", () => {
    expect(defaultTier("person")).toBe("URGENT");
    expect(defaultTier("body_and_rites")).toBe("URGENT");
    expect(defaultTier("bank_account")).toBe("FULL");
    expect(defaultTier("sealed_note")).toBe("FULL");
  });
});

describe("payload schemas", () => {
  it("accepts Yoruba names with stacked marks", () => {
    const p = PersonPayload.parse({ name: "Ọláolúwa Adébáyọ̀", roles: ["executor"] });
    expect(p.name).toBe("Ọláolúwa Adébáyọ̀");
    expect(p.phones).toEqual([]);
  });

  it("refuses full account numbers in last4", () => {
    expect(() => BankAccountPayload.parse({ institution: "Bank", last4: "123456789" })).toThrow();
    expect(BankAccountPayload.parse({ institution: "Bank", last4: "4417" }).last4).toBe("4417");
  });
});

describe("api client", () => {
  it("parses the health response and sends a bearer token when given one", async () => {
    let seenAuth: string | null = null;
    const client = createApiClient({
      baseUrl: "https://api.example.test/",
      getToken: () => "t0k",
      fetch: async (input, init) => {
        expect(String(input)).toBe("https://api.example.test/api/health");
        seenAuth = new Headers(init?.headers).get("authorization");
        return new Response(
          JSON.stringify({
            status: "ok",
            service: "iranti-api",
            version: "dev",
            time: new Date(0).toISOString(),
            db: "unconfigured",
          }),
          { status: 200 },
        );
      },
    });
    const health = await client.health();
    expect(health.status).toBe("ok");
    expect(seenAuth).toBe("Bearer t0k");
  });
});
