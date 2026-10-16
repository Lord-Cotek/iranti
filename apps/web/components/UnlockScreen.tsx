"use client";

import { Button, Field, Input, Mark, Notice } from "@iranti/ui";
import { useState, type FormEvent } from "react";
import { localPrf, passkeysSupported } from "@/lib/passkey";
import {
  signOut,
  unlockWithPassphrase,
  unlockWithPrf,
  unlockWithRecoveryCode,
  useVault,
} from "@/lib/vault";
import { errorMessage } from "./ui";

type Method = "passkey" | "passphrase" | "recovery";

/** Shown whenever the vault is locked. Signing in never unlocks; this does. */
export function UnlockScreen() {
  const { me, offline } = useVault();
  const passkeyEnvelopes = (me?.envelopes ?? []).filter(
    (e) => e.kind === "PASSKEY" && e.params.kdf === "webauthn-prf+hkdf-sha256",
  );
  const canPasskey = passkeyEnvelopes.length > 0 && passkeysSupported();
  const [method, setMethod] = useState<Method>(canPasskey ? "passkey" : "passphrase");
  const [secret, setSecret] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e?: FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    // Let the "Unlocking…" state paint before Argon2id occupies the main thread.
    await new Promise((r) => setTimeout(r, 30));
    try {
      if (method === "passkey") {
        const ids = passkeyEnvelopes.map(
          (env) => (env.params as { credentialId: string }).credentialId,
        );
        const res = await localPrf(ids);
        if (!res)
          throw new Error("This passkey can't unlock your vault here. Use your passphrase.");
        await unlockWithPrf(res.prf, res.credentialId);
      } else if (method === "passphrase") {
        await unlockWithPassphrase(secret);
      } else {
        await unlockWithRecoveryCode(secret);
      }
      setSecret("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  const tabs: Array<[Method, string]> = [
    ...(canPasskey ? ([["passkey", "Passkey"]] as Array<[Method, string]>) : []),
    ["passphrase", "Passphrase"],
    ["recovery", "Recovery code"],
  ];

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <div className="mb-8 flex items-center gap-3">
        <Mark size={34} />
        <span className="font-display text-xl">Ìrántí</span>
      </div>
      <h1 className="font-display text-3xl font-medium">Unlock your vault</h1>
      <p className="mt-2 text-muted">
        You&apos;re signed in{me ? ` as ${me.user.email}` : ""}. Your vault opens only on this
        device, with something only you have.
      </p>
      {offline ? (
        <Notice className="mt-4">
          You&apos;re offline. You can unlock and read what was last synced.
        </Notice>
      ) : null}

      <div
        role="tablist"
        aria-label="Unlock with"
        className="mt-6 grid grid-flow-col gap-1 rounded-[12px] border border-line p-1"
      >
        {tabs.map(([m, label]) => (
          <button
            key={m}
            role="tab"
            type="button"
            aria-selected={method === m}
            onClick={() => {
              setMethod(m);
              setError(null);
              setSecret("");
            }}
            className={`rounded-[9px] px-3 py-2 text-[15px] ${method === m ? "bg-raise text-ink" : "text-muted"}`}
          >
            {label}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="mt-6">
        {method === "passkey" ? (
          <p className="mb-4 text-muted">Use the passkey on this device or your phone.</p>
        ) : method === "passphrase" ? (
          <Field label="Passphrase">
            {(p) => (
              <Input
                {...p}
                type="password"
                autoComplete="current-password"
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoFocus
              />
            )}
          </Field>
        ) : (
          <Field
            label="Recovery code"
            hint="From your Emergency Kit. Spaces and dashes don't matter."
          >
            {(p) => (
              <Input
                {...p}
                className="font-mono uppercase tracking-wider"
                autoComplete="off"
                spellCheck={false}
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                autoFocus
              />
            )}
          </Field>
        )}
        {error ? (
          <Notice tone="alert" className="mb-4">
            {error}
          </Notice>
        ) : null}
        <Button
          type="submit"
          className="w-full"
          disabled={busy || (method !== "passkey" && !secret)}
        >
          {busy ? "Unlocking…" : method === "passkey" ? "Unlock with passkey" : "Unlock"}
        </Button>
      </form>
      <button
        type="button"
        onClick={() => void signOut()}
        className="mt-8 self-start text-[15px] text-muted underline-offset-4 hover:underline"
      >
        Sign out
      </button>
    </main>
  );
}
