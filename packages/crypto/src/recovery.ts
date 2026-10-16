import { CryptoError } from "./errors";
import { utf8ToBytes } from "./encoding";
import { sodium } from "./sodium";

/**
 * Recovery codes (CRYPTO.md §3.2.3): 160 random bits as 32 Crockford base32 characters in
 * 8 groups of 4, then a 4-character check group (the first 20 bits of a keyed BLAKE2b of the
 * code bytes) to catch typos before any key derivation is attempted.
 */
const CROCKFORD = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
export const RECOVERY_CODE_BYTES = 20;
const CHECK_KEY = utf8ToBytes("iranti/v1/recovery-check........"); // 32 bytes

function toCrockford(bytes: Uint8Array, chars: number): string {
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = ((buffer << 8) | byte) & 0xffffff;
    bits += 8;
    while (bits >= 5 && out.length < chars) {
      out += CROCKFORD[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (out.length < chars && bits > 0) out += CROCKFORD[(buffer << (5 - bits)) & 31];
  return out;
}

function fromCrockford(text: string): Uint8Array {
  const out: number[] = [];
  let buffer = 0;
  let bits = 0;
  for (const ch of text) {
    const v = CROCKFORD.indexOf(ch);
    if (v < 0)
      throw new CryptoError("INVALID_INPUT", "Recovery code contains an invalid character");
    buffer = ((buffer << 5) | v) & 0xffffff;
    bits += 5;
    if (bits >= 8) {
      out.push((buffer >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

function checkGroup(bytes: Uint8Array): string {
  const digest = sodium().crypto_generichash(32, bytes, CHECK_KEY);
  return toCrockford(digest.slice(0, 3), 4);
}

function group(text: string): string {
  return text.match(/.{1,4}/g)!.join("-");
}

export interface RecoveryCode {
  /** Display form, e.g. "7K2M-…-QX4P" (9 groups). Show once; never send to the server. */
  formatted: string;
  bytes: Uint8Array;
}

export function generateRecoveryCode(): RecoveryCode {
  const bytes = sodium().randombytes_buf(RECOVERY_CODE_BYTES);
  return { bytes, formatted: group(toCrockford(bytes, 32) + checkGroup(bytes)) };
}

/**
 * Parse what a person typed. Case, spaces and dashes are ignored; I and L read as 1, O as 0
 * (Crockford). Throws CryptoError("INVALID_INPUT") on a wrong length or failed check.
 */
export function parseRecoveryCode(input: string): Uint8Array {
  const cleaned = input
    .toUpperCase()
    .replace(/[\s-]/g, "")
    .replace(/[IL]/g, "1")
    .replace(/O/g, "0");
  if (cleaned.length !== 36) {
    throw new CryptoError("INVALID_INPUT", "Recovery code has the wrong length");
  }
  const bytes = fromCrockford(cleaned.slice(0, 32));
  if (bytes.length !== RECOVERY_CODE_BYTES || checkGroup(bytes) !== cleaned.slice(32)) {
    throw new CryptoError("INVALID_INPUT", "Recovery code check failed");
  }
  return bytes;
}
