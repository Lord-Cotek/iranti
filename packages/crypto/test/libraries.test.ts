// Smoke tests that the audited libraries chosen in BUILD.md §6.3 are installed and load.
// Real wrappers and their tests arrive with the phases that use them (Shamir: Phase 3,
// tlock: Phase 4).
import { combine, split } from "shamir-secret-sharing";
import { describe, expect, it } from "vitest";
import { constantTimeEqual, generateKey, ready } from "../src";

describe("library choices", () => {
  it("shamir-secret-sharing splits and combines a 256-bit key", async () => {
    await ready();
    const secret = generateKey();
    const shares = await split(secret, 3, 2);
    expect(shares).toHaveLength(3);
    const rebuilt = await combine([shares[0]!, shares[2]!]);
    expect(constantTimeEqual(rebuilt, secret)).toBe(true);
  });

  it("tlock-js loads", async () => {
    const tlock = await import("tlock-js");
    expect(typeof tlock.timelockEncrypt).toBe("function");
    expect(typeof tlock.timelockDecrypt).toBe("function");
  });
});
