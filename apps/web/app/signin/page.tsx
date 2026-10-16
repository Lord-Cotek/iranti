"use client";

import { Button, Field, Input, Mark, Notice } from "@iranti/ui";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { errorMessage } from "@/components/ui";
import { authClient } from "@/lib/auth-client";
import { passkeysSupported, signInWithPasskey } from "@/lib/passkey";
import { initVault, unlockWithPrf } from "@/lib/vault";

/**
 * Sign in proves who you are. It never unlocks the vault: that needs a passkey's PRF, the
 * passphrase or the recovery code, all handled on this device.
 */
export default function SignInPage() {
  const router = useRouter();
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function sendCode(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.emailOtp.sendVerificationOtp({
        email: email.trim(),
        type: "sign-in",
      });
      if (res.error)
        throw new Error(res.error.message ?? "We couldn't send a code. Try again in a minute.");
      setStep("code");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await authClient.signIn.emailOtp({ email: email.trim(), otp: code.trim() });
      if (res.error) throw new Error("That code didn't work. Check it, or ask for a new one.");
      await initVault();
      router.replace("/app/");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  async function passkey() {
    setBusy(true);
    setError(null);
    try {
      const { prf, credentialId } = await signInWithPasskey();
      await initVault();
      if (prf) await unlockWithPrf(prf, credentialId ?? undefined).catch(() => undefined);
      router.replace("/app/");
    } catch (err) {
      setError(errorMessage(err, "Passkey sign-in didn't complete."));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-4 py-12">
      <Link href="/" className="mb-10 flex items-center gap-3">
        <Mark size={34} />
        <span className="font-display text-xl">Ìrántí</span>
      </Link>
      <h1 className="font-display text-3xl font-medium">
        {step === "email" ? "Sign in" : "Check your email"}
      </h1>
      <p className="mt-2 text-muted">
        {step === "email"
          ? "We'll email you a six-digit code. New here? The same code creates your account."
          : `We sent a code to ${email}. It works once and expires in 10 minutes.`}
      </p>

      {step === "email" ? (
        <form onSubmit={sendCode} className="mt-8">
          <Field label="Email">
            {(p) => (
              <Input
                {...p}
                type="email"
                autoComplete="email webauthn"
                inputMode="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoFocus
              />
            )}
          </Field>
          {error ? (
            <Notice tone="alert" className="mb-4">
              {error}
            </Notice>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy || !email}>
            {busy ? "Sending…" : "Email me a code"}
          </Button>
          {passkeysSupported() ? (
            <Button
              type="button"
              variant="line"
              className="mt-3 w-full"
              onClick={() => void passkey()}
              disabled={busy}
            >
              Sign in with a passkey
            </Button>
          ) : null}
        </form>
      ) : (
        <form onSubmit={verify} className="mt-8">
          <Field label="Six-digit code">
            {(p) => (
              <Input
                {...p}
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]{6}"
                maxLength={6}
                className="font-mono text-2xl tracking-[0.4em]"
                required
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                autoFocus
              />
            )}
          </Field>
          {error ? (
            <Notice tone="alert" className="mb-4">
              {error}
            </Notice>
          ) : null}
          <Button type="submit" className="w-full" disabled={busy || code.length !== 6}>
            {busy ? "Checking…" : "Sign in"}
          </Button>
          <button
            type="button"
            className="mt-4 text-[15px] text-muted underline-offset-4 hover:underline"
            onClick={() => {
              setStep("email");
              setCode("");
              setError(null);
            }}
          >
            Use a different email
          </button>
        </form>
      )}

      <p className="mt-12 text-[14px] text-muted">
        Ìrántí will never ask for your passphrase or recovery code by email or message.
      </p>
    </main>
  );
}
