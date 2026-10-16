import { beforeAll, describe, expect, it } from "vitest";
import { constantTimeEqual, generateKey, ready, wipe } from "../src";

beforeAll(async () => {
  await ready();
});

describe("constantTimeEqual and wipe", () => {
  it("compares equal and unequal secrets", () => {
    const a = generateKey();
    expect(constantTimeEqual(a, a.slice())).toBe(true);
    const b = a.slice();
    b[0]! ^= 1;
    expect(constantTimeEqual(a, b)).toBe(false);
    expect(constantTimeEqual(a, a.slice(0, 31))).toBe(false);
  });

  it("zeroes key material", () => {
    const k = generateKey();
    wipe(k);
    expect(k.every((x) => x === 0)).toBe(true);
  });
});
