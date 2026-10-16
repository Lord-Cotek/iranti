import { sodium } from "./sodium";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/**
 * A 128-bit random identifier, lowercase RFC 4648 base32 without padding (26 chars).
 * Clients create ids for vaults, items, files and envelopes so that associated data can
 * bind ciphertext to its id before anything is uploaded.
 */
export function newId(): string {
  const bytes = sodium().randombytes_buf(16);
  let out = "";
  let buffer = 0;
  let bits = 0;
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(buffer >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(buffer << (5 - bits)) & 31];
  return out;
}

export const ID_PATTERN = /^[a-z2-7]{26}$/;

/** Random bytes from the platform CSPRNG (e.g. a WebAuthn challenge for a local ceremony). */
export function randomBytes(length: number): Uint8Array {
  return sodium().randombytes_buf(length);
}
