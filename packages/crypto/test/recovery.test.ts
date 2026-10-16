import { beforeAll, describe, expect, it } from "vitest";
import {
  constantTimeEqual,
  CryptoError,
  generateRecoveryCode,
  parseRecoveryCode,
  ready,
} from "../src";

beforeAll(async () => {
  await ready();
});

describe("recovery codes", () => {
  it("formats 160 bits as 8 groups of 4 plus a check group", () => {
    const code = generateRecoveryCode();
    expect(code.bytes).toHaveLength(20);
    expect(code.formatted).toMatch(/^([0-9A-HJKMNP-TV-Z]{4}-){8}[0-9A-HJKMNP-TV-Z]{4}$/);
  });

  it("parses back to the same bytes, forgiving case, spaces and look-alike letters", () => {
    for (let i = 0; i < 50; i++) {
      const code = generateRecoveryCode();
      const typed = code.formatted
        .toLowerCase()
        .replace(/-/g, " ")
        .replace(/1/g, "l")
        .replace(/0/g, "o");
      expect(constantTimeEqual(parseRecoveryCode(typed), code.bytes)).toBe(true);
    }
  });

  it("catches a single typo with the check group", () => {
    const code = generateRecoveryCode();
    const chars = code.formatted.split("");
    const i = chars.findIndex((c) => c !== "-");
    chars[i] = chars[i] === "A" ? "B" : "A";
    expect(() => parseRecoveryCode(chars.join(""))).toThrow(CryptoError);
  });

  it("rejects wrong lengths and invalid characters", () => {
    expect(() => parseRecoveryCode("ABCD")).toThrow(CryptoError);
    const code = generateRecoveryCode();
    expect(() => parseRecoveryCode(code.formatted.replace(/^./, "U"))).toThrow(CryptoError);
  });
});
