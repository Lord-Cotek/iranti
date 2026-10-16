import { beforeAll, describe, expect, it } from "vitest";
import {
  deriveProofKeyPair,
  generateAccountKey,
  proofPublicKeyToBase64,
  PROOF_MAX_SKEW_MS,
  ready,
  signProof,
  verifyProof,
} from "../src";

beforeAll(async () => {
  await ready();
});

const req = { userId: "user_a", method: "PUT", path: "/api/vault/items/abc", body: '{"x":1}' };

describe("proof of unlock", () => {
  it("is deterministic from the Account Key and verifies", async () => {
    const ak = generateAccountKey();
    const a = await deriveProofKeyPair(ak, "user_a", 1);
    const b = await deriveProofKeyPair(ak, "user_a", 1);
    expect(proofPublicKeyToBase64(a)).toBe(proofPublicKeyToBase64(b));
    const header = signProof(a, req);
    expect(verifyProof(proofPublicKeyToBase64(a), header, req)).toBe(true);
  });

  it("differs per user and Account Key version", async () => {
    const ak = generateAccountKey();
    const a = proofPublicKeyToBase64(await deriveProofKeyPair(ak, "user_a", 1));
    expect(proofPublicKeyToBase64(await deriveProofKeyPair(ak, "user_b", 1))).not.toBe(a);
    expect(proofPublicKeyToBase64(await deriveProofKeyPair(ak, "user_a", 2))).not.toBe(a);
  });

  it("rejects a changed method, path, body, user, or another key", async () => {
    const kp = await deriveProofKeyPair(generateAccountKey(), "user_a", 1);
    const pk = proofPublicKeyToBase64(kp);
    const header = signProof(kp, req);
    expect(verifyProof(pk, header, { ...req, method: "DELETE" })).toBe(false);
    expect(verifyProof(pk, header, { ...req, path: "/api/vault/items/xyz" })).toBe(false);
    expect(verifyProof(pk, header, { ...req, body: '{"x":2}' })).toBe(false);
    expect(verifyProof(pk, header, { ...req, userId: "user_b" })).toBe(false);
    const other = await deriveProofKeyPair(generateAccountKey(), "user_a", 1);
    expect(verifyProof(proofPublicKeyToBase64(other), header, req)).toBe(false);
  });

  it("rejects stale, future, missing and malformed proofs", async () => {
    const kp = await deriveProofKeyPair(generateAccountKey(), "user_a", 1);
    const pk = proofPublicKeyToBase64(kp);
    const now = Date.now();
    expect(verifyProof(pk, signProof(kp, req, now - PROOF_MAX_SKEW_MS - 1000), req, now)).toBe(
      false,
    );
    expect(verifyProof(pk, signProof(kp, req, now + PROOF_MAX_SKEW_MS + 1000), req, now)).toBe(
      false,
    );
    expect(verifyProof(pk, null, req)).toBe(false);
    expect(verifyProof(pk, "garbage", req)).toBe(false);
    expect(verifyProof(pk, `${now}.AAAA`, req)).toBe(false);
  });
});
