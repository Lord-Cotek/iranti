"use client";

import { makePasskeyEnvelope, type UnlockedSession } from "@iranti/core";
import { prfSalt, randomBytes } from "@iranti/crypto";
import { api } from "./api";
import { authClient } from "./auth-client";
import { refreshMe } from "./vault";

/**
 * Passkeys do two jobs (CRYPTO.md §3.2.1): sign in (Better Auth verifies the assertion) and
 * unlock (the authenticator's PRF output derives the key that opens the Account Key). The
 * PRF output never leaves this device: Better Auth's client strips extension results before
 * posting, and we read them locally.
 */

export function passkeysSupported(): boolean {
  return typeof window !== "undefined" && "PublicKeyCredential" in window;
}

function prfExtension() {
  return { prf: { eval: { first: prfSalt() } } } as unknown as AuthenticationExtensionsClientInputs;
}

function prfFirst(results: unknown): Uint8Array | null {
  const first = (
    results as { prf?: { results?: { first?: ArrayBuffer | ArrayBufferView } } } | undefined
  )?.prf?.results?.first;
  if (!first) return null;
  return first instanceof ArrayBuffer
    ? new Uint8Array(first)
    : new Uint8Array(first.buffer, first.byteOffset, first.byteLength);
}

/** Ask an existing passkey for its PRF output without involving the server. */
export async function localPrf(
  credentialIds: string[],
): Promise<{ prf: Uint8Array; credentialId: string } | null> {
  const toBytes = (b64url: string) => {
    const b64 = b64url
      .replace(/-/g, "+")
      .replace(/_/g, "/")
      .padEnd(Math.ceil(b64url.length / 4) * 4, "=");
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
  };
  const challenge = randomBytes(32);
  const cred = (await navigator.credentials.get({
    publicKey: {
      challenge: challenge as BufferSource,
      rpId: window.location.hostname,
      allowCredentials: credentialIds.map((id) => ({
        type: "public-key" as const,
        id: toBytes(id) as BufferSource,
      })),
      userVerification: "required",
      extensions: prfExtension(),
    },
  })) as PublicKeyCredential | null;
  if (!cred) return null;
  const prf = prfFirst(cred.getClientExtensionResults());
  return prf ? { prf, credentialId: cred.id } : null;
}

/** Sign in with a passkey; returns PRF output when the authenticator supports it. */
export async function signInWithPasskey(): Promise<{
  prf: Uint8Array | null;
  credentialId: string | null;
}> {
  const res = await authClient.signIn.passkey({
    extensions: prfExtension(),
    returnWebAuthnResponse: true,
  });
  if (res.error) throw new Error(res.error.message ?? "Passkey sign-in did not complete");
  const webauthn = (
    res as { webauthn?: { response: { id: string }; clientExtensionResults: unknown } }
  ).webauthn;
  return {
    prf: prfFirst(webauthn?.clientExtensionResults),
    credentialId: webauthn?.response.id ?? null,
  };
}

export type AddPasskeyResult = "unlock" | "sign-in-only";

/**
 * Register a passkey for this account and, if it supports PRF, add it as a way to unlock.
 * Returns "sign-in-only" when the authenticator cannot derive a key.
 */
export async function addPasskey(
  session: UnlockedSession,
  label: string,
): Promise<AddPasskeyResult> {
  const res = await authClient.passkey.addPasskey({
    name: label,
    extensions: prfExtension(),
    returnWebAuthnResponse: true,
  });
  if (res.error) throw new Error(res.error.message ?? "Passkey was not added");
  const webauthn = (
    res as { webauthn?: { response: { id: string }; clientExtensionResults: unknown } }
  ).webauthn;
  const credentialId = webauthn?.response.id;
  if (!credentialId) return "sign-in-only";

  let prf = prfFirst(webauthn?.clientExtensionResults);
  const enabled = (webauthn?.clientExtensionResults as { prf?: { enabled?: boolean } } | undefined)
    ?.prf?.enabled;
  if (!prf && enabled !== false) {
    // Many authenticators only evaluate PRF on assertion: ask once more, locally.
    prf = (await localPrf([credentialId]).catch(() => null))?.prf ?? null;
  }
  if (!prf) return "sign-in-only";
  await api.addEnvelope(await makePasskeyEnvelope(session, prf, credentialId, label));
  await refreshMe();
  return "unlock";
}
