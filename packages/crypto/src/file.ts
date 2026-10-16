import { decrypt, encrypt, generateKey, NONCE_BYTES } from "./aead";
import { encodeAd } from "./ad";
import { bytesToUtf8, fromBase64, toBase64, utf8ToBytes } from "./encoding";
import { CryptoError } from "./errors";
import { padToBucket, unpadBucket } from "./padding";
import type { OpenVault, Tier } from "./vault";
import { tierKey } from "./vault";
import { unwrapKey, wrapSecret } from "./wrap";

/** Attachments are split into fixed 1 MiB plaintext chunks (CRYPTO.md §4.3). */
export const FILE_CHUNK_SIZE = 1024 * 1024;

export interface FileMeta {
  name: string;
  type: string;
}

export interface EncryptedFile {
  wrappedIdk: string;
  metaEnc: string;
  chunkSize: number;
  /** Each chunk is nonce ‖ ciphertext, uploaded as its own object. */
  chunks: Uint8Array[];
  sizeBytes: number;
}

function joinNonce(nonce: Uint8Array, ciphertext: Uint8Array): Uint8Array {
  const out = new Uint8Array(nonce.length + ciphertext.length);
  out.set(nonce);
  out.set(ciphertext, nonce.length);
  return out;
}

/**
 * Encrypt a file under a fresh IDK. Chunk i is bound to (vault, file, i, count), so chunks
 * cannot be reordered, dropped or swapped between files. The final chunk is padded to a
 * length bucket so the exact size is not revealed.
 */
export function encryptFile(
  vault: OpenVault,
  fileId: string,
  tier: Tier,
  data: Uint8Array,
  meta: FileMeta,
): EncryptedFile {
  const idk = generateKey();
  const count = Math.max(1, Math.ceil(data.length / FILE_CHUNK_SIZE));
  const chunks: Uint8Array[] = [];
  for (let i = 0; i < count; i++) {
    let part = data.subarray(i * FILE_CHUNK_SIZE, (i + 1) * FILE_CHUNK_SIZE);
    if (i === count - 1) part = padToBucket(part);
    const sealed = encrypt(idk, part, encodeAd("file.chunk", [vault.vaultId, fileId, i, count]));
    chunks.push(joinNonce(sealed.nonce, sealed.ciphertext));
  }
  const metaSealed = encrypt(
    idk,
    padToBucket(utf8ToBytes(JSON.stringify(meta))),
    encodeAd("file.meta", [vault.vaultId, fileId]),
  );
  return {
    wrappedIdk: wrapSecret(tierKey(vault, tier), idk, "file.idk", [
      vault.vaultId,
      fileId,
      vault.version,
      tier,
    ]),
    metaEnc: toBase64(joinNonce(metaSealed.nonce, metaSealed.ciphertext)),
    chunkSize: FILE_CHUNK_SIZE,
    chunks,
    sizeBytes: chunks.reduce((n, c) => n + c.length, 0),
  };
}

export function unwrapFileKey(
  vault: OpenVault,
  fileId: string,
  tier: Tier,
  wrappedIdk: string,
): Uint8Array {
  return unwrapKey(tierKey(vault, tier), wrappedIdk, "file.idk", [
    vault.vaultId,
    fileId,
    vault.version,
    tier,
  ]);
}

export function decryptFileMeta(
  vault: OpenVault,
  fileId: string,
  idk: Uint8Array,
  metaEnc: string,
): FileMeta {
  const joined = fromBase64(metaEnc);
  const plain = decrypt(
    idk,
    { nonce: joined.slice(0, NONCE_BYTES), ciphertext: joined.slice(NONCE_BYTES) },
    encodeAd("file.meta", [vault.vaultId, fileId]),
  );
  try {
    const meta = JSON.parse(bytesToUtf8(unpadBucket(plain))) as FileMeta;
    if (typeof meta.name !== "string" || typeof meta.type !== "string") throw new Error();
    return meta;
  } catch {
    throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
  }
}

/** Decrypt all chunks in order. The count is authenticated, so a missing chunk fails. */
export function decryptFile(
  vault: OpenVault,
  fileId: string,
  idk: Uint8Array,
  chunks: Uint8Array[],
): Uint8Array {
  const count = chunks.length;
  if (count === 0) throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
  const parts: Uint8Array[] = [];
  chunks.forEach((chunk, i) => {
    let part = decrypt(
      idk,
      { nonce: chunk.slice(0, NONCE_BYTES), ciphertext: chunk.slice(NONCE_BYTES) },
      encodeAd("file.chunk", [vault.vaultId, fileId, i, count]),
    );
    if (i === count - 1) part = unpadBucket(part);
    else if (part.length !== FILE_CHUNK_SIZE)
      throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
    parts.push(part);
  });
  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}
