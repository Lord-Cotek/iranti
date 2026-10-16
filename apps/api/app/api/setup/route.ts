import { SetupRequest } from "@iranti/core";
import { db } from "@/lib/db";
import { HttpError, json, readJson, requireUser, route } from "@/lib/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * First setup: the device has made the Account Key, identity keypair, vault keys and
 * envelopes. Store them in one transaction. Only possible once per account.
 */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await readJson(request, SetupRequest);

  await db().$transaction(async (tx) => {
    const current = await tx.user.findUniqueOrThrow({
      where: { id: user.id },
      select: { unlockPublicKey: true },
    });
    if (current.unlockPublicKey)
      throw new HttpError(409, "already_set_up", "This account is already set up.");
    await tx.user.update({
      where: { id: user.id },
      data: {
        adultConfirmedAt: new Date(),
        publicKey: body.identity.publicKey,
        wrappedPrivKey: body.identity.wrappedPrivKey,
        unlockPublicKey: body.unlockPublicKey,
      },
    });
    await tx.accountEnvelope.createMany({
      data: body.envelopes.map((e) => ({
        id: e.id,
        userId: user.id,
        kind: e.kind,
        wrappedKey: e.wrappedKey,
        params: e.params,
        label: e.label ?? null,
      })),
    });
    await tx.vault.create({
      data: {
        id: body.vault.id,
        ownerId: user.id,
        version: body.vault.version,
        wrappedVmk: body.vault.wrappedVmk,
        wrappedUrgentKey: body.vault.wrappedUrgentKey,
        kcvVmk: body.vault.kcvVmk,
        kcvUrgentKey: body.vault.kcvUrgentKey,
        vaultPublicKey: body.vault.vaultPublicKey,
        wrappedVaultPrivKey: body.vault.wrappedVaultPrivKey,
      },
    });
  });
  return json({ ok: true }, 201);
});
