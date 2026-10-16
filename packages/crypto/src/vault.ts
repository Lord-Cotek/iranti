import { decrypt, encrypt, generateKey } from "./aead";
import { encodeAd } from "./ad";
import { constantTimeEqual } from "./compare";
import { fromBase64, toBase64, utf8ToBytes } from "./encoding";
import { CryptoError } from "./errors";
import type { KeyPair } from "./keypair";
import { generateKeyPair, unwrapPrivateKey, wrapPrivateKey } from "./keypair";
import { unwrapKey, wrapSecret } from "./wrap";

/** The server-stored, wrapped form of a vault's keys (Prisma `Vault` columns). */
export interface VaultKeyRecord {
  vaultId: string;
  version: number;
  wrappedVmk: string;
  wrappedUrgentKey: string;
  kcvVmk: string;
  kcvUrgentKey: string;
  vaultPublicKey: string;
  wrappedVaultPrivKey: string;
}

export interface OpenVault {
  vaultId: string;
  version: number;
  vmk: Uint8Array;
  uk: Uint8Array;
  vaultKeyPair: KeyPair;
}

export type Tier = "URGENT" | "FULL";

const KCV_LABEL = utf8ToBytes("iranti-kcv");

/** Key-check value: proves a key is the right one without revealing anything (CRYPTO.md §5.4). */
export function makeKcv(key: Uint8Array, vaultId: string, version: number, tier: Tier): string {
  const { nonce, ciphertext } = encrypt(
    key,
    KCV_LABEL,
    encodeAd("vault.kcv", [vaultId, version, tier]),
  );
  const joined = new Uint8Array(nonce.length + ciphertext.length);
  joined.set(nonce);
  joined.set(ciphertext, nonce.length);
  return toBase64(joined);
}

export function checkKcv(
  key: Uint8Array,
  kcv: string,
  vaultId: string,
  version: number,
  tier: Tier,
): boolean {
  try {
    const joined = fromBase64(kcv);
    const label = decrypt(
      key,
      { nonce: joined.slice(0, 24), ciphertext: joined.slice(24) },
      encodeAd("vault.kcv", [vaultId, version, tier]),
    );
    return constantTimeEqual(label, KCV_LABEL);
  } catch {
    return false;
  }
}

interface AccountCtx {
  userId: string;
  accountKeyVersion: number;
}

/** Generate a new vault's VMK, UK and vault keypair on the owner's device, wrapped for storage. */
export function createVault(
  accountKey: Uint8Array,
  vaultId: string,
  account: AccountCtx,
): { open: OpenVault; record: VaultKeyRecord } {
  const version = 1;
  const vmk = generateKey();
  const uk = generateKey();
  const vaultKeyPair = generateKeyPair();
  const record: VaultKeyRecord = {
    vaultId,
    version,
    wrappedVmk: wrapSecret(accountKey, vmk, "vault.vmk", [
      account.userId,
      vaultId,
      version,
      account.accountKeyVersion,
    ]),
    wrappedUrgentKey: wrapSecret(vmk, uk, "vault.uk", [vaultId, version]),
    kcvVmk: makeKcv(vmk, vaultId, version, "FULL"),
    kcvUrgentKey: makeKcv(uk, vaultId, version, "URGENT"),
    vaultPublicKey: toBase64(vaultKeyPair.publicKey),
    wrappedVaultPrivKey: wrapPrivateKey(vmk, vaultKeyPair.privateKey, vaultId, "vault", version),
  };
  return { open: { vaultId, version, vmk, uk, vaultKeyPair }, record };
}

/** Unwrap a vault with the owner's Account Key and verify both key-check values. */
export function openVault(
  accountKey: Uint8Array,
  record: VaultKeyRecord,
  account: AccountCtx,
): OpenVault {
  const { vaultId, version } = record;
  const vmk = unwrapKey(accountKey, record.wrappedVmk, "vault.vmk", [
    account.userId,
    vaultId,
    version,
    account.accountKeyVersion,
  ]);
  const uk = unwrapKey(vmk, record.wrappedUrgentKey, "vault.uk", [vaultId, version]);
  if (
    !checkKcv(vmk, record.kcvVmk, vaultId, version, "FULL") ||
    !checkKcv(uk, record.kcvUrgentKey, vaultId, version, "URGENT")
  ) {
    throw new CryptoError("DECRYPT_FAILED", "Key check failed");
  }
  const vaultKeyPair = unwrapPrivateKey(
    vmk,
    record.wrappedVaultPrivKey,
    record.vaultPublicKey,
    vaultId,
    "vault",
    version,
  );
  return { vaultId, version, vmk, uk, vaultKeyPair };
}

/** The key that wraps IDKs of a given tier. */
export function tierKey(vault: OpenVault, tier: Tier): Uint8Array {
  return tier === "URGENT" ? vault.uk : vault.vmk;
}

// ── Identity keypair (per user, under the Account Key; never under a vault key) ──

export function createIdentity(accountKey: Uint8Array, account: AccountCtx) {
  const kp = generateKeyPair();
  return {
    keyPair: kp,
    publicKey: toBase64(kp.publicKey),
    wrappedPrivKey: wrapPrivateKey(
      accountKey,
      kp.privateKey,
      account.userId,
      "identity",
      account.accountKeyVersion,
    ),
  };
}

export function openIdentity(
  accountKey: Uint8Array,
  publicKey: string,
  wrappedPrivKey: string,
  account: AccountCtx,
): KeyPair {
  return unwrapPrivateKey(
    accountKey,
    wrappedPrivKey,
    publicKey,
    account.userId,
    "identity",
    account.accountKeyVersion,
  );
}
