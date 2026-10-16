"use client";

import { ITEM_TYPES, makeRecoveryEnvelope } from "@iranti/core";
import { Button, Card, Checkbox, Field, Input, Notice, Select } from "@iranti/ui";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { downloadBlob, errorMessage, PageHeader } from "@/components/ui";
import { api } from "@/lib/api";
import { SITE_URL } from "@/lib/config";
import type { ExportFile } from "@/lib/export";
import { downloadFile } from "@/lib/files";
import { addPasskey, passkeysSupported } from "@/lib/passkey";
import { AUTO_LOCK_CHOICES, loadSettings, saveSettings, type DeviceSettings } from "@/lib/settings";
import { getSession, refreshMe, signOut, useVault } from "@/lib/vault";

const KIND_LABEL = {
  PASSKEY: "Passkey",
  PASSPHRASE: "Passphrase",
  RECOVERY: "Recovery code",
  DEVICE: "Device",
};

function Section({
  title,
  children,
  sub,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="mb-6">
      <h2 className="text-[19px] font-medium">{title}</h2>
      {sub ? <p className="mt-1 text-[15px] text-muted">{sub}</p> : null}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const { me, items, files } = useVault();
  const [settings, setSettings] = useState<DeviceSettings>(() => loadSettings());
  const [message, setMessage] = useState<{
    tone: "safe" | "action" | "alert";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [deleteText, setDeleteText] = useState("");

  function update(next: DeviceSettings) {
    setSettings(next);
    saveSettings(next);
  }

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setMessage(null);
    try {
      await fn();
    } catch (e) {
      setMessage({ tone: "alert", text: errorMessage(e) });
    } finally {
      setBusy(null);
    }
  }

  const envelopes = me?.envelopes ?? [];

  return (
    <>
      <PageHeader eyebrow="Settings" title="Settings" />
      {message ? (
        <Notice tone={message.tone} className="mb-6">
          {message.text}
        </Notice>
      ) : null}

      <Section title="Locking" sub="Settings for this device only.">
        <Field label="Lock after this long without use">
          {(p) => (
            <Select
              {...p}
              value={settings.autoLockMinutes}
              onChange={(e) => update({ ...settings, autoLockMinutes: Number(e.target.value) })}
            >
              {AUTO_LOCK_CHOICES.map((m) => (
                <option key={m} value={m}>
                  {m} {m === 1 ? "minute" : "minutes"}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Checkbox
          label="Lock when I switch to another tab or app"
          checked={settings.lockOnHide}
          onChange={(e) => update({ ...settings, lockOnHide: e.target.checked })}
        />
      </Section>

      <Section
        title="Ways to unlock"
        sub="Signing in never unlocks your vault. These do. Keep at least two."
      >
        <ul className="grid gap-2">
          {envelopes.map((e) => (
            <li key={e.id} className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
              <span className="flex-1">
                {KIND_LABEL[e.kind]}
                {e.label && e.label !== KIND_LABEL[e.kind] ? ` · ${e.label}` : ""}
                <span className="block text-[14px] text-muted">
                  Added {e.createdAt.slice(0, 10)}
                </span>
              </span>
              {envelopes.length > 2 &&
              !(
                e.kind === "RECOVERY" && envelopes.filter((x) => x.kind === "RECOVERY").length === 1
              ) ? (
                <Button
                  variant="line"
                  className="min-h-9 px-3 py-1"
                  disabled={!!busy}
                  onClick={() =>
                    void run(e.id, async () => {
                      await api.revokeEnvelope(e.id);
                      await refreshMe();
                      setMessage({ tone: "safe", text: "Removed." });
                    })
                  }
                >
                  Remove
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <div className="mt-4 flex flex-wrap gap-3">
          {passkeysSupported() ? (
            <Button
              variant="line"
              disabled={!!busy}
              onClick={() =>
                void run("passkey", async () => {
                  const session = getSession();
                  if (!session) return;
                  const r = await addPasskey(session, "Passkey");
                  await refreshMe();
                  setMessage(
                    r === "unlock"
                      ? { tone: "safe", text: "Passkey added. You can sign in and unlock with it." }
                      : {
                          tone: "action",
                          text: "Passkey added for sign-in. This device can't use it to unlock.",
                        },
                  );
                })
              }
            >
              {busy === "passkey" ? "Waiting for your passkey…" : "Add a passkey"}
            </Button>
          ) : null}
          <Button
            variant="line"
            disabled={!!busy}
            onClick={() =>
              void run("recovery", async () => {
                const session = getSession();
                if (!session) return;
                const old = envelopes.filter((e) => e.kind === "RECOVERY");
                const { envelope, recoveryCode } = await makeRecoveryEnvelope(session);
                await api.addEnvelope(envelope);
                for (const o of old) await api.revokeEnvelope(o.id).catch(() => undefined);
                await refreshMe();
                setNewCode(recoveryCode);
              })
            }
          >
            Make a new recovery code
          </Button>
        </div>
        {newCode ? (
          <div className="mt-5">
            <div className="rounded-[var(--radius-lg)] bg-paper p-5 text-paper-ink">
              <p className="text-[13px] opacity-70">
                New recovery code. Your old one no longer works.
              </p>
              <p className="mt-2 font-mono text-[19px] font-medium tracking-wider">
                {newCode.split("-").join(" ")}
              </p>
            </div>
            <Button
              className="mt-3"
              onClick={() =>
                void run("kit", async () => {
                  const { buildEmergencyKit, loadKitFonts } = await import("@/lib/emergency-kit");
                  const pdf = await buildEmergencyKit({
                    email: me?.user.email ?? "",
                    recoveryCode: newCode,
                    signInUrl: `${SITE_URL}/signin/`,
                    createdAt: new Date(),
                    fonts: await loadKitFonts(),
                  });
                  downloadBlob(
                    new Blob([pdf as BlobPart], { type: "application/pdf" }),
                    "Iranti-Emergency-Kit.pdf",
                  );
                })
              }
            >
              Download new Emergency Kit
            </Button>
          </div>
        ) : null}
      </Section>

      <Section
        title="Export everything"
        sub="A zip made on this device: every entry decrypted as JSON, your files, and a readable page. It is not encrypted; keep it safe."
      >
        <Button
          variant="line"
          disabled={!!busy}
          onClick={() =>
            void run("export", async () => {
              const exportFiles: ExportFile[] = [];
              for (const f of files) {
                const { blob, meta } = await downloadFile(f);
                exportFiles.push({
                  id: f.id,
                  itemId: f.itemId,
                  name: meta.name,
                  type: meta.type,
                  data: new Uint8Array(await blob.arrayBuffer()),
                });
              }
              const { buildExportZip } = await import("@/lib/export");
              const zip = buildExportZip(
                me?.user.email ?? "",
                items
                  .filter((i) => !i.unreadable)
                  .map((i) => ({
                    id: i.id,
                    section: i.section,
                    type: i.type,
                    tier: i.tier,
                    title: i.title || ITEM_TYPES[i.type].label,
                    payload: i.payload,
                    updatedAt: i.updatedAt,
                  })),
                exportFiles,
              );
              downloadBlob(
                new Blob([zip as BlobPart], { type: "application/zip" }),
                `Iranti-export-${new Date().toISOString().slice(0, 10)}.zip`,
              );
            })
          }
        >
          {busy === "export" ? "Preparing…" : "Download export"}
        </Button>
      </Section>

      <Section title="Account">
        <Button
          variant="line"
          onClick={() => void signOut().then(() => router.replace("/signin/"))}
        >
          Sign out of this device
        </Button>
        <div className="mt-8 border-t border-line pt-6">
          <h3 className="font-medium text-alert">Delete your account</h3>
          <p className="mt-1 text-[15px] text-muted">
            This deletes your vault, every file and every letter not yet delivered, now and for
            good. Anyone you trusted will no longer hold a role for you. Export first if you want a
            copy.
          </p>
          <Field label='Type "delete my account" to confirm' className="mt-4">
            {(p) => (
              <Input
                {...p}
                value={deleteText}
                onChange={(e) => setDeleteText(e.target.value)}
                autoComplete="off"
              />
            )}
          </Field>
          <Button
            variant="danger"
            disabled={deleteText !== "delete my account" || !!busy}
            onClick={() =>
              void run("delete", async () => {
                await api.deleteAccount();
                await signOut();
                router.replace("/");
              })
            }
          >
            {busy === "delete" ? "Deleting…" : "Delete my account"}
          </Button>
        </div>
      </Section>
    </>
  );
}
