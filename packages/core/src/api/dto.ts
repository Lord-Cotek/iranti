import { z } from "zod";
import { ReleaseTier, Section } from "../vault/model";

/**
 * Request and response shapes shared by apps/api and apps/web. Every encrypted field is
 * opaque base64 to the server; the limits here only bound storage.
 */
export const Id = z.string().regex(/^[a-z2-7]{26}$/, "invalid id");
const b64 = (max: number) =>
  z
    .string()
    .min(1)
    .max(max)
    .regex(/^[A-Za-z0-9+/]+={0,2}$/, "invalid base64");

export const EnvelopeKind = z.enum(["PASSKEY", "PASSPHRASE", "RECOVERY", "DEVICE"]);

export const EnvelopeParams = z.discriminatedUnion("kdf", [
  z.object({
    kdf: z.literal("argon2id13"),
    opslimit: z.number().int().min(3).max(20),
    memlimit: z
      .number()
      .int()
      .min(64 * 1024 * 1024)
      .max(1024 * 1024 * 1024),
    salt: b64(64),
  }),
  z.object({ kdf: z.literal("hkdf-sha256") }),
  z.object({
    kdf: z.literal("webauthn-prf+hkdf-sha256"),
    credentialId: z.string().min(1).max(1024),
  }),
]);
export type EnvelopeParams = z.infer<typeof EnvelopeParams>;

export const EnvelopeInput = z.object({
  id: Id,
  kind: EnvelopeKind,
  wrappedKey: b64(512),
  params: EnvelopeParams,
  label: z.string().trim().max(80).optional(),
});
export type EnvelopeInput = z.infer<typeof EnvelopeInput>;

export const Envelope = EnvelopeInput.extend({
  createdAt: z.string(),
  label: z.string().nullable(),
});
export type Envelope = z.infer<typeof Envelope>;

export const VaultKeys = z.object({
  id: Id,
  version: z.number().int().positive(),
  wrappedVmk: b64(512),
  wrappedUrgentKey: b64(512),
  kcvVmk: b64(512),
  kcvUrgentKey: b64(512),
  vaultPublicKey: b64(64),
  wrappedVaultPrivKey: b64(512),
});
export type VaultKeys = z.infer<typeof VaultKeys>;

/** POST /api/setup: everything the device made at first setup, stored atomically. */
export const SetupRequest = z.object({
  adultConfirmed: z.literal(true),
  identity: z.object({ publicKey: b64(64), wrappedPrivKey: b64(512) }),
  unlockPublicKey: b64(64),
  envelopes: z
    .array(EnvelopeInput)
    .min(2)
    .max(4)
    .refine(
      (e) => e.some((x) => x.kind === "PASSPHRASE") && e.some((x) => x.kind === "RECOVERY"),
      "A passphrase and a recovery code envelope are both required",
    ),
  vault: VaultKeys,
});
export type SetupRequest = z.infer<typeof SetupRequest>;

export const MeResponse = z.object({
  user: z.object({
    id: z.string(),
    email: z.string(),
    accountKeyVersion: z.number().int(),
    publicKey: z.string().nullable(),
    wrappedPrivKey: z.string().nullable(),
  }),
  envelopes: z.array(Envelope),
  vault: VaultKeys.nullable(),
});
export type MeResponse = z.infer<typeof MeResponse>;

export const ItemRecord = z.object({
  id: Id,
  section: Section,
  type: z.string().min(1).max(40),
  tier: ReleaseTier,
  revision: z.number().int().positive(),
  wrappedIdk: b64(512),
  ciphertext: b64(400_000),
  nonce: b64(64),
  schemaVer: z.number().int().positive(),
  updatedAt: z.string(),
});
export type ItemRecord = z.infer<typeof ItemRecord>;

/** PUT /api/vault/items/:id. `revision` must be exactly one more than the stored one. */
export const ItemUpsert = ItemRecord.omit({ id: true, updatedAt: true });
export type ItemUpsert = z.infer<typeof ItemUpsert>;

export const ItemsResponse = z.object({ items: z.array(ItemRecord) });

export const FileRecord = z.object({
  id: Id,
  itemId: Id.nullable(),
  tier: ReleaseTier,
  wrappedIdk: b64(512),
  metaEnc: b64(4096),
  chunkSize: z.number().int().positive(),
  chunks: z.number().int().positive().max(10_000),
  sizeBytes: z.number().int().nonnegative(),
  status: z.enum(["pending", "complete"]),
  createdAt: z.string(),
});
export type FileRecord = z.infer<typeof FileRecord>;

export const FileCreate = FileRecord.omit({ status: true, createdAt: true });
export type FileCreate = z.infer<typeof FileCreate>;

export const FileUploadResponse = z.object({
  file: FileRecord,
  uploadUrls: z.array(z.string().url()),
});
export const FileDownloadResponse = z.object({
  file: FileRecord,
  downloadUrls: z.array(z.string().url()),
});
export const FilesResponse = z.object({ files: z.array(FileRecord) });

export const DeleteAccountRequest = z.object({ confirm: z.literal("delete my account") });
