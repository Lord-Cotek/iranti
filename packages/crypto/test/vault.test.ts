import { beforeAll, describe, expect, it } from "vitest";
import {
  constantTimeEqual,
  createIdentity,
  createVault,
  CryptoError,
  decryptItem,
  encryptItem,
  generateAccountKey,
  generateKey,
  newId,
  openIdentity,
  openVault,
  ready,
  type OpenVault,
} from "../src";

beforeAll(async () => {
  await ready();
});

const account = { userId: "user_a", accountKeyVersion: 1 };

describe("vault keys", () => {
  it("creates and reopens a vault with the Account Key", () => {
    const ak = generateAccountKey();
    const { open, record } = createVault(ak, newId(), account);
    const again = openVault(ak, record, account);
    expect(constantTimeEqual(again.vmk, open.vmk)).toBe(true);
    expect(constantTimeEqual(again.uk, open.uk)).toBe(true);
    expect(constantTimeEqual(again.vaultKeyPair.privateKey, open.vaultKeyPair.privateKey)).toBe(
      true,
    );
  });

  it("refuses another user's Account Key or context", () => {
    const { record } = createVault(generateAccountKey(), newId(), account);
    expect(() => openVault(generateAccountKey(), record, account)).toThrow(CryptoError);
  });

  it("refuses a swapped urgent key, KCV or vault keypair", () => {
    const ak = generateAccountKey();
    const a = createVault(ak, newId(), account).record;
    const b = createVault(ak, newId(), account).record;
    expect(() => openVault(ak, { ...a, wrappedUrgentKey: b.wrappedUrgentKey }, account)).toThrow(
      CryptoError,
    );
    expect(() => openVault(ak, { ...a, kcvVmk: b.kcvVmk }, account)).toThrow(CryptoError);
    expect(() => openVault(ak, { ...a, vaultPublicKey: b.vaultPublicKey }, account)).toThrow(
      CryptoError,
    );
  });

  it("keeps the identity key out of reach of the VMK (CRYPTO.md §3.3)", () => {
    const ak = generateAccountKey();
    const { open } = createVault(ak, newId(), account);
    const id = createIdentity(ak, account);
    expect(
      constantTimeEqual(
        openIdentity(ak, id.publicKey, id.wrappedPrivKey, account).privateKey,
        id.keyPair.privateKey,
      ),
    ).toBe(true);
    // An executor who rebuilt this vault's VMK still cannot open the identity key.
    expect(() => openIdentity(open.vmk, id.publicKey, id.wrappedPrivKey, account)).toThrow(
      CryptoError,
    );
  });
});

describe("tier separation (G3)", () => {
  it("the Urgent Key opens urgent items and nothing in the full tier", () => {
    const ak = generateAccountKey();
    const { open } = createVault(ak, newId(), account);
    const urgentRef = { itemId: newId(), revision: 1, tier: "URGENT" as const };
    const fullRef = { itemId: newId(), revision: 1, tier: "FULL" as const };
    const urgent = encryptItem(open, urgentRef, { who: "call Mama first" });
    const full = encryptItem(open, fullRef, { bank: "ending 4417" });

    // What an executor holds at URGENT_OPEN: the UK only.
    const urgentOnly: OpenVault = { ...open, vmk: generateKey() };
    expect(decryptItem(urgentOnly, urgentRef, urgent)).toEqual({ who: "call Mama first" });
    expect(() => decryptItem(urgentOnly, fullRef, full)).toThrow(CryptoError);
    // Presenting a full item as urgent does not help: the tier is bound into the wrap.
    expect(() => decryptItem(urgentOnly, { ...fullRef, tier: "URGENT" }, full)).toThrow(
      CryptoError,
    );
  });
});
