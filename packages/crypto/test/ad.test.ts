import fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import { CryptoError, encodeAd, ready, toBase64, utf8ToBytes } from "../src";
import type { AdPurpose } from "../src";

beforeAll(async () => {
  await ready();
});

describe("encodeAd", () => {
  it("matches the committed test vector", () => {
    // Vector from docs/CRYPTO.md §4. Changing the encoding is a breaking format change.
    const ad = encodeAd("item.payload", ["v1", "i1", 7]);
    expect(toBase64(ad)).toBe(
      "aXJhbnRpOmFkOnYxAAxpdGVtLnBheWxvYWQBAAAAAnYxAQAAAAJpMQIAAAAIAAAAAAAAAAc=",
    );
  });

  it("is unambiguous where a delimiter join would collide", () => {
    // "a|b" + "c" vs "a" + "b|c" collide under "|"-joining; they must not here.
    const x = encodeAd("item.payload", ["a|b", "c"]);
    const y = encodeAd("item.payload", ["a", "b|c"]);
    expect(toBase64(x)).not.toBe(toBase64(y));
    // A string field and a bytes field with the same content differ by tag.
    const s = encodeAd("item.payload", ["ab"]);
    const b = encodeAd("item.payload", [utf8ToBytes("ab")]);
    expect(toBase64(s)).not.toBe(toBase64(b));
  });

  it("is injective over random field lists (property)", () => {
    const field = fc.oneof(fc.string(), fc.nat(), fc.uint8Array({ maxLength: 16 }));
    fc.assert(
      fc.property(fc.array(field, { maxLength: 4 }), fc.array(field, { maxLength: 4 }), (a, b) => {
        const same =
          JSON.stringify(a.map(String)) === JSON.stringify(b.map(String)) &&
          a.every((v, i) => typeof v === typeof b[i]);
        if (same) return;
        expect(toBase64(encodeAd("item.idk", a))).not.toBe(toBase64(encodeAd("item.idk", b)));
      }),
      { numRuns: 300 },
    );
  });

  it("rejects unknown purposes and invalid integers", () => {
    expect(() => encodeAd("nope" as AdPurpose, [])).toThrow(CryptoError);
    expect(() => encodeAd("item.payload", [-1])).toThrow(CryptoError);
    expect(() => encodeAd("item.payload", [1.5])).toThrow(CryptoError);
  });
});
