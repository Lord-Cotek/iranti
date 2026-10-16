import type { FileRecord, ItemRecord } from "@iranti/core";

export function toItemRecord(i: {
  id: string;
  section: string;
  type: string;
  tier: "URGENT" | "FULL";
  revision: number;
  wrappedIdk: string;
  ciphertext: string;
  nonce: string;
  schemaVer: number;
  updatedAt: Date;
}): ItemRecord {
  return {
    id: i.id,
    section: i.section as ItemRecord["section"],
    type: i.type,
    tier: i.tier,
    revision: i.revision,
    wrappedIdk: i.wrappedIdk,
    ciphertext: i.ciphertext,
    nonce: i.nonce,
    schemaVer: i.schemaVer,
    updatedAt: i.updatedAt.toISOString(),
  };
}

export function toFileRecord(f: {
  id: string;
  itemId: string | null;
  tier: "URGENT" | "FULL";
  wrappedIdk: string;
  metaEnc: string;
  chunkSize: number;
  chunks: number;
  sizeBytes: number;
  status: string;
  createdAt: Date;
}): FileRecord {
  return {
    id: f.id,
    itemId: f.itemId,
    tier: f.tier,
    wrappedIdk: f.wrappedIdk,
    metaEnc: f.metaEnc,
    chunkSize: f.chunkSize,
    chunks: f.chunks,
    sizeBytes: f.sizeBytes,
    status: f.status === "complete" ? "complete" : "pending",
    createdAt: f.createdAt.toISOString(),
  };
}
