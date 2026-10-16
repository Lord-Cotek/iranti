import fc from "fast-check";
import { beforeAll, describe, expect, it } from "vitest";
import {
  CryptoError,
  bytesToUtf8,
  decrypt,
  encodeAd,
  encrypt,
  fromBase64,
  generateKey,
  itemPayloadAd,
  KEY_BYTES,
  NONCE_BYTES,
  ready,
  toBase64,
  utf8ToBytes,
} from "../src";

beforeAll(async () => {
  await ready();
});

function flipBit(bytes: Uint8Array, index: number): Uint8Array {
  const copy = bytes.slice();
  copy[index % copy.length]! ^= 0x01;
  return copy;
}

describe("AEAD round trip with associated data", () => {
  it("decrypts what it encrypted", () => {
    const key = generateKey();
    const ad = itemPayloadAd("vault_1", "item_1", 1);
    const plaintext = utf8ToBytes(JSON.stringify({ name: "Funmi Ọlá Bello", note: "ẹ́ ọ̀" }));
    const sealed = encrypt(key, plaintext, ad);

    expect(key).toHaveLength(KEY_BYTES);
    expect(sealed.nonce).toHaveLength(NONCE_BYTES);
    expect(bytesToUtf8(decrypt(key, sealed, ad))).toBe(bytesToUtf8(plaintext));
  });

  it("uses a fresh nonce every time", () => {
    const key = generateKey();
    const ad = itemPayloadAd("v", "i", 1);
    const a = encrypt(key, utf8ToBytes("same"), ad);
    const b = encrypt(key, utf8ToBytes("same"), ad);
    expect(toBase64(a.nonce)).not.toBe(toBase64(b.nonce));
    expect(toBase64(a.ciphertext)).not.toBe(toBase64(b.ciphertext));
  });

  it("round-trips arbitrary payloads and survives base64 storage", () => {
    fc.assert(
      fc.property(
        fc.uint8Array({ maxLength: 4096 }),
        fc.string(),
        fc.string(),
        fc.nat(),
        (plaintext, vaultId, itemId, revision) => {
          const key = generateKey();
          const ad = itemPayloadAd(vaultId, itemId, revision);
          const sealed = encrypt(key, plaintext, ad);
          const stored = { nonce: toBase64(sealed.nonce), ciphertext: toBase64(sealed.ciphertext) };
          const restored = {
            nonce: fromBase64(stored.nonce),
            ciphertext: fromBase64(stored.ciphertext),
          };
          expect(decrypt(key, restored, ad)).toEqual(plaintext);
        },
      ),
      { numRuns: 200 },
    );
  });
});

describe("AEAD negative tests: tampering must fail", () => {
  const setup = () => {
    const key = generateKey();
    const ad = itemPayloadAd("vault_1", "item_1", 3);
    const sealed = encrypt(key, utf8ToBytes("account ending 4417"), ad);
    return { key, ad, sealed };
  };

  it("rejects any single flipped bit in the ciphertext or tag", () => {
    const { key, ad, sealed } = setup();
    for (let i = 0; i < sealed.ciphertext.length; i++) {
      const tampered = { ...sealed, ciphertext: flipBit(sealed.ciphertext, i) };
      expect(() => decrypt(key, tampered, ad)).toThrow(CryptoError);
    }
  });

  it("rejects a flipped bit in the nonce", () => {
    const { key, ad, sealed } = setup();
    expect(() => decrypt(key, { ...sealed, nonce: flipBit(sealed.nonce, 5) }, ad)).toThrow(
      CryptoError,
    );
  });

  it("rejects truncated ciphertext", () => {
    const { key, ad, sealed } = setup();
    const truncated = { ...sealed, ciphertext: sealed.ciphertext.slice(0, -1) };
    expect(() => decrypt(key, truncated, ad)).toThrow(CryptoError);
    expect(() => decrypt(key, { ...sealed, ciphertext: new Uint8Array(4) }, ad)).toThrow(
      CryptoError,
    );
  });

  it("rejects the wrong key", () => {
    const { ad, sealed } = setup();
    expect(() => decrypt(generateKey(), sealed, ad)).toThrow(CryptoError);
  });

  it("rejects a swap to another item, vault or revision (AD binding)", () => {
    const { key, sealed } = setup();
    expect(() => decrypt(key, sealed, itemPayloadAd("vault_1", "item_2", 3))).toThrow(CryptoError);
    expect(() => decrypt(key, sealed, itemPayloadAd("vault_2", "item_1", 3))).toThrow(CryptoError);
    expect(() => decrypt(key, sealed, itemPayloadAd("vault_1", "item_1", 2))).toThrow(CryptoError);
  });

  it("rejects a swap between purposes with the same fields", () => {
    const { key, sealed } = setup();
    const otherPurpose = encodeAd("letter.payload", ["vault_1", "item_1", 3]);
    expect(() => decrypt(key, sealed, otherPurpose)).toThrow(CryptoError);
  });

  it("reports a fixed message that leaks nothing about the input", () => {
    const { ad, sealed } = setup();
    try {
      decrypt(generateKey(), sealed, ad);
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(CryptoError);
      expect((e as CryptoError).code).toBe("DECRYPT_FAILED");
      expect((e as Error).message).toBe("Decryption failed");
    }
  });

  it("refuses keys of the wrong length", () => {
    const ad = itemPayloadAd("v", "i", 1);
    expect(() => encrypt(new Uint8Array(16), utf8ToBytes("x"), ad)).toThrow(CryptoError);
  });
});
