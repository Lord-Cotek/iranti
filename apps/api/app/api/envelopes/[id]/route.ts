import { db } from "@/lib/db";
import { HttpError, json, requireProof, requireUser, route } from "@/lib/http";
import { securityNoticeMail, sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Revoke an unlock method. Revocation is soft (revokedAt) so support can never be asked to
 * resurrect a key it cannot read anyway, and the last recovery code can never be revoked.
 */
export const DELETE = route(async (request, { params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const user = await requireUser(request);
  await requireProof(request, user, null);
  const active = await db().accountEnvelope.findMany({
    where: { userId: user.id, revokedAt: null },
  });
  const target = active.find((e) => e.id === id);
  if (!target) throw new HttpError(404, "not_found", "That unlock method was not found.");
  if (active.length <= 2) {
    throw new HttpError(409, "last_envelopes", "Keep at least two ways to unlock your vault.");
  }
  if (target.kind === "RECOVERY" && active.filter((e) => e.kind === "RECOVERY").length === 1) {
    throw new HttpError(409, "last_recovery", "Make a new recovery code before removing this one.");
  }
  await db().accountEnvelope.update({ where: { id }, data: { revokedAt: new Date() } });
  await sendMail(securityNoticeMail(user.email, "A way to unlock your Ìrántí was removed.")).catch(
    () => undefined,
  );
  return json({ ok: true });
});
