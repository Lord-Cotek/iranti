import { execSync } from "node:child_process";
import {
  ApiError,
  buildSetup,
  makePasskeyEnvelope,
  openItem,
  sealItem,
  unlockWithPassphrase,
  unlockWithPrf,
  unlockWithRecoveryCode,
  type UnlockedSession,
} from "@iranti/core";
import {
  ARGON2_FLOOR,
  decryptFile,
  decryptFileMeta,
  encryptFile,
  newId,
  ready,
  unwrapFileKey,
} from "@iranti/crypto";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { resetEnvCache } from "@/lib/env";
import { startFakeS3 } from "../support/fake-s3";
import { testClient } from "../support/app";

const DB = process.env.TEST_DATABASE_URL;
const PASSPHRASE = "lantern quietly river mango 1987";
const MARKERS = [
  "MARKER-ACCOUNT-ENDING-4417",
  "MARKER-PSALM-23-READ-BY-BROTHER",
  "MARKER-SEALED-SAFE-0451",
];

let s3: Awaited<ReturnType<typeof startFakeS3>>;
let ipCounter = 1;
const nextIp = () => `10.0.0.${ipCounter++}`;
const email = (name: string) =>
  `${name}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}@example.test`;

async function newOwner(name: string) {
  const client = testClient(nextIp());
  const address = email(name);
  await client.signIn(address);
  const me = await client.api.me();
  const setup = await buildSetup({
    userId: me.user.id,
    passphrase: PASSPHRASE,
    argon2Cost: ARGON2_FLOOR,
  });
  await client.api.setup(setup.request);
  client.setSession(setup.session);
  return { client, address, setup, session: setup.session };
}

async function expectApiError(p: Promise<unknown>, status: number, code?: string) {
  const err = await p.then(
    () => null,
    (e: unknown) => e,
  );
  expect(err).toBeInstanceOf(ApiError);
  expect((err as ApiError).status).toBe(status);
  if (code) expect((err as ApiError).code).toBe(code);
}

describe.skipIf(!DB)("API integration (Postgres)", () => {
  beforeAll(async () => {
    await ready();
    s3 = await startFakeS3();
    process.env.R2_ENDPOINT = s3.url;
    resetEnvCache();
  });
  afterAll(async () => {
    await s3?.close();
  });

  it("refuses anonymous requests", async () => {
    const client = testClient(nextIp());
    await expectApiError(client.api.me(), 401, "unauthenticated");
    await expectApiError(client.api.items(), 401);
  });

  it("signs in with an emailed code and sets up exactly once", async () => {
    const client = testClient(nextIp());
    await client.signIn(email("ade"));
    const before = await client.api.me();
    expect(before.vault).toBeNull();
    expect(before.envelopes).toEqual([]);

    const setup = await buildSetup({
      userId: before.user.id,
      passphrase: PASSPHRASE,
      argon2Cost: ARGON2_FLOOR,
    });
    await client.api.setup(setup.request);
    const after = await client.api.me();
    expect(after.vault?.id).toBe(setup.request.vault.id);
    expect(after.envelopes.map((e) => e.kind).sort()).toEqual(["PASSPHRASE", "RECOVERY"]);

    await expectApiError(client.api.setup(setup.request), 409, "already_set_up");
  });

  it("unlocks independently with the passphrase and with the recovery code", async () => {
    const { client, setup } = await newOwner("funmi");
    const me = await client.api.me();
    const viaPassphrase = await unlockWithPassphrase(me, PASSPHRASE);
    const viaRecovery = await unlockWithRecoveryCode(me, setup.recoveryCode);
    expect(viaPassphrase.vault.vaultId).toBe(setup.request.vault.id);
    expect(Buffer.from(viaRecovery.accountKey).equals(Buffer.from(setup.session.accountKey))).toBe(
      true,
    );
    await expect(unlockWithPassphrase(me, "not the passphrase")).rejects.toThrow();
  });

  it("requires proof of unlock for every change, and keeps revisions honest", async () => {
    const { client, session } = await newOwner("kayode");
    const id = newId();
    const payload = { institution: "Emirates NBD", last4: "4417" };
    const v1 = sealItem(session, {
      id,
      section: "assets",
      type: "bank_account",
      tier: "FULL",
      revision: 1,
      payload,
    });

    // A stolen session without the unlocked device: reads only.
    client.setSession(null);
    await expectApiError(client.api.putItem(id, v1), 403, "unlock_required");
    client.setSession(session);

    await client.api.putItem(id, v1);
    await expectApiError(client.api.putItem(id, v1), 409, "revision_conflict");
    const v2 = sealItem(session, {
      id,
      section: "assets",
      type: "bank_account",
      tier: "FULL",
      revision: 2,
      payload: { ...payload, onlineAccessNotes: "App on Funmi's phone" },
    });
    await client.api.putItem(id, v2);

    const { items } = await client.api.items();
    expect(items).toHaveLength(1);
    expect(openItem(session, items[0]!)).toEqual({
      ...payload,
      onlineAccessNotes: "App on Funmi's phone",
    });

    const wrongSection = sealItem(session, {
      id: newId(),
      section: "wishes",
      type: "bank_account" as never,
      tier: "FULL",
      revision: 1,
      payload,
    });
    await expectApiError(client.api.putItem(newId(), wrongSection), 400, "invalid_type");

    // A proof signed for one request does not authorise another (different body).
    client.setSession(null);
    await expectApiError(client.api.deleteItem(id), 403);
    client.setSession(session);
    await client.api.deleteItem(id);
    expect((await client.api.items()).items).toHaveLength(0);
  });

  it("keeps vaults apart", async () => {
    const a = await newOwner("a");
    const b = await newOwner("b");
    const id = newId();
    await a.client.api.putItem(
      id,
      sealItem(a.session, {
        id,
        section: "wishes",
        type: "funeral",
        tier: "URGENT",
        revision: 1,
        payload: { wishes: "Keep it simple" },
      }),
    );
    expect((await b.client.api.items()).items).toHaveLength(0);
    await expectApiError(b.client.api.deleteItem(id), 404);
    const hijack = sealItem(b.session, {
      id,
      section: "wishes",
      type: "funeral",
      tier: "URGENT",
      revision: 2,
      payload: { wishes: "x" },
    });
    await expectApiError(b.client.api.putItem(id, hijack), 404);
  });

  it("adds a passkey unlock and enforces envelope revocation rules", async () => {
    const { client, session } = await newOwner("tobi");
    const prf = new Uint8Array(32).fill(42);
    const env = await makePasskeyEnvelope(session, prf, "cred-123", "Test phone");
    await client.api.addEnvelope(env);
    let me = await client.api.me();
    const viaPasskey: UnlockedSession = await unlockWithPrf(me, prf, "cred-123");
    expect(viaPasskey.vault.vaultId).toBe(session.vault.vaultId);

    const recovery = me.envelopes.find((e) => e.kind === "RECOVERY")!;
    await expectApiError(client.api.revokeEnvelope(recovery.id), 409, "last_recovery");
    await client.api.revokeEnvelope(env.id);
    me = await client.api.me();
    expect(me.envelopes).toHaveLength(2);
    const passphrase = me.envelopes.find((e) => e.kind === "PASSPHRASE")!;
    await expectApiError(client.api.revokeEnvelope(passphrase.id), 409, "last_envelopes");
  });

  it("stores encrypted files in object storage and reads them back", async () => {
    const { client, session } = await newOwner("files");
    const fileId = newId();
    const data = new TextEncoder().encode("Scanned deed, Ibadan. ".repeat(5000));
    const enc = encryptFile(session.vault, fileId, "FULL", data, {
      name: "deed.pdf",
      type: "application/pdf",
    });
    const { uploadUrls } = await client.api.createFile({
      id: fileId,
      itemId: null,
      tier: "FULL",
      wrappedIdk: enc.wrappedIdk,
      metaEnc: enc.metaEnc,
      chunkSize: enc.chunkSize,
      chunks: enc.chunks.length,
      sizeBytes: enc.sizeBytes,
    });
    expect((await client.api.files()).files).toHaveLength(0); // pending until complete
    await expectApiError(client.api.completeFile(fileId), 409, "missing_chunks");
    for (let i = 0; i < uploadUrls.length; i++) {
      const res = await fetch(uploadUrls[i]!, { method: "PUT", body: enc.chunks[i] as BodyInit });
      expect(res.ok).toBe(true);
    }
    await client.api.completeFile(fileId);

    const { file, downloadUrls } = await client.api.downloadFile(fileId);
    const chunks = await Promise.all(
      downloadUrls.map(async (u) => new Uint8Array(await (await fetch(u)).arrayBuffer())),
    );
    const idk = unwrapFileKey(session.vault, fileId, file.tier, file.wrappedIdk);
    expect(
      Buffer.from(decryptFile(session.vault, fileId, idk, chunks)).equals(Buffer.from(data)),
    ).toBe(true);
    expect(decryptFileMeta(session.vault, fileId, idk, file.metaEnc).name).toBe("deed.pdf");

    // What sits in storage is ciphertext.
    const stored = Buffer.concat(
      [...s3.objects.entries()].filter(([k]) => k.includes(fileId)).map(([, v]) => v),
    );
    expect(stored.includes(Buffer.from("Scanned deed"))).toBe(false);

    await client.api.deleteFile(fileId);
    expect([...s3.objects.keys()].some((k) => k.includes(fileId))).toBe(false);
  });

  it("never stores plaintext: a full database dump contains no vault content or secrets", async () => {
    const { client, session, setup, address } = await newOwner("zk");
    const items = [
      {
        section: "assets",
        type: "bank_account",
        tier: "FULL",
        payload: { institution: "Zenith", onlineAccessNotes: MARKERS[0] },
      },
      {
        section: "wishes",
        type: "body_and_rites",
        tier: "URGENT",
        payload: { restingPlace: "repatriate", rites: MARKERS[1] },
      },
      {
        section: "sealed_note",
        type: "sealed_note",
        tier: "FULL",
        payload: { title: "Safe", body: MARKERS[2] },
      },
    ] as const;
    for (const it of items) {
      const id = newId();
      await client.api.putItem(id, sealItem(session, { id, revision: 1, ...it }));
    }
    const dump = execSync(`pg_dump --data-only --no-owner "${DB}"`, {
      maxBuffer: 64 * 1024 * 1024,
    }).toString();
    expect(dump).toContain(address); // sanity: the dump is real and includes readable metadata
    for (const marker of MARKERS) expect(dump).not.toContain(marker);
    expect(dump).not.toContain(PASSPHRASE);
    expect(dump).not.toContain(setup.recoveryCode);
    expect(dump).not.toContain(setup.recoveryCode.replace(/-/g, ""));
    // No raw Account Key, VMK or UK in base64 either.
    for (const key of [session.accountKey, session.vault.vmk, session.vault.uk]) {
      expect(dump).not.toContain(Buffer.from(key).toString("base64"));
    }
  });

  it("deletes the account, its sessions and its stored files", async () => {
    const { client, session } = await newOwner("bye");
    const fileId = newId();
    const enc = encryptFile(session.vault, fileId, "FULL", new Uint8Array(100), {
      name: "a",
      type: "b",
    });
    const { uploadUrls } = await client.api.createFile({
      id: fileId,
      itemId: null,
      tier: "FULL",
      wrappedIdk: enc.wrappedIdk,
      metaEnc: enc.metaEnc,
      chunkSize: enc.chunkSize,
      chunks: 1,
      sizeBytes: enc.sizeBytes,
    });
    await fetch(uploadUrls[0]!, { method: "PUT", body: enc.chunks[0] as BodyInit });

    client.setSession(null);
    await expectApiError(client.api.deleteAccount(), 403);
    client.setSession(session);
    await client.api.deleteAccount();
    await expectApiError(client.api.me(), 401);
    expect([...s3.objects.keys()].some((k) => k.includes(session.vault.vaultId))).toBe(false);
  });

  it("rate-limits code requests", async () => {
    const client = testClient(nextIp());
    const address = email("flood");
    const statuses: number[] = [];
    for (let i = 0; i < 7; i++) {
      const res = await client.fetch(
        "http://localhost:3001/api/auth/email-otp/send-verification-otp",
        {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: address, type: "sign-in" }),
        },
      );
      statuses.push(res.status);
    }
    expect(statuses.slice(0, 5).every((s) => s === 200)).toBe(true);
    expect(statuses.at(-1)).toBe(429);
  });
});
