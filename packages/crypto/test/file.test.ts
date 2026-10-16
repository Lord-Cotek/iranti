import { beforeAll, describe, expect, it } from "vitest";
import {
  createVault,
  CryptoError,
  decryptFile,
  decryptFileMeta,
  encryptFile,
  FILE_CHUNK_SIZE,
  generateAccountKey,
  newId,
  ready,
  unwrapFileKey,
  type OpenVault,
} from "../src";

let vault: OpenVault;
beforeAll(async () => {
  await ready();
  vault = createVault(generateAccountKey(), newId(), { userId: "u", accountKeyVersion: 1 }).open;
});

const same = (a: Uint8Array, b: Uint8Array) => Buffer.from(a).equals(Buffer.from(b));

function sample(size: number): Uint8Array {
  const out = new Uint8Array(size);
  for (let i = 0; i < size; i++) out[i] = (i * 31 + 7) & 0xff;
  return out;
}

describe("encrypted files", () => {
  it("round-trips a multi-chunk file and its name and type", () => {
    const fileId = newId();
    const data = sample(Math.floor(FILE_CHUNK_SIZE * 2.4));
    const enc = encryptFile(vault, fileId, "FULL", data, {
      name: "deed-ìbàdàn.pdf",
      type: "application/pdf",
    });
    expect(enc.chunks).toHaveLength(3);
    const idk = unwrapFileKey(vault, fileId, "FULL", enc.wrappedIdk);
    expect(same(decryptFile(vault, fileId, idk, enc.chunks), data)).toBe(true);
    expect(decryptFileMeta(vault, fileId, idk, enc.metaEnc)).toEqual({
      name: "deed-ìbàdàn.pdf",
      type: "application/pdf",
    });
  });

  it("handles an empty file", () => {
    const fileId = newId();
    const enc = encryptFile(vault, fileId, "URGENT", new Uint8Array(0), {
      name: "e",
      type: "text/plain",
    });
    const idk = unwrapFileKey(vault, fileId, "URGENT", enc.wrappedIdk);
    expect(decryptFile(vault, fileId, idk, enc.chunks)).toEqual(new Uint8Array(0));
  });

  it("rejects dropped, reordered, tampered or transplanted chunks", () => {
    const fileId = newId();
    const enc = encryptFile(vault, fileId, "FULL", sample(FILE_CHUNK_SIZE * 2 + 10), {
      name: "a",
      type: "b",
    });
    const idk = unwrapFileKey(vault, fileId, "FULL", enc.wrappedIdk);
    const [c0, c1, c2] = enc.chunks as [Uint8Array, Uint8Array, Uint8Array];
    expect(() => decryptFile(vault, fileId, idk, [c0, c1])).toThrow(CryptoError);
    expect(() => decryptFile(vault, fileId, idk, [c1, c0, c2])).toThrow(CryptoError);
    const bad = c2.slice();
    bad[40]! ^= 1;
    expect(() => decryptFile(vault, fileId, idk, [c0, c1, bad])).toThrow(CryptoError);
    expect(() => decryptFile(vault, newId(), idk, enc.chunks)).toThrow(CryptoError);
  });

  it("binds the file key to its tier", () => {
    const fileId = newId();
    const enc = encryptFile(vault, fileId, "FULL", sample(10), { name: "a", type: "b" });
    expect(() => unwrapFileKey(vault, fileId, "URGENT", enc.wrappedIdk)).toThrow(CryptoError);
  });
});
