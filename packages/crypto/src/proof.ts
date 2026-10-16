import { fromBase64, toBase64, utf8ToBytes } from "./encoding";
import { CryptoError } from "./errors";
import { hkdfSha256 } from "./kdf";
import { sodium } from "./sodium";

/**
 * Proof of unlock (CRYPTO.md §3.4). A session cookie proves who you are; it must not be
 * enough to overwrite or delete a vault. Every change is signed with an Ed25519 key derived
 * from the Account Key, which only an unlocked device holds. The server stores the public
 * half, which reveals nothing about the Account Key.
 */
export interface ProofKeyPair {
  publicKey: Uint8Array;
  privateKey: Uint8Array;
}

export async function deriveProofKeyPair(
  accountKey: Uint8Array,
  userId: string,
  accountKeyVersion: number,
): Promise<ProofKeyPair> {
  const seed = await hkdfSha256(
    accountKey,
    utf8ToBytes(userId),
    `iranti/v1/unlock-proof\u0000${accountKeyVersion}`,
  );
  const kp = sodium().crypto_sign_seed_keypair(seed);
  sodium().memzero(seed);
  return { publicKey: kp.publicKey, privateKey: kp.privateKey };
}

export interface ProofRequest {
  userId: string;
  method: string;
  /** Path without origin or query, e.g. "/api/vault/items/abc". */
  path: string;
  /** Exact request body text ("" when none). */
  body: string;
  /** Unix milliseconds. */
  timestamp: number;
}

function message(r: ProofRequest): Uint8Array {
  const s = sodium();
  const bodyHash = s.to_hex(s.crypto_hash_sha256(utf8ToBytes(r.body)));
  return utf8ToBytes(
    [
      "iranti:proof:v1",
      r.userId,
      r.method.toUpperCase(),
      r.path,
      String(r.timestamp),
      bodyHash,
    ].join("\n"),
  );
}

/** Header value: "<timestamp>.<base64 signature>". */
export function signProof(
  kp: ProofKeyPair,
  r: Omit<ProofRequest, "timestamp">,
  now = Date.now(),
): string {
  const sig = sodium().crypto_sign_detached(message({ ...r, timestamp: now }), kp.privateKey);
  return `${now}.${toBase64(sig)}`;
}

export const PROOF_MAX_SKEW_MS = 2 * 60 * 1000;

/** Server side. Returns false on any problem; never throws for bad input. */
export function verifyProof(
  publicKeyB64: string,
  header: string | null,
  r: Omit<ProofRequest, "timestamp">,
  now = Date.now(),
): boolean {
  if (!header) return false;
  const dot = header.indexOf(".");
  if (dot <= 0) return false;
  const timestamp = Number(header.slice(0, dot));
  if (!Number.isSafeInteger(timestamp) || Math.abs(now - timestamp) > PROOF_MAX_SKEW_MS)
    return false;
  try {
    const sig = fromBase64(header.slice(dot + 1));
    const pk = fromBase64(publicKeyB64);
    if (sig.length !== 64 || pk.length !== 32) return false;
    return sodium().crypto_sign_verify_detached(sig, message({ ...r, timestamp }), pk);
  } catch {
    return false;
  }
}

export function proofPublicKeyToBase64(kp: ProofKeyPair): string {
  if (kp.publicKey.length !== 32) throw new CryptoError("INVALID_KEY", "Bad proof key");
  return toBase64(kp.publicKey);
}
