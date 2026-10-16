import { CryptoError } from "./errors";
import { utf8ToBytes } from "./encoding";
import { sodium } from "./sodium";

/** HKDF-SHA-256 via WebCrypto (libsodium-wrappers does not expose HKDF). */
export async function hkdfSha256(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: string,
  length = 32,
): Promise<Uint8Array> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) throw new CryptoError("INVALID_INPUT", "WebCrypto is not available");
  const base = await subtle.importKey("raw", ikm as BufferSource, "HKDF", false, ["deriveBits"]);
  const bits = await subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: salt as BufferSource,
      info: utf8ToBytes(info) as BufferSource,
    },
    base,
    length * 8,
  );
  return new Uint8Array(bits);
}

export interface Argon2Params {
  kdf: "argon2id13";
  opslimit: number;
  memlimit: number;
  /** base64, 16 bytes */
  salt: string;
}

/** CRYPTO.md §3.2.2. Target is libsodium MODERATE; never below the floor. */
export const ARGON2_TARGET = { opslimit: 3, memlimit: 256 * 1024 * 1024 } as const;
export const ARGON2_FLOOR = { opslimit: 3, memlimit: 64 * 1024 * 1024 } as const;

export function assertArgon2Floor(p: { opslimit: number; memlimit: number }): void {
  if (
    !Number.isSafeInteger(p.opslimit) ||
    !Number.isSafeInteger(p.memlimit) ||
    p.opslimit < ARGON2_FLOOR.opslimit ||
    p.memlimit < ARGON2_FLOOR.memlimit
  ) {
    throw new CryptoError("INVALID_INPUT", "Key-derivation parameters are below the minimum");
  }
}

/** Passphrases are NFKC-normalised so the same words typed on two keyboards match. */
export function normalisePassphrase(passphrase: string): Uint8Array {
  return utf8ToBytes(passphrase.normalize("NFKC"));
}

export function argon2id(
  passphrase: string,
  salt: Uint8Array,
  params: { opslimit: number; memlimit: number },
): Uint8Array {
  assertArgon2Floor(params);
  const s = sodium();
  if (salt.length !== s.crypto_pwhash_SALTBYTES) {
    throw new CryptoError("INVALID_INPUT", "Salt has the wrong length");
  }
  return s.crypto_pwhash(
    32,
    normalisePassphrase(passphrase),
    salt,
    params.opslimit,
    params.memlimit,
    s.crypto_pwhash_ALG_ARGON2ID13,
  );
}
