import { CryptoError } from "./errors";
import { sodium } from "./sodium";

/**
 * Length buckets (CRYPTO.md §4.3): 256-byte steps up to 4 KiB, then powers of two. The
 * padding itself is ISO/IEC 7816-4 (libsodium `pad`), so it is unambiguous to remove.
 */
export function bucketSize(length: number): number {
  const needed = length + 1;
  if (needed <= 4096) return Math.ceil(needed / 256) * 256;
  let size = 4096;
  while (size < needed) size *= 2;
  return size;
}

export function padToBucket(data: Uint8Array): Uint8Array {
  return sodium().pad(data, bucketSize(data.length));
}

export function unpadBucket(data: Uint8Array): Uint8Array {
  try {
    return sodium().unpad(data, data.length);
  } catch {
    throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
  }
}
