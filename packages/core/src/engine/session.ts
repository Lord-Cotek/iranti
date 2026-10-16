import {
  createIdentity,
  createVault,
  decryptItem,
  deriveProofKeyPair,
  encryptItem,
  generateAccountKey,
  generateRecoveryCode,
  newArgon2Params,
  newId,
  openAccountKey,
  openIdentity,
  openVault,
  parseRecoveryCode,
  passkeyKek,
  passphraseKek,
  proofPublicKeyToBase64,
  recoveryKek,
  sealAccountKey,
  signProof,
  wipe,
  ARGON2_TARGET,
  type KeyPair,
  type OpenVault,
  type ProofKeyPair,
} from "@iranti/crypto";
import type { EnvelopeInput, ItemRecord, ItemUpsert, MeResponse, SetupRequest } from "../api/dto";
import type { ItemType, ReleaseTier, Section } from "../vault/model";

/**
 * The client engine: everything a device does with keys, independent of any UI. The web
 * app and the API integration tests both use it, so tests exercise the real client path.
 * Call `ready()` from @iranti/crypto before using it.
 */
export interface UnlockedSession {
  userId: string;
  accountKeyVersion: number;
  accountKey: Uint8Array;
  vault: OpenVault;
  identity: KeyPair;
  proof: ProofKeyPair;
}

export interface SetupResult {
  request: SetupRequest;
  /** Display form; show once, print in the Emergency Kit, never send anywhere. */
  recoveryCode: string;
  session: UnlockedSession;
}

/** Make every key for a new account and vault, on this device. */
export async function buildSetup(args: {
  userId: string;
  passphrase: string;
  argon2Cost?: { opslimit: number; memlimit: number };
}): Promise<SetupResult> {
  const { userId } = args;
  const accountKeyVersion = 1;
  const account = { userId, accountKeyVersion };
  const accountKey = generateAccountKey();

  const passphraseEnvelopeId = newId();
  const params = newArgon2Params(args.argon2Cost ?? ARGON2_TARGET);
  const passKek = passphraseKek(args.passphrase, params);
  const passphraseEnvelope: EnvelopeInput = {
    id: passphraseEnvelopeId,
    kind: "PASSPHRASE",
    wrappedKey: sealAccountKey(passKek, accountKey, {
      ...account,
      envelopeId: passphraseEnvelopeId,
      kind: "PASSPHRASE",
    }),
    params,
    label: "Passphrase",
  };
  wipe(passKek);

  const recovery = generateRecoveryCode();
  const recoveryEnvelopeId = newId();
  const recKek = await recoveryKek(recovery.bytes, recoveryEnvelopeId);
  const recoveryEnvelope: EnvelopeInput = {
    id: recoveryEnvelopeId,
    kind: "RECOVERY",
    wrappedKey: sealAccountKey(recKek, accountKey, {
      ...account,
      envelopeId: recoveryEnvelopeId,
      kind: "RECOVERY",
    }),
    params: { kdf: "hkdf-sha256" },
    label: "Recovery code",
  };
  wipe(recKek);
  wipe(recovery.bytes);

  const identity = createIdentity(accountKey, account);
  const vaultId = newId();
  const { open, record } = createVault(accountKey, vaultId, account);
  const proof = await deriveProofKeyPair(accountKey, userId, accountKeyVersion);

  return {
    recoveryCode: recovery.formatted,
    request: {
      adultConfirmed: true,
      identity: { publicKey: identity.publicKey, wrappedPrivKey: identity.wrappedPrivKey },
      unlockPublicKey: proofPublicKeyToBase64(proof),
      envelopes: [passphraseEnvelope, recoveryEnvelope],
      vault: {
        id: record.vaultId,
        version: record.version,
        wrappedVmk: record.wrappedVmk,
        wrappedUrgentKey: record.wrappedUrgentKey,
        kcvVmk: record.kcvVmk,
        kcvUrgentKey: record.kcvUrgentKey,
        vaultPublicKey: record.vaultPublicKey,
        wrappedVaultPrivKey: record.wrappedVaultPrivKey,
      },
    },
    session: {
      userId,
      accountKeyVersion,
      accountKey,
      vault: open,
      identity: identity.keyPair,
      proof,
    },
  };
}

/** Open the vault and identity once the Account Key is unwrapped. */
export async function openSession(
  me: MeResponse,
  accountKey: Uint8Array,
): Promise<UnlockedSession> {
  if (!me.vault || !me.user.publicKey || !me.user.wrappedPrivKey)
    throw new Error("Account is not set up");
  const account = { userId: me.user.id, accountKeyVersion: me.user.accountKeyVersion };
  const vault = openVault(accountKey, { ...me.vault, vaultId: me.vault.id }, account);
  const identity = openIdentity(accountKey, me.user.publicKey, me.user.wrappedPrivKey, account);
  const proof = await deriveProofKeyPair(accountKey, me.user.id, me.user.accountKeyVersion);
  return { ...account, accountKey, vault, identity, proof };
}

function envelopeCtx(me: MeResponse, envelope: MeResponse["envelopes"][number]) {
  return {
    userId: me.user.id,
    envelopeId: envelope.id,
    kind: envelope.kind,
    accountKeyVersion: me.user.accountKeyVersion,
  } as const;
}

/** Try each passphrase envelope. Throws CryptoError if none opens. */
export async function unlockWithPassphrase(
  me: MeResponse,
  passphrase: string,
): Promise<UnlockedSession> {
  const candidates = me.envelopes.filter((e) => e.kind === "PASSPHRASE");
  let lastError: unknown = new Error("No passphrase is set");
  for (const env of candidates) {
    if (env.params.kdf !== "argon2id13") continue;
    try {
      const kek = passphraseKek(passphrase, env.params);
      const ak = openAccountKey(kek, env.wrappedKey, envelopeCtx(me, env));
      wipe(kek);
      return openSession(me, ak);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export async function unlockWithRecoveryCode(
  me: MeResponse,
  code: string,
): Promise<UnlockedSession> {
  const bytes = parseRecoveryCode(code);
  let lastError: unknown = new Error("No recovery code is set");
  for (const env of me.envelopes.filter((e) => e.kind === "RECOVERY")) {
    try {
      const kek = await recoveryKek(bytes, env.id);
      const ak = openAccountKey(kek, env.wrappedKey, envelopeCtx(me, env));
      wipe(kek);
      return openSession(me, ak);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

/** Unlock with a passkey's PRF output, choosing the envelope for that credential. */
export async function unlockWithPrf(
  me: MeResponse,
  prfOutput: Uint8Array,
  credentialId?: string,
): Promise<UnlockedSession> {
  const kek = await passkeyKek(prfOutput, me.user.id);
  const candidates = me.envelopes.filter(
    (e) =>
      e.kind === "PASSKEY" &&
      e.params.kdf === "webauthn-prf+hkdf-sha256" &&
      (!credentialId || e.params.credentialId === credentialId),
  );
  let lastError: unknown = new Error("No passkey unlock is set");
  for (const env of candidates) {
    try {
      const ak = openAccountKey(kek, env.wrappedKey, envelopeCtx(me, env));
      return openSession(me, ak);
    } catch (e) {
      lastError = e;
    }
  }
  throw lastError;
}

export async function makePasskeyEnvelope(
  session: UnlockedSession,
  prfOutput: Uint8Array,
  credentialId: string,
  label: string,
): Promise<EnvelopeInput> {
  const id = newId();
  const kek = await passkeyKek(prfOutput, session.userId);
  const wrappedKey = sealAccountKey(kek, session.accountKey, {
    userId: session.userId,
    envelopeId: id,
    kind: "PASSKEY",
    accountKeyVersion: session.accountKeyVersion,
  });
  wipe(kek);
  return {
    id,
    kind: "PASSKEY",
    wrappedKey,
    params: { kdf: "webauthn-prf+hkdf-sha256", credentialId },
    label,
  };
}

/** A new recovery code envelope (e.g. after printing a new Emergency Kit). */
export async function makeRecoveryEnvelope(session: UnlockedSession) {
  const recovery = generateRecoveryCode();
  const id = newId();
  const kek = await recoveryKek(recovery.bytes, id);
  const envelope: EnvelopeInput = {
    id,
    kind: "RECOVERY",
    wrappedKey: sealAccountKey(kek, session.accountKey, {
      userId: session.userId,
      envelopeId: id,
      kind: "RECOVERY",
      accountKeyVersion: session.accountKeyVersion,
    }),
    params: { kdf: "hkdf-sha256" },
    label: "Recovery code",
  };
  wipe(kek);
  return { envelope, recoveryCode: recovery.formatted };
}

/** The X-Iranti-Proof header for a request. */
export function proofHeader(
  session: UnlockedSession,
  method: string,
  path: string,
  body: string,
): string {
  return signProof(session.proof, { userId: session.userId, method, path, body });
}

/** Encrypt an item for upload. */
export function sealItem(
  session: UnlockedSession,
  item: {
    id: string;
    section: Section;
    type: ItemType;
    tier: ReleaseTier;
    revision: number;
    payload: unknown;
  },
): ItemUpsert {
  const enc = encryptItem(
    session.vault,
    { itemId: item.id, revision: item.revision, tier: item.tier },
    item.payload,
  );
  return {
    section: item.section,
    type: item.type,
    tier: item.tier,
    revision: item.revision,
    schemaVer: 1,
    ...enc,
  };
}

export function openItem(session: UnlockedSession, record: ItemRecord): unknown {
  return decryptItem(
    session.vault,
    { itemId: record.id, revision: record.revision, tier: record.tier },
    record,
  );
}

/** Forget every key in memory (lock). */
export function wipeSession(session: UnlockedSession): void {
  wipe(session.accountKey);
  wipe(session.vault.vmk);
  wipe(session.vault.uk);
  wipe(session.vault.vaultKeyPair.privateKey);
  wipe(session.identity.privateKey);
  wipe(session.proof.privateKey);
}
