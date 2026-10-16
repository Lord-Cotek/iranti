import { describe, expect, it } from "vitest";
import {
  ITEM_TYPE_DEFS,
  ITEM_TYPES,
  itemTitle,
  parsePayload,
  payloadSchema,
  SECTION_TYPES,
  type ItemType,
  type Section,
} from "../src";

function sampleFor(type: ItemType): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of ITEM_TYPES[type].fields) {
    if (!f.required) continue;
    out[f.key] = f.kind === "select" ? f.options![0]!.value : "Ọ̀rọ̀ àkọ́kọ́";
  }
  return out;
}

describe("item type registry", () => {
  it("defines exactly the §5 types, each in its section", () => {
    const fromModel = Object.entries(SECTION_TYPES).flatMap(([section, types]) =>
      types.map((t) => `${section}/${t}`),
    );
    const fromRegistry = ITEM_TYPE_DEFS.map((d) => `${d.section}/${d.type}`);
    expect(fromRegistry.sort()).toEqual(fromModel.sort());
  });

  it("every type's title field exists and field keys are unique", () => {
    for (const def of ITEM_TYPE_DEFS) {
      const keys = def.fields.map((f) => f.key);
      expect(new Set(keys).size, def.type).toBe(keys.length);
      expect(keys, def.type).toContain(def.titleKey);
    }
  });

  it("generated schemas accept a minimal valid payload for every type", () => {
    for (const def of ITEM_TYPE_DEFS) {
      const r = payloadSchema(def.type).safeParse(sampleFor(def.type));
      expect(r.success, def.type).toBe(true);
    }
  });

  it("rejects unknown keys and missing required fields", () => {
    expect(payloadSchema("person").safeParse({ name: "Funmi", ssn: "x" }).success).toBe(false);
    expect(payloadSchema("person").safeParse({}).success).toBe(false);
  });

  it("drops empty optional values before validating", () => {
    const r = parsePayload("bank_account", {
      institution: "Emirates NBD",
      last4: "",
      jointHolders: [],
    });
    expect(r.success && r.data).toEqual({ institution: "Emirates NBD" });
  });

  it("titles items from their payload, using option labels", () => {
    expect(itemTitle("bank_account", { institution: "Zenith Bank" })).toBe("Zenith Bank");
    expect(itemTitle("will", { registry: "DIFC" })).toBe("DIFC Wills Service");
    expect(itemTitle("funeral", {})).toBe("Funeral");
  });

  it("keeps sections consistent", () => {
    const sections = new Set(ITEM_TYPE_DEFS.map((d) => d.section));
    expect([...sections].sort()).toEqual((Object.keys(SECTION_TYPES) as Section[]).sort());
  });
});
