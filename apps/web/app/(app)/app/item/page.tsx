"use client";

import {
  ITEM_TYPES,
  parsePayload,
  SECTION_LABELS,
  type FieldDef,
  type FileRecord,
  type ItemType,
  type ReleaseTier,
} from "@iranti/core";
import {
  Button,
  Card,
  Checkbox,
  Eyebrow,
  Field,
  Input,
  Notice,
  Select,
  TextArea,
} from "@iranti/ui";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState, type FormEvent } from "react";
import { downloadBlob, errorMessage, Quiet } from "@/components/ui";
import { downloadFile, fileMeta, formatBytes, removeFile, uploadFile } from "@/lib/files";
import { deleteItem, saveItem, useVault } from "@/lib/vault";

type FormValues = Record<string, string | string[] | boolean>;

function toForm(fields: readonly FieldDef[], payload: Record<string, unknown>): FormValues {
  const out: FormValues = {};
  for (const f of fields) {
    const v = payload[f.key];
    if (f.kind === "phones" || f.kind === "list") out[f.key] = Array.isArray(v) ? v.join("\n") : "";
    else if (f.kind === "multiselect") out[f.key] = Array.isArray(v) ? (v as string[]) : [];
    else if (f.kind === "boolean") out[f.key] = v === true;
    else out[f.key] = v === undefined ? "" : String(v);
  }
  return out;
}

function fromForm(fields: readonly FieldDef[], values: FormValues): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of fields) {
    const v = values[f.key];
    if (f.kind === "phones" || f.kind === "list") {
      out[f.key] = String(v ?? "")
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (f.kind === "number")
      out[f.key] = v === "" || v === undefined ? undefined : Number(v);
    else if (f.kind === "country" || f.kind === "currency")
      out[f.key] = String(v ?? "")
        .trim()
        .toUpperCase();
    else if (f.kind === "boolean") out[f.key] = v === true ? true : undefined;
    else out[f.key] = v;
  }
  return out;
}

function FieldInput({
  f,
  value,
  onChange,
  error,
}: {
  f: FieldDef;
  value: string | string[] | boolean | undefined;
  onChange: (v: string | string[] | boolean) => void;
  error?: string;
}) {
  const label = f.required ? f.label : `${f.label} (optional)`;
  if (f.kind === "boolean") {
    return (
      <div className="mb-4">
        <Checkbox
          label={f.label}
          checked={value === true}
          onChange={(e) => onChange(e.target.checked)}
        />
        {f.help ? <p className="ms-8 mt-1 text-[14px] text-muted">{f.help}</p> : null}
      </div>
    );
  }
  if (f.kind === "multiselect") {
    const selected = Array.isArray(value) ? value : [];
    return (
      <fieldset className="mb-4">
        <legend className="mb-2 text-[15px] text-muted">{label}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {f.options?.map((o) => (
            <Checkbox
              key={o.value}
              label={o.label}
              checked={selected.includes(o.value)}
              onChange={(e) =>
                onChange(
                  e.target.checked ? [...selected, o.value] : selected.filter((x) => x !== o.value),
                )
              }
            />
          ))}
        </div>
      </fieldset>
    );
  }
  const str = typeof value === "string" ? value : "";
  const hint =
    f.help ??
    (f.kind === "phones" || f.kind === "list"
      ? "One per line."
      : f.kind === "country"
        ? "Two letters, e.g. AE, NG, IN, PH, GB."
        : f.kind === "currency"
          ? "Three letters, e.g. AED, NGN, USD."
          : undefined);
  return (
    <Field label={label} hint={hint} error={error}>
      {(p) => {
        switch (f.kind) {
          case "longtext":
          case "phones":
          case "list":
            return (
              <TextArea
                {...p}
                value={str}
                onChange={(e) => onChange(e.target.value)}
                placeholder={f.placeholder}
              />
            );
          case "select":
            return (
              <Select {...p} value={str} onChange={(e) => onChange(e.target.value)}>
                <option value="">{f.required ? "Choose…" : "Not set"}</option>
                {f.options?.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            );
          default:
            return (
              <Input
                {...p}
                value={str}
                placeholder={f.placeholder}
                onChange={(e) => onChange(e.target.value)}
                type={
                  f.kind === "email"
                    ? "email"
                    : f.kind === "date"
                      ? "date"
                      : f.kind === "number"
                        ? "number"
                        : "text"
                }
                inputMode={f.kind === "last4" || f.kind === "number" ? "numeric" : undefined}
                maxLength={
                  f.kind === "last4"
                    ? 4
                    : f.kind === "country"
                      ? 2
                      : f.kind === "currency"
                        ? 3
                        : undefined
                }
                autoComplete="off"
              />
            );
        }
      }}
    </Field>
  );
}

function Attachments({ itemId, tier }: { itemId: string; tier: ReleaseTier }) {
  const { files } = useVault();
  const mine = files.filter((f) => f.itemId === itemId);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => () => (preview ? URL.revokeObjectURL(preview.url) : undefined), [preview]);

  async function run(label: string, fn: () => Promise<void>) {
    setBusy(label);
    setError(null);
    try {
      await fn();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  async function open(f: FileRecord, mode: "download" | "preview") {
    await run(f.id, async () => {
      const { blob, meta } = await downloadFile(f);
      if (mode === "download") return downloadBlob(blob, meta.name);
      if (meta.type.startsWith("image/"))
        setPreview({ url: URL.createObjectURL(blob), name: meta.name });
      else window.open(URL.createObjectURL(blob), "_blank", "noopener");
    });
  }

  return (
    <Card className="mt-8">
      <h2 className="text-[18px] font-medium">Files</h2>
      <p className="mt-1 text-[15px] text-muted">
        Scans and photos are locked on this device before upload, like everything else.
      </p>
      <ul className="mt-4 grid gap-2">
        {mine.map((f) => {
          const meta = fileMeta(f);
          const previewable =
            meta && (meta.type.startsWith("image/") || meta.type === "application/pdf");
          return (
            <li key={f.id} className="flex flex-wrap items-center gap-2 border-t border-line pt-2">
              <span className="min-w-0 flex-1 truncate">{meta?.name ?? "Unreadable file"}</span>
              <span className="text-[14px] text-muted">{formatBytes(f.sizeBytes)}</span>
              {previewable ? (
                <Button
                  variant="line"
                  className="min-h-9 px-3 py-1"
                  disabled={!!busy}
                  onClick={() => void open(f, "preview")}
                >
                  View
                </Button>
              ) : null}
              <Button
                variant="line"
                className="min-h-9 px-3 py-1"
                disabled={!!busy}
                onClick={() => void open(f, "download")}
              >
                {busy === f.id ? "Opening…" : "Download"}
              </Button>
              <Button
                variant="danger"
                className="min-h-9 px-3 py-1"
                disabled={!!busy}
                onClick={() => void run(f.id, () => removeFile(f.id))}
              >
                Remove
              </Button>
            </li>
          );
        })}
      </ul>
      {preview ? (
        <figure className="mt-4">
          <img
            src={preview.url}
            alt={preview.name}
            className="max-h-[70vh] rounded-[12px] border border-line"
          />
          <figcaption className="mt-2 flex items-center gap-3 text-[14px] text-muted">
            {preview.name}
            <button type="button" className="underline" onClick={() => setPreview(null)}>
              Close
            </button>
          </figcaption>
        </figure>
      ) : null}
      <label className="mt-4 inline-flex min-h-11 cursor-pointer items-center rounded-[var(--radius-sm)] border border-line px-4 hover:bg-raise">
        {busy === "upload" ? "Locking and uploading…" : "Add a file"}
        <input
          type="file"
          className="sr-only"
          disabled={!!busy}
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) void run("upload", () => uploadFile(file, itemId, tier));
          }}
        />
      </label>
      {error ? (
        <Notice tone="alert" className="mt-4">
          {error}
        </Notice>
      ) : null}
    </Card>
  );
}

function ItemEditor() {
  const params = useSearchParams();
  const router = useRouter();
  const { items } = useVault();
  const id = params.get("id");
  const existing = id ? items.find((i) => i.id === id) : undefined;
  const type = (existing?.type ?? params.get("new")) as ItemType | null;
  const def = type ? ITEM_TYPES[type] : undefined;

  const [values, setValues] = useState<FormValues>({});
  const [tier, setTier] = useState<ReleaseTier>("FULL");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ tone: "safe" | "alert"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const loadedFor = useMemo(() => existing?.id ?? type, [existing?.id, type]);

  useEffect(() => {
    if (!def) return;
    setValues(toForm(def.fields, existing?.payload ?? {}));
    setTier(existing?.tier ?? def.defaultTier);
    // Only when switching to a different item, not on every save.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loadedFor]);

  if (!def)
    return (
      <Quiet>{id ? "This item isn't in your vault." : "Choose what to add from the vault."}</Quiet>
    );
  if (existing?.unreadable) {
    return (
      <Notice tone="alert">This item couldn&apos;t be opened. It may have been damaged.</Notice>
    );
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!def) return;
    const parsed = parsePayload(def.type, fromForm(def.fields, values));
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0] ?? "");
        next[key] ??= issue.code === "invalid_type" ? "This is needed." : issue.message;
      }
      setErrors(next);
      setStatus({ tone: "alert", text: "Some details need another look." });
      return;
    }
    setErrors({});
    setBusy(true);
    setStatus(null);
    try {
      const savedId = await saveItem({
        id: existing?.id,
        section: def.section,
        type: def.type,
        tier,
        payload: parsed.data,
      });
      setStatus({ tone: "safe", text: "Saved and locked." });
      if (!existing) router.replace(`/app/item/?id=${savedId}`);
    } catch (err) {
      setStatus({ tone: "alert", text: errorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!existing || !def) return;
    setBusy(true);
    try {
      await deleteItem(existing.id);
      router.replace(`/app/vault/?section=${def.section}`);
    } catch (err) {
      setStatus({ tone: "alert", text: errorMessage(err) });
      setBusy(false);
    }
  }

  const repatriationNudge =
    def.type === "policy" &&
    tier === "FULL" &&
    (values.coversRepatriation === true || values.policyType === "life");

  return (
    <>
      <Link
        href={`/app/vault/?section=${def.section}`}
        className="text-[15px] text-muted hover:text-ink"
      >
        ← {SECTION_LABELS[def.section].label}
      </Link>
      <header className="mb-6 mt-4">
        <Eyebrow>{SECTION_LABELS[def.section].eyebrow}</Eyebrow>
        <h1 className="mt-1 font-display text-[2rem] font-medium leading-tight">
          {existing ? existing.title : `New ${def.label.toLowerCase()}`}
        </h1>
      </header>
      {def.warning ? (
        <Notice tone="action" className="mb-6">
          {def.warning}
        </Notice>
      ) : null}

      <form onSubmit={save} noValidate>
        {def.fields.map((f) => (
          <FieldInput
            key={f.key}
            f={f}
            value={values[f.key]}
            error={errors[f.key]}
            onChange={(v) => setValues((prev) => ({ ...prev, [f.key]: v }))}
          />
        ))}

        <fieldset className="mb-6 mt-2">
          <legend className="mb-2 text-[15px] text-muted">
            When it opens, if your vault is ever released
          </legend>
          <div className="grid gap-2 sm:grid-cols-2">
            {(
              [
                [
                  "URGENT",
                  "Open in the first days",
                  "Who to call, what you want. For the first 72 hours.",
                ],
                ["FULL", "Open with everything else", "Accounts, documents, private notes."],
              ] as const
            ).map(([value, title, sub]) => (
              <label
                key={value}
                className={`cursor-pointer rounded-[14px] border px-3.5 py-3 ${tier === value ? "border-accent/60 bg-accent-soft" : "border-line bg-surface"}`}
              >
                <input
                  type="radio"
                  name="tier"
                  className="sr-only"
                  checked={tier === value}
                  onChange={() => setTier(value)}
                />
                <span className="block text-[16px]">{title}</span>
                <span className="block text-[14px] text-muted">{sub}</span>
              </label>
            ))}
          </div>
          {repatriationNudge ? (
            <p className="mt-2 text-[14px] text-muted">
              Life and repatriation cover is usually needed in the first days.{" "}
              <button
                type="button"
                className="text-accent underline"
                onClick={() => setTier("URGENT")}
              >
                Open it in the first days
              </button>
            </p>
          ) : null}
        </fieldset>

        {status ? (
          <Notice tone={status.tone} className="mb-4">
            {status.text}
          </Notice>
        ) : null}
        <div className="flex flex-wrap gap-3">
          <Button type="submit" disabled={busy}>
            {busy ? "Locking…" : "Save"}
          </Button>
          {existing ? (
            confirmDelete ? (
              <Button variant="danger" disabled={busy} onClick={() => void remove()}>
                Delete it and its files
              </Button>
            ) : (
              <Button variant="line" onClick={() => setConfirmDelete(true)}>
                Delete
              </Button>
            )
          ) : null}
        </div>
      </form>

      {existing ? <Attachments itemId={existing.id} tier={existing.tier} /> : null}
    </>
  );
}

export default function ItemPage() {
  return (
    <Suspense>
      <ItemEditor />
    </Suspense>
  );
}
