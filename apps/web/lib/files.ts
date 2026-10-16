"use client";

import type { FileRecord, ReleaseTier } from "@iranti/core";
import {
  decryptFile,
  decryptFileMeta,
  encryptFile,
  newId,
  unwrapFileKey,
  type FileMeta,
} from "@iranti/crypto";
import { api } from "./api";
import { getSession, reloadFiles } from "./vault";

/** Encrypt a file on this device and upload its chunks straight to storage. */
export async function uploadFile(
  file: File,
  itemId: string | null,
  tier: ReleaseTier,
): Promise<void> {
  const session = getSession();
  if (!session) throw new Error("Vault is locked");
  const id = newId();
  const data = new Uint8Array(await file.arrayBuffer());
  const enc = encryptFile(session.vault, id, tier, data, {
    name: file.name || "file",
    type: file.type || "application/octet-stream",
  });
  const { uploadUrls } = await api.createFile({
    id,
    itemId,
    tier,
    wrappedIdk: enc.wrappedIdk,
    metaEnc: enc.metaEnc,
    chunkSize: enc.chunkSize,
    chunks: enc.chunks.length,
    sizeBytes: enc.sizeBytes,
  });
  for (let i = 0; i < uploadUrls.length; i++) {
    const res = await fetch(uploadUrls[i]!, { method: "PUT", body: enc.chunks[i] as BodyInit });
    if (!res.ok) throw new Error("Upload failed. Check your connection and try again.");
  }
  await api.completeFile(id);
  await reloadFiles();
}

export function fileMeta(record: FileRecord): FileMeta | null {
  const session = getSession();
  if (!session) return null;
  try {
    const idk = unwrapFileKey(session.vault, record.id, record.tier, record.wrappedIdk);
    return decryptFileMeta(session.vault, record.id, idk, record.metaEnc);
  } catch {
    return null;
  }
}

/** Download, decrypt and return a Blob of the original file. */
export async function downloadFile(record: FileRecord): Promise<{ blob: Blob; meta: FileMeta }> {
  const session = getSession();
  if (!session) throw new Error("Vault is locked");
  const { downloadUrls } = await api.downloadFile(record.id);
  const chunks = await Promise.all(
    downloadUrls.map(async (u) => {
      const res = await fetch(u);
      if (!res.ok) throw new Error("Download failed. Check your connection and try again.");
      return new Uint8Array(await res.arrayBuffer());
    }),
  );
  const idk = unwrapFileKey(session.vault, record.id, record.tier, record.wrappedIdk);
  const meta = decryptFileMeta(session.vault, record.id, idk, record.metaEnc);
  const data = decryptFile(session.vault, record.id, idk, chunks);
  return { blob: new Blob([data as BlobPart], { type: meta.type }), meta };
}

export async function removeFile(id: string): Promise<void> {
  await api.deleteFile(id);
  await reloadFiles();
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}
