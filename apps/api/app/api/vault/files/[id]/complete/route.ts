import { Id } from "@iranti/core";
import { db } from "@/lib/db";
import { HttpError, json, requireProof, requireUser, requireVault, route } from "@/lib/http";
import { chunkKey, objectExists } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Mark an upload complete once every chunk is in storage. */
export const POST = route(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const id = Id.parse((await params).id);
  const user = await requireUser(request);
  await requireProof(request, user, null);
  const vault = await requireVault(user.id);
  const file = await db().vaultFile.findFirst({ where: { id, vaultId: vault.id } });
  if (!file) throw new HttpError(404, "not_found", "File not found.");
  const present = await Promise.all(
    Array.from({ length: file.chunks }, (_, i) => objectExists(chunkKey(file.r2Key, i))),
  );
  if (present.some((p) => !p))
    throw new HttpError(409, "missing_chunks", "Some of the file did not upload.");
  await db().vaultFile.update({
    where: { id },
    data: { status: "complete", completedAt: new Date() },
  });
  return json({ ok: true });
});
