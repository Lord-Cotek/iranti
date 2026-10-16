import type { AdField, AdPurpose } from "./ad";
import { encodeAd } from "./ad";
import { decrypt, encrypt, KEY_BYTES, NONCE_BYTES } from "./aead";
import { fromBase64, toBase64 } from "./encoding";
import { CryptoError } from "./errors";

/**
 * Wrap a 256-bit key (or any short secret) under a key-encryption key. The result is the
 * storage form of every `wrapped*` column: base64(nonce ‖ ciphertext) (CRYPTO.md §4.4).
 */
export function wrapSecret(
  kek: Uint8Array,
  secret: Uint8Array,
  purpose: AdPurpose,
  fields: readonly AdField[],
): string {
  const { nonce, ciphertext } = encrypt(kek, secret, encodeAd(purpose, fields));
  const joined = new Uint8Array(nonce.length + ciphertext.length);
  joined.set(nonce, 0);
  joined.set(ciphertext, nonce.length);
  return toBase64(joined);
}

export function unwrapSecret(
  kek: Uint8Array,
  wrapped: string,
  purpose: AdPurpose,
  fields: readonly AdField[],
): Uint8Array {
  let joined: Uint8Array;
  try {
    joined = fromBase64(wrapped);
  } catch {
    throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
  }
  return decrypt(
    kek,
    { nonce: joined.slice(0, NONCE_BYTES), ciphertext: joined.slice(NONCE_BYTES) },
    encodeAd(purpose, fields),
  );
}

/** As unwrapSecret, and the result must be a 256-bit key. */
export function unwrapKey(
  kek: Uint8Array,
  wrapped: string,
  purpose: AdPurpose,
  fields: readonly AdField[],
): Uint8Array {
  const key = unwrapSecret(kek, wrapped, purpose, fields);
  if (key.length !== KEY_BYTES) throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
  return key;
}
