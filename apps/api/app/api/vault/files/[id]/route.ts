import { Id } from "@iranti/core";
import { db } from "@/lib/db";
import { HttpError, json, requireProof, requireUser, requireVault, route } from "@/lib/http";
import { chunkKey, deletePrefix, presignGet } from "@/lib/r2";
import { toFileRecord } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

async function ownFile(userId: string, id: string) {
  const vault = await requireVault(userId);
  const file = await db().vaultFile.findFirst({ where: { id, vaultId: vault.id } });
  if (!file) throw new HttpError(404, "not_found", "File not found.");
  return file;
}

/** Presigned download URLs for each encrypted chunk. */
export const GET = route(async (request, { params }: Ctx) => {
  const id = Id.parse((await params).id);
  const user = await requireUser(request);
  const file = await ownFile(user.id, id);
  if (file.status !== "complete")
    throw new HttpError(409, "incomplete", "This file has not finished uploading.");
  const downloadUrls = await Promise.all(
    Array.from({ length: file.chunks }, (_, i) => presignGet(chunkKey(file.r2Key, i))),
  );
  return json({ file: toFileRecord(file), downloadUrls });
});

export const DELETE = route(async (request, { params }: Ctx) => {
  const id = Id.parse((await params).id);
  const user = await requireUser(request);
  await requireProof(request, user, null);
  const file = await ownFile(user.id, id);
  await deletePrefix(`${file.r2Key}/`);
  await db().vaultFile.delete({ where: { id: file.id } });
  return json({ ok: true });
});
