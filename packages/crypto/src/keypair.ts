import { fromBase64, toBase64 } from "./encoding";
import { CryptoError } from "./errors";
import { sodium } from "./sodium";
import { unwrapKey, wrapSecret } from "./wrap";

export interface KeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

/** X25519 keypair for sealed boxes (identity and vault keypairs, letter cards). */
export function generateKeyPair(): KeyPair {
  const kp = sodium().crypto_box_keypair();
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

export type KeyRole = "identity" | "vault";

/** AD fields for a wrapped private key: who owns it, which role, which version. */
function fields(ownerId: string, role: KeyRole, version: number) {
  return [ownerId, role, version] as const;
}

export function wrapPrivateKey(
  parentKey: Uint8Array,
  privateKey: Uint8Array,
  ownerId: string,
  role: KeyRole,
  version: number,
): string {
  return wrapSecret(parentKey, privateKey, "keypair.private", fields(ownerId, role, version));
}

/** Unwraps, then checks the private key matches the expected public key. */
export function unwrapPrivateKey(
  parentKey: Uint8Array,
  wrapped: string,
  publicKeyB64: string,
  ownerId: string,
  role: KeyRole,
  version: number,
): KeyPair {
  const privateKey = unwrapKey(
    parentKey,
    wrapped,
    "keypair.private",
    fields(ownerId, role, version),
  );
  const s = sodium();
  const publicKey = fromBase64(publicKeyB64);
  if (!s.memcmp(s.crypto_scalarmult_base(privateKey), publicKey)) {
    throw new CryptoError("DECRYPT_FAILED", "Key pair does not match");
  }
  return { publicKey, privateKey };
}

export function publicKeyToBase64(kp: KeyPair): string {
  return toBase64(kp.publicKey);
}
