"use client";

import { buildSetup, type SetupResult } from "@iranti/core";
import { ARGON2_FLOOR, ARGON2_TARGET } from "@iranti/crypto";
import { Button, Card, Checkbox, Eyebrow, Field, Input, Mark, Notice } from "@iranti/ui";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { downloadBlob, errorMessage } from "@/components/ui";
import { SITE_URL } from "@/lib/config";
import { addPasskey, passkeysSupported } from "@/lib/passkey";
import { checkStrength, type Strength } from "@/lib/strength";
import { completeSetup, getSession, useVault } from "@/lib/vault";

type Step = "intro" | "passphrase" | "kit" | "passkey" | "done";

/**
 * First setup (BUILD.md §16 Phase 1.2): every key is made here, on this device. The
 * recovery code is shown once and the Emergency Kit cannot be skipped without an explicit
 * "I understand".
 */
export default function SetupPage() {
  const router = useRouter();
  const vault = useVault();
  const [step, setStep] = useState<Step>("intro");
  const startedHere = useRef(false);

  // Someone who already has a vault doesn't belong here.
  useEffect(() => {
    if (!startedHere.current && (vault.status === "locked" || vault.status === "unlocked"))
      router.replace("/app/");
  }, [vault.status, router]);

  const [adult, setAdult] = useState(false);
  const [passphrase, setPassphrase] = useState("");
  const [confirm, setConfirm] = useState("");
  const [strength, setStrength] = useState<Strength | null>(null);
  const [result, setResult] = useState<SetupResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    if (!passphrase) {
      setStrength(null);
      return;
    }
    const t = setTimeout(() => {
      void checkStrength(passphrase).then((s) => live && setStrength(s));
    }, 200);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [passphrase]);

  async function makeKeys(e: FormEvent) {
    e.preventDefault();
    if (!vault.me) return;
    const s = await checkStrength(passphrase);
    if (!s.ok) return setError(s.message);
    if (passphrase !== confirm) return setError("The two passphrases don't match.");
    setBusy(true);
    setError(null);
    startedHere.current = true;
    await new Promise((r) => setTimeout(r, 30));
    try {
      let res: SetupResult;
      try {
        res = await buildSetup({ userId: vault.me.user.id, passphrase, argon2Cost: ARGON2_TARGET });
      } catch {
        // Low-memory devices: fall back to the documented floor (CRYPTO.md §3.2.2).
        res = await buildSetup({ userId: vault.me.user.id, passphrase, argon2Cost: ARGON2_FLOOR });
      }
      setResult(res);
      setPassphrase("");
      setConfirm("");
      setStep("kit");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto max-w-xl px-4 pb-20 pt-10">
      <div className="mb-10 flex items-center gap-3">
        <Mark size={30} />
        <span className="font-display text-lg">Ìrántí</span>
      </div>

      {step === "intro" ? (
        <section>
          <Eyebrow>Before you begin</Eyebrow>
          <h1 className="mt-2 font-display text-[2.2rem] font-medium leading-tight">
            Your vault is locked with keys only you hold
          </h1>
          <div className="mt-5 space-y-4 font-read text-[18px] leading-relaxed text-ink/90">
            <p>
              Everything you put in Ìrántí is locked on this device before it reaches us. Nobody at
              COTEK can read it, and nobody can unlock it for you.
            </p>
            <p>
              That&apos;s the point, and it has a cost: if you lose your passphrase, your passkeys
              and your recovery code, your vault can never be opened. Not by us, not by anyone.
            </p>
          </div>
          <Card className="mt-6">
            <Checkbox
              label="I am 18 or older."
              checked={adult}
              onChange={(e) => setAdult(e.target.checked)}
            />
          </Card>
          <Button className="mt-6" disabled={!adult} onClick={() => setStep("passphrase")}>
            Continue
          </Button>
        </section>
      ) : null}

      {step === "passphrase" ? (
        <section>
          <Eyebrow>Step 1 of 3</Eyebrow>
          <h1 className="mt-2 font-display text-[2.2rem] font-medium leading-tight">
            Choose a passphrase
          </h1>
          <p className="mt-3 text-muted">
            Four or five unrelated words are easy to remember and hard to guess. You&apos;ll use it
            to unlock your vault on new devices.
          </p>
          <form onSubmit={makeKeys} className="mt-6">
            <Field label="Passphrase" hint={strength?.message}>
              {(p) => (
                <Input
                  {...p}
                  type="password"
                  autoComplete="new-password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  autoFocus
                />
              )}
            </Field>
            <Field label="Type it again">
              {(p) => (
                <Input
                  {...p}
                  type="password"
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                />
              )}
            </Field>
            {error ? (
              <Notice tone="alert" className="mb-4">
                {error}
              </Notice>
            ) : null}
            <Button type="submit" disabled={busy || !passphrase || !confirm}>
              {busy ? "Making your keys…" : "Make my keys"}
            </Button>
            {busy ? (
              <p className="mt-3 text-[15px] text-muted">This takes a few seconds on purpose.</p>
            ) : null}
          </form>
        </section>
      ) : null}

      {step === "kit" && result ? (
        <KitStep
          result={result}
          email={vault.me?.user.email ?? ""}
          onDone={async () => {
            await completeSetup(result);
            setStep(passkeysSupported() ? "passkey" : "done");
          }}
        />
      ) : null}

      {step === "passkey" ? <PasskeyStep onDone={() => setStep("done")} /> : null}

      {step === "done" ? (
        <section>
          <Eyebrow>Ready</Eyebrow>
          <h1 className="mt-2 font-display text-[2.2rem] font-medium leading-tight">
            Your vault is ready
          </h1>
          <Notice tone="safe" className="mt-5">
            Locked and ready. Nothing you add can be read by anyone but you, until the people you
            choose need it.
          </Notice>
          <Button className="mt-6" onClick={() => router.replace("/app/")}>
            Go to your vault
          </Button>
        </section>
      ) : null}
    </main>
  );
}

function KitStep({
  result,
  email,
  onDone,
}: {
  result: SetupResult;
  email: string;
  onDone: () => Promise<void>;
}) {
  const [saved, setSaved] = useState(false);
  const [typed, setTyped] = useState("");
  const [skip, setSkip] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const groups = result.recoveryCode.split("-");
  const lastTwo = groups.slice(-2).join("-");
  const confirmed = typed.trim().toUpperCase().replace(/\s/g, "-") === lastTwo;

  async function download() {
    setError(null);
    try {
      const { buildEmergencyKit, loadKitFonts } = await import("@/lib/emergency-kit");
      const pdf = await buildEmergencyKit({
        email,
        recoveryCode: result.recoveryCode,
        signInUrl: `${SITE_URL}/signin/`,
        createdAt: new Date(),
        fonts: await loadKitFonts(),
      });
      downloadBlob(
        new Blob([pdf as BlobPart], { type: "application/pdf" }),
        "Iranti-Emergency-Kit.pdf",
      );
      setSaved(true);
    } catch (err) {
      setError(errorMessage(err, "The kit couldn't be made. Write the code down instead."));
    }
  }

  async function finish() {
    setBusy(true);
    setError(null);
    try {
      await onDone();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  }

  return (
    <section>
      <Eyebrow>Step 2 of 3</Eyebrow>
      <h1 className="mt-2 font-display text-[2.2rem] font-medium leading-tight">
        Save your Emergency Kit
      </h1>
      <p className="mt-3 text-muted">
        This recovery code opens your vault if you forget your passphrase. It&apos;s shown once.
        Print the kit and keep it with your will or in a safe.
      </p>
      <div className="mt-6 rounded-[var(--radius-lg)] bg-paper p-5 text-paper-ink">
        <p className="text-[13px] text-paper-ink/70">Recovery code</p>
        <p
          className="mt-2 font-mono text-[20px] font-medium leading-relaxed tracking-wider"
          data-testid="recovery-code"
        >
          {groups.join(" ")}
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button onClick={() => void download()}>Download Emergency Kit (PDF)</Button>
      </div>

      <div className="mt-8">
        <Field label="To confirm you have it, type the last two groups of the code">
          {(p) => (
            <Input
              {...p}
              className="font-mono uppercase tracking-wider"
              autoComplete="off"
              spellCheck={false}
              placeholder="XXXX-XXXX"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
            />
          )}
        </Field>
        {!saved && !confirmed ? (
          <Checkbox
            label="I understand that without this code, a forgotten passphrase means my vault can never be opened. Continue without saving the kit."
            checked={skip}
            onChange={(e) => setSkip(e.target.checked)}
          />
        ) : null}
      </div>
      {error ? (
        <Notice tone="alert" className="mt-4">
          {error}
        </Notice>
      ) : null}
      <Button
        className="mt-6"
        disabled={busy || !(confirmed || skip)}
        onClick={() => void finish()}
      >
        {busy ? "Saving…" : "I've saved it. Continue"}
      </Button>
    </section>
  );
}

function PasskeyStep({ onDone }: { onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{
    tone: "safe" | "action" | "alert";
    text: string;
  } | null>(null);

  async function add() {
    const session = getSession();
    if (!session) return onDone();
    setBusy(true);
    setMessage(null);
    try {
      const result = await addPasskey(session, "This device");
      if (result === "unlock") {
        setMessage({ tone: "safe", text: "Passkey added. You can sign in and unlock with it." });
        setTimeout(onDone, 900);
      } else {
        setMessage({
          tone: "action",
          text: "This passkey can sign you in, but this device can't use it to unlock. Keep using your passphrase here.",
        });
      }
    } catch (err) {
      setMessage({ tone: "alert", text: errorMessage(err, "The passkey wasn't added.") });
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <Eyebrow>Step 3 of 3</Eyebrow>
      <h1 className="mt-2 font-display text-[2.2rem] font-medium leading-tight">
        Unlock with a passkey
      </h1>
      <p className="mt-3 text-muted">
        Use your face, fingerprint or screen lock instead of typing your passphrase on this device.
        You can add more later in Settings.
      </p>
      {message ? (
        <Notice tone={message.tone} className="mt-5">
          {message.text}
        </Notice>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-3">
        <Button onClick={() => void add()} disabled={busy}>
          {busy ? "Waiting for your passkey…" : "Add a passkey"}
        </Button>
        <Button variant="line" onClick={onDone} disabled={busy}>
          Not now
        </Button>
      </div>
    </section>
  );
}
