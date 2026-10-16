import { beforeAll, describe, expect, it } from "vitest";
import {
  ARGON2_FLOOR,
  constantTimeEqual,
  CryptoError,
  generateAccountKey,
  newArgon2Params,
  newId,
  openAccountKey,
  passkeyKek,
  passphraseKek,
  ready,
  recoveryKek,
  sealAccountKey,
  generateRecoveryCode,
  parseRecoveryCode,
  type EnvelopeContext,
} from "../src";

beforeAll(async () => {
  await ready();
});

// Tests use the floor cost to stay fast; production targets ARGON2_TARGET.
const COST = ARGON2_FLOOR;

function ctx(
  kind: EnvelopeContext["kind"],
  overrides: Partial<EnvelopeContext> = {},
): EnvelopeContext {
  return { userId: "user_a", envelopeId: newId(), kind, accountKeyVersion: 1, ...overrides };
}

describe("envelopes unlock the Account Key independently", () => {
  it("passphrase, recovery code and passkey each open the same Account Key", async () => {
    const ak = generateAccountKey();

    const pCtx = ctx("PASSPHRASE");
    const params = newArgon2Params(COST);
    const pWrapped = sealAccountKey(
      passphraseKek("correct horse battery staple", params),
      ak,
      pCtx,
    );

    const rCtx = ctx("RECOVERY");
    const code = generateRecoveryCode();
    const rWrapped = sealAccountKey(await recoveryKek(code.bytes, rCtx.envelopeId), ak, rCtx);

    const kCtx = ctx("PASSKEY");
    const prf = new Uint8Array(32).fill(7);
    const kWrapped = sealAccountKey(await passkeyKek(prf, kCtx.userId), ak, kCtx);

    // Each opens alone, from only what the person has plus server-stored params.
    const viaPassphrase = openAccountKey(
      passphraseKek("correct horse battery staple", params),
      pWrapped,
      pCtx,
    );
    const viaRecovery = openAccountKey(
      await recoveryKek(parseRecoveryCode(code.formatted.toLowerCase()), rCtx.envelopeId),
      rWrapped,
      rCtx,
    );
    const viaPasskey = openAccountKey(await passkeyKek(prf, kCtx.userId), kWrapped, kCtx);

    for (const opened of [viaPassphrase, viaRecovery, viaPasskey]) {
      expect(constantTimeEqual(opened, ak)).toBe(true);
    }
  });

  it("rejects a wrong passphrase", () => {
    const ak = generateAccountKey();
    const c = ctx("PASSPHRASE");
    const params = newArgon2Params(COST);
    const wrapped = sealAccountKey(passphraseKek("right words", params), ak, c);
    expect(() => openAccountKey(passphraseKek("wrong words", params), wrapped, c)).toThrow(
      CryptoError,
    );
  });

  it("treats NFKC-equivalent passphrases as the same", () => {
    const ak = generateAccountKey();
    const c = ctx("PASSPHRASE");
    const params = newArgon2Params(COST);
    const composed = "Adébáyọ̀ ọmọ"; // precomposed where possible
    const decomposed = composed.normalize("NFD");
    const wrapped = sealAccountKey(passphraseKek(composed, params), ak, c);
    expect(
      constantTimeEqual(openAccountKey(passphraseKek(decomposed, params), wrapped, c), ak),
    ).toBe(true);
  });

  it("rejects a wrong recovery code and a wrong PRF output", async () => {
    const ak = generateAccountKey();
    const r = ctx("RECOVERY");
    const wrapped = sealAccountKey(
      await recoveryKek(generateRecoveryCode().bytes, r.envelopeId),
      ak,
      r,
    );
    await expect(async () =>
      openAccountKey(await recoveryKek(generateRecoveryCode().bytes, r.envelopeId), wrapped, r),
    ).rejects.toThrow(CryptoError);

    const k = ctx("PASSKEY");
    const kw = sealAccountKey(await passkeyKek(new Uint8Array(32).fill(1), "user_a"), ak, k);
    await expect(async () =>
      openAccountKey(await passkeyKek(new Uint8Array(32).fill(2), "user_a"), kw, k),
    ).rejects.toThrow(CryptoError);
  });

  it("binds each envelope to user, envelope id, kind and Account Key version", async () => {
    const ak = generateAccountKey();
    const c = ctx("RECOVERY");
    const code = generateRecoveryCode();
    const kek = await recoveryKek(code.bytes, c.envelopeId);
    const wrapped = sealAccountKey(kek, ak, c);
    for (const changed of [
      { ...c, userId: "user_b" },
      { ...c, envelopeId: newId() },
      { ...c, kind: "PASSPHRASE" as const },
      { ...c, accountKeyVersion: 2 },
    ]) {
      expect(() => openAccountKey(kek, wrapped, changed)).toThrow(CryptoError);
    }
  });

  it("binds a passkey KEK to the user", async () => {
    const prf = new Uint8Array(32).fill(9);
    const a = await passkeyKek(prf, "user_a");
    const b = await passkeyKek(prf, "user_b");
    expect(constantTimeEqual(a, b)).toBe(false);
  });

  it("refuses Argon2id parameters below the floor, at creation and at unlock", () => {
    expect(() => newArgon2Params({ opslimit: 2, memlimit: ARGON2_FLOOR.memlimit })).toThrow(
      CryptoError,
    );
    expect(() => newArgon2Params({ opslimit: 3, memlimit: 8 * 1024 * 1024 })).toThrow(CryptoError);
    const weak = { ...newArgon2Params(COST), memlimit: 1024 * 1024 };
    expect(() => passphraseKek("x", weak)).toThrow(CryptoError);
  });

  it("rejects a tampered envelope", async () => {
    const ak = generateAccountKey();
    const c = ctx("RECOVERY");
    const code = generateRecoveryCode();
    const kek = await recoveryKek(code.bytes, c.envelopeId);
    const wrapped = sealAccountKey(kek, ak, c);
    const bytes = Buffer.from(wrapped, "base64");
    bytes[bytes.length - 3]! ^= 0x40;
    expect(() => openAccountKey(kek, bytes.toString("base64"), c)).toThrow(CryptoError);
    expect(() => openAccountKey(kek, "not base64!", c)).toThrow(CryptoError);
  });
});
