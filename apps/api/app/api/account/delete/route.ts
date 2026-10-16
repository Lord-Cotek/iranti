import { DeleteAccountRequest } from "@iranti/core";
import { db } from "@/lib/db";
import { json, requireProof, requireUser, route } from "@/lib/http";
import { deletePrefix } from "@/lib/r2";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Delete the account (App Store requirement, BUILD.md §14). Requires an unlocked device
 * and a typed confirmation. Encrypted files go first, then the user row; everything else
 * (envelopes, vault, items, sessions, passkeys) cascades. Backups age out per the privacy
 * policy.
 */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  await requireProof(request, user, DeleteAccountRequest);
  const vault = await db().vault.findUnique({ where: { ownerId: user.id }, select: { id: true } });
  if (vault) await deletePrefix(`v/${vault.id}/`);
  await db().user.delete({ where: { id: user.id } });
  return json({ ok: true });
});
