import { decrypt, encrypt, generateKey } from "./aead";
import { encodeAd } from "./ad";
import { bytesToUtf8, fromBase64, toBase64, utf8ToBytes } from "./encoding";
import { CryptoError } from "./errors";
import { padToBucket, unpadBucket } from "./padding";
import type { OpenVault, Tier } from "./vault";
import { tierKey } from "./vault";
import { unwrapKey, wrapSecret } from "./wrap";

/** The encrypted columns of a vault item (Prisma `VaultItem`). */
export interface EncryptedItem {
  wrappedIdk: string;
  ciphertext: string;
  nonce: string;
}

export interface ItemRef {
  itemId: string;
  revision: number;
  tier: Tier;
}

function idkFields(vault: OpenVault, itemId: string, tier: Tier) {
  return [vault.vaultId, itemId, vault.version, tier] as const;
}

/**
 * Encrypt a vault item payload (any JSON value) on the device. A fresh IDK per revision;
 * the payload is padded to a length bucket, then sealed with AD binding vault, item and
 * revision. The IDK is wrapped under the UK or VMK according to tier.
 */
export function encryptItem(vault: OpenVault, ref: ItemRef, payload: unknown): EncryptedItem {
  const idk = generateKey();
  const plaintext = padToBucket(utf8ToBytes(JSON.stringify(payload)));
  const sealed = encrypt(
    idk,
    plaintext,
    encodeAd("item.payload", [vault.vaultId, ref.itemId, ref.revision]),
  );
  return {
    wrappedIdk: wrapSecret(
      tierKey(vault, ref.tier),
      idk,
      "item.idk",
      idkFields(vault, ref.itemId, ref.tier),
    ),
    ciphertext: toBase64(sealed.ciphertext),
    nonce: toBase64(sealed.nonce),
  };
}

export function decryptItem(vault: OpenVault, ref: ItemRef, item: EncryptedItem): unknown {
  const idk = unwrapKey(
    tierKey(vault, ref.tier),
    item.wrappedIdk,
    "item.idk",
    idkFields(vault, ref.itemId, ref.tier),
  );
  let plaintext: Uint8Array;
  try {
    plaintext = decrypt(
      idk,
      { nonce: fromBase64(item.nonce), ciphertext: fromBase64(item.ciphertext) },
      encodeAd("item.payload", [vault.vaultId, ref.itemId, ref.revision]),
    );
  } catch (e) {
    if (e instanceof CryptoError) throw e;
    throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
  }
  try {
    return JSON.parse(bytesToUtf8(unpadBucket(plaintext)));
  } catch {
    throw new CryptoError("DECRYPT_FAILED", "Decryption failed");
  }
}
