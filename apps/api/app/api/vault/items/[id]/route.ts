import { Id, isTypeInSection, ItemUpsert } from "@iranti/core";
import { db } from "@/lib/db";
import { HttpError, json, requireProof, requireUser, requireVault, route } from "@/lib/http";
import { deletePrefix } from "@/lib/r2";
import { toItemRecord } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ id: string }> };

/**
 * Create or update an item. Optimistic concurrency: a new item has revision 1; an update
 * must carry exactly the stored revision + 1, so two devices cannot silently overwrite each
 * other, and the revision bound into the ciphertext's AD always matches the row.
 */
export const PUT = route(async (request, { params }: Ctx) => {
  const id = Id.parse((await params).id);
  const user = await requireUser(request);
  const body = await requireProof(request, user, ItemUpsert);
  if (!isTypeInSection(body.section, body.type)) {
    throw new HttpError(400, "invalid_type", "That item type does not belong in that section.");
  }
  const vault = await requireVault(user.id);

  const saved = await db().$transaction(async (tx) => {
    const existing = await tx.vaultItem.findUnique({ where: { id } });
    if (existing && existing.vaultId !== vault.id)
      throw new HttpError(404, "not_found", "Item not found.");
    const expected = existing ? existing.revision + 1 : 1;
    if (body.revision !== expected) {
      throw new HttpError(
        409,
        "revision_conflict",
        "This item changed on another device. Reload and try again.",
      );
    }
    const data = {
      section: body.section,
      type: body.type,
      tier: body.tier,
      revision: body.revision,
      wrappedIdk: body.wrappedIdk,
      ciphertext: body.ciphertext,
      nonce: body.nonce,
      schemaVer: body.schemaVer,
    };
    return existing
      ? tx.vaultItem.update({ where: { id }, data })
      : tx.vaultItem.create({ data: { ...data, id, vaultId: vault.id } });
  });
  return json(toItemRecord(saved), body.revision === 1 ? 201 : 200);
});

export const DELETE = route(async (request, { params }: Ctx) => {
  const id = Id.parse((await params).id);
  const user = await requireUser(request);
  await requireProof(request, user, null);
  const vault = await requireVault(user.id);
  const item = await db().vaultItem.findFirst({
    where: { id, vaultId: vault.id },
    select: { id: true },
  });
  if (!item) throw new HttpError(404, "not_found", "Item not found.");
  // Attachments go with their item: stored chunks first, then the rows.
  const files = await db().vaultFile.findMany({ where: { vaultId: vault.id, itemId: id } });
  for (const f of files) await deletePrefix(`${f.r2Key}/`);
  await db().$transaction([
    db().vaultFile.deleteMany({ where: { vaultId: vault.id, itemId: id } }),
    db().vaultItem.delete({ where: { id } }),
  ]);
  return json({ ok: true });
});
