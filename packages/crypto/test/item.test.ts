import fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import {
  bucketSize,
  createVault,
  CryptoError,
  decryptItem,
  encryptItem,
  fromBase64,
  generateAccountKey,
  newId,
  padToBucket,
  ready,
  toBase64,
  unpadBucket,
  type OpenVault,
} from "../src";

let vault: OpenVault;
beforeAll(async () => {
  await ready();
  vault = createVault(generateAccountKey(), newId(), { userId: "u", accountKeyVersion: 1 }).open;
});

describe("vault items", () => {
  it("round-trips any JSON payload in either tier", () => {
    fc.assert(
      fc.property(fc.jsonValue(), fc.boolean(), (payload, urgent) => {
        const ref = {
          itemId: newId(),
          revision: 1,
          tier: urgent ? ("URGENT" as const) : ("FULL" as const),
        };
        const enc = encryptItem(vault, ref, payload);
        expect(decryptItem(vault, ref, enc)).toEqual(JSON.parse(JSON.stringify(payload)));
      }),
      { numRuns: 100 },
    );
  });

  it("rejects tampering with the ciphertext, nonce or wrapped key", () => {
    const ref = { itemId: newId(), revision: 2, tier: "FULL" as const };
    const enc = encryptItem(vault, ref, { title: "Land title, Ibadan" });
    const flip = (b64: string, i: number) => {
      const b = fromBase64(b64);
      b[i % b.length]! ^= 1;
      return toBase64(b);
    };
    expect(() => decryptItem(vault, ref, { ...enc, ciphertext: flip(enc.ciphertext, 10) })).toThrow(
      CryptoError,
    );
    expect(() => decryptItem(vault, ref, { ...enc, nonce: flip(enc.nonce, 3) })).toThrow(
      CryptoError,
    );
    expect(() => decryptItem(vault, ref, { ...enc, wrappedIdk: flip(enc.wrappedIdk, 30) })).toThrow(
      CryptoError,
    );
  });

  it("rejects an item moved to another id or replayed at another revision", () => {
    const ref = { itemId: newId(), revision: 3, tier: "URGENT" as const };
    const enc = encryptItem(vault, ref, { x: 1 });
    expect(() => decryptItem(vault, { ...ref, itemId: newId() }, enc)).toThrow(CryptoError);
    expect(() => decryptItem(vault, { ...ref, revision: 4 }, enc)).toThrow(CryptoError);
  });

  it("hides exact payload length inside buckets", () => {
    const a = encryptItem(vault, { itemId: newId(), revision: 1, tier: "FULL" }, { n: "Ade" });
    const b = encryptItem(
      vault,
      { itemId: newId(), revision: 1, tier: "FULL" },
      { n: "Adébáyọ̀ Olúwaseun" },
    );
    expect(fromBase64(a.ciphertext).length).toBe(fromBase64(b.ciphertext).length);
  });
});

describe("padding buckets", () => {
  it("uses 256-byte steps to 4 KiB, then powers of two", () => {
    expect(bucketSize(0)).toBe(256);
    expect(bucketSize(255)).toBe(256);
    expect(bucketSize(256)).toBe(512);
    expect(bucketSize(4095)).toBe(4096);
    expect(bucketSize(4096)).toBe(8192);
    expect(bucketSize(9000)).toBe(16384);
  });

  it("pads and unpads exactly", () => {
    fc.assert(
      fc.property(fc.uint8Array({ maxLength: 10000 }), (data) => {
        const padded = padToBucket(data);
        expect(padded.length).toBe(bucketSize(data.length));
        expect(unpadBucket(padded)).toEqual(data);
      }),
      { numRuns: 100 },
    );
  });
});
