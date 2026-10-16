import { generateKey } from "./aead";
import { fromBase64, toBase64, utf8ToBytes } from "./encoding";
import { CryptoError } from "./errors";
import type { Argon2Params } from "./kdf";
import { argon2id, assertArgon2Floor, ARGON2_TARGET, hkdfSha256 } from "./kdf";
import { sodium } from "./sodium";
import { unwrapKey, wrapSecret } from "./wrap";

/**
 * Envelopes wrap the Account Key (CRYPTO.md §3.2). Each derives a key-encryption key (KEK)
 * from something only the person has: a passphrase, a recovery code, or a passkey's PRF.
 */
export type EnvelopeKind = "PASSKEY" | "PASSPHRASE" | "RECOVERY" | "DEVICE";

export interface EnvelopeContext {
  userId: string;
  envelopeId: string;
  kind: EnvelopeKind;
  accountKeyVersion: number;
}

export type EnvelopeParams =
  Argon2Params | { kdf: "hkdf-sha256" } | { kdf: "webauthn-prf+hkdf-sha256"; credentialId: string };

function adFields(ctx: EnvelopeContext) {
  return [ctx.userId, ctx.envelopeId, ctx.kind, ctx.accountKeyVersion] as const;
}

/** A fresh Account Key. */
export function generateAccountKey(): Uint8Array {
  return generateKey();
}

export function sealAccountKey(
  kek: Uint8Array,
  accountKey: Uint8Array,
  ctx: EnvelopeContext,
): string {
  return wrapSecret(kek, accountKey, "account.envelope", adFields(ctx));
}

export function openAccountKey(
  kek: Uint8Array,
  wrappedKey: string,
  ctx: EnvelopeContext,
): Uint8Array {
  return unwrapKey(kek, wrappedKey, "account.envelope", adFields(ctx));
}

// ── Passphrase ───────────────────────────────────────────────────────────────

export function newArgon2Params(
  cost: { opslimit: number; memlimit: number } = ARGON2_TARGET,
): Argon2Params {
  assertArgon2Floor(cost);
  const salt = sodium().randombytes_buf(sodium().crypto_pwhash_SALTBYTES);
  return {
    kdf: "argon2id13",
    opslimit: cost.opslimit,
    memlimit: cost.memlimit,
    salt: toBase64(salt),
  };
}

export function passphraseKek(passphrase: string, params: Argon2Params): Uint8Array {
  if (params.kdf !== "argon2id13") throw new CryptoError("INVALID_INPUT", "Unsupported KDF");
  return argon2id(passphrase, fromBase64(params.salt), params);
}

// ── Recovery code ────────────────────────────────────────────────────────────

export function recoveryKek(codeBytes: Uint8Array, envelopeId: string): Promise<Uint8Array> {
  return hkdfSha256(codeBytes, utf8ToBytes(envelopeId), "iranti/v1/kek/recovery");
}

// ── Passkey (WebAuthn PRF) ───────────────────────────────────────────────────

/**
 * The PRF input ("salt") sent to the authenticator. A constant is safe: the authenticator
 * mixes it with a per-credential secret, and a constant lets one passkey ceremony both
 * sign in and unlock before the server has said which envelope applies.
 */
export function prfSalt(): Uint8Array {
  return sodium().crypto_generichash(32, utf8ToBytes("iranti/v1/webauthn-prf-salt"), null);
}

export function passkeyKek(prfOutput: Uint8Array, userId: string): Promise<Uint8Array> {
  if (prfOutput.length < 32) throw new CryptoError("INVALID_INPUT", "PRF output is too short");
  return hkdfSha256(prfOutput, prfSalt(), `iranti/v1/kek/passkey\u0000${userId}`);
}
