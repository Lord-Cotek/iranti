import { Envelope, EnvelopeInput } from "@iranti/core";
import { db } from "@/lib/db";
import { json, requireProof, requireUser, route } from "@/lib/http";
import { securityNoticeMail, sendMail } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LABELS = {
  PASSKEY: "A passkey",
  PASSPHRASE: "A passphrase",
  RECOVERY: "A recovery code",
  DEVICE: "A device",
};

/** Add an unlock method (a passkey, a new passphrase, a new recovery code). */
export const POST = route(async (request) => {
  const user = await requireUser(request);
  const body = await requireProof(request, user, EnvelopeInput);
  const created = await db().accountEnvelope.create({
    data: {
      id: body.id,
      userId: user.id,
      kind: body.kind,
      wrappedKey: body.wrappedKey,
      params: body.params,
      label: body.label ?? null,
    },
  });
  await sendMail(
    securityNoticeMail(
      user.email,
      `${LABELS[body.kind]} was added as a way to unlock your Ìrántí.`,
    ),
  ).catch(() => undefined);
  return json(
    Envelope.parse({
      ...body,
      label: created.label,
      createdAt: created.createdAt.toISOString(),
    }),
    201,
  );
});
