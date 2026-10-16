import { CryptoError } from "./errors";
import { utf8ToBytes } from "./encoding";

/**
 * Associated data (AD) binds every ciphertext to where it belongs, so the server cannot
 * swap one item's ciphertext for another's (BUILD.md §8.6, docs/CRYPTO.md §4).
 *
 * Encoding (unambiguous, no delimiter collisions):
 *
 *   "iranti:ad:v1" 0x00
 *   u8 len(purpose) || purpose (ASCII)
 *   for each field:
 *     tag (0x01 utf-8 string | 0x02 unsigned integer | 0x03 raw bytes)
 *     u32 big-endian length || field bytes   (integers: 8-byte big-endian)
 */
export const AD_PURPOSES = [
  "item.payload", // vault item payload under its IDK
  "item.idk", // IDK wrapped under the UK (urgent) or VMK (full)
  "file.chunk", // one chunk of an encrypted attachment
  "letter.payload", // letter body under its IDK
  "letter.idk", // letter IDK wrapped under the VMK for the owner
  "vault.uk", // Urgent Key wrapped under the VMK
  "vault.vmk", // VMK wrapped under the Account Key
  "vault.kcv", // key-check value used to verify a reconstructed key
  "account.envelope", // Account Key wrapped under an envelope KEK
  "keypair.private", // an X25519 private key wrapped under its parent key
] as const;

export type AdPurpose = (typeof AD_PURPOSES)[number];
export type AdField = string | number | Uint8Array;

const DOMAIN = utf8ToBytes("iranti:ad:v1\u0000");
const TAG_STRING = 0x01;
const TAG_UINT = 0x02;
const TAG_BYTES = 0x03;

export function encodeAd(purpose: AdPurpose, fields: readonly AdField[]): Uint8Array {
  if (!(AD_PURPOSES as readonly string[]).includes(purpose)) {
    throw new CryptoError("INVALID_INPUT", "Unknown associated-data purpose");
  }
  const purposeBytes = utf8ToBytes(purpose);
  const parts: Uint8Array[] = [DOMAIN, Uint8Array.of(purposeBytes.length), purposeBytes];

  for (const field of fields) {
    let tag: number;
    let body: Uint8Array;
    if (typeof field === "string") {
      tag = TAG_STRING;
      body = utf8ToBytes(field);
    } else if (typeof field === "number") {
      if (!Number.isSafeInteger(field) || field < 0) {
        throw new CryptoError("INVALID_INPUT", "Associated-data integers must be non-negative");
      }
      tag = TAG_UINT;
      body = new Uint8Array(8);
      new DataView(body.buffer).setBigUint64(0, BigInt(field), false);
    } else {
      tag = TAG_BYTES;
      body = field;
    }
    const header = new Uint8Array(5);
    header[0] = tag;
    new DataView(header.buffer).setUint32(1, body.length, false);
    parts.push(header, body);
  }

  const total = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

/** AD for a vault item payload: binds ciphertext to vault, item and item revision. */
export function itemPayloadAd(vaultId: string, itemId: string, revision: number): Uint8Array {
  return encodeAd("item.payload", [vaultId, itemId, revision]);
}
