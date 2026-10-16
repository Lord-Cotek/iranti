import type { MeResponse } from "@iranti/core";
import { db } from "@/lib/db";
import { json, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Everything a device needs to unlock: all of it wrapped, none of it readable here. */
export const GET = route(async (request) => {
  const user = await requireUser(request);
  const row = await db().user.findUniqueOrThrow({
    where: { id: user.id },
    include: {
      envelopes: { where: { revokedAt: null }, orderBy: { createdAt: "asc" } },
      vault: true,
    },
  });
  const body: MeResponse = {
    user: {
      id: row.id,
      email: row.email,
      accountKeyVersion: row.accountKeyVersion,
      publicKey: row.publicKey,
      wrappedPrivKey: row.wrappedPrivKey,
    },
    envelopes: row.envelopes.map((e) => ({
      id: e.id,
      kind: e.kind,
      wrappedKey: e.wrappedKey,
      params: e.params as MeResponse["envelopes"][number]["params"],
      label: e.label,
      createdAt: e.createdAt.toISOString(),
    })),
    vault: row.vault
      ? {
          id: row.vault.id,
          version: row.vault.version,
          wrappedVmk: row.vault.wrappedVmk,
          wrappedUrgentKey: row.vault.wrappedUrgentKey,
          kcvVmk: row.vault.kcvVmk,
          kcvUrgentKey: row.vault.kcvUrgentKey,
          vaultPublicKey: row.vault.vaultPublicKey,
          wrappedVaultPrivKey: row.vault.wrappedVaultPrivKey,
        }
      : null,
  };
  return json(body);
});
