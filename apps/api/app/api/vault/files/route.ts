import { FileCreate } from "@iranti/core";
import { db } from "@/lib/db";
import { HttpError, json, requireProof, requireUser, requireVault, route } from "@/lib/http";
import { chunkKey, isStorageConfigured, presignPut } from "@/lib/r2";
import { toFileRecord } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Per-file limit (configurable later per plan). Chunks are 1 MiB of plaintext. */
const MAX_FILE_BYTES = 200 * 1024 * 1024;

export const GET = route(async (request) => {
  const user = await requireUser(request);
  const vault = await requireVault(user.id);
  const files = await db().vaultFile.findMany({
    where: { vaultId: vault.id, status: "complete" },
    orderBy: { createdAt: "asc" },
  });
  return json({ files: files.map(toFileRecord) });
});

/** Register an encrypted file and get one presigned upload URL per chunk. */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await requireProof(request, user, FileCreate);
  if (!isStorageConfigured())
    throw new HttpError(503, "storage_unavailable", "File storage is not set up yet.");
  if (body.sizeBytes > MAX_FILE_BYTES)
    throw new HttpError(413, "too_large", "That file is too large.");
  const vault = await requireVault(user.id);
  if (body.itemId) {
    const item = await db().vaultItem.findFirst({
      where: { id: body.itemId, vaultId: vault.id },
      select: { id: true },
    });
    if (!item) throw new HttpError(404, "not_found", "Item not found.");
  }
  const r2Key = `v/${vault.id}/f/${body.id}`;
  const file = await db().vaultFile.create({
    data: {
      id: body.id,
      vaultId: vault.id,
      itemId: body.itemId,
      tier: body.tier,
      r2Key,
      wrappedIdk: body.wrappedIdk,
      chunkSize: body.chunkSize,
      chunks: body.chunks,
      sizeBytes: body.sizeBytes,
      metaEnc: body.metaEnc,
    },
  });
  const uploadUrls = await Promise.all(
    Array.from({ length: body.chunks }, (_, i) => presignPut(chunkKey(r2Key, i))),
  );
  return json({ file: toFileRecord(file), uploadUrls }, 201);
});
