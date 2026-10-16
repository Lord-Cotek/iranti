import { CryptoError } from "./errors";
import { sodium } from "./sodium";

/** XChaCha20-Poly1305 (IETF): 256-bit keys, 192-bit random nonces, 128-bit tags. */
export const KEY_BYTES = 32;
export const NONCE_BYTES = 24;
export const TAG_BYTES = 16;

export interface Sealed {
  nonce: Uint8Array;
  ciphertext: Uint8Array;
}

/** A fresh random 256-bit symmetric key (VMK, UK, IDK, Account Key). */
export function generateKey(): Uint8Array {
  return sodium().crypto_aead_xchacha20poly1305_ietf_keygen();
}

function assertKey(key: Uint8Array): void {
  if (!(key instanceof Uint8Array) || key.length !== KEY_BYTES) {
    throw new CryptoError("INVALID_KEY", "Key must be 32 bytes");
  }
}

/**
 * Encrypt with a random nonce. `ad` must come from `encodeAd` so the ciphertext is bound
 * to its context; there is deliberately no overload without AD.
 */
export function encrypt(key: Uint8Array, plaintext: Uint8Array, ad: Uint8Array): Sealed {
  assertKey(key);
  const s = sodium();
  const nonce = s.randombytes_buf(NONCE_BYTES);
  const ciphertext = s.crypto_aead_xchacha20poly1305_ietf_encrypt(plaintext, ad, null, nonce, key);
  return { nonce, ciphertext };
}

/** Decrypt and authenticate. Throws CryptoError("DECRYPT_FAILED") on any mismatch. */
export function decrypt(key: Uint8Array, sealed: Sealed, ad: Uint8Array): Uint8Array {
  assertKey(key);
  if (sealed.nonce.length !== NONCE_BYTES || sealed.ciphertext.length < TAG_BYTES) {
    throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
  }
  try {
    return sodium().crypto_aead_xchacha20poly1305_ietf_decrypt(
      null,
      sealed.ciphertext,
      ad,
      sealed.nonce,
      key,
    );
  } catch {
    // libsodium throws a generic error; replace it so nothing about the input leaks.
    throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
  }
}
