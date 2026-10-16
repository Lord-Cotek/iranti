import { db } from "@/lib/db";
import { json, requireUser, requireVault, route } from "@/lib/http";
import { toItemRecord } from "@/lib/records";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** All items, as ciphertext. The device decrypts. */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  const vault = await requireVault(user.id);
  const items = await db().vaultItem.findMany({
    where: { vaultId: vault.id },
    orderBy: { createdAt: "asc" },
  });
  return json({ items: items.map(toItemRecord) });
});
