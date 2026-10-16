import { ITEM_TYPES, SECTION_LABELS, type ItemType, type Section } from "@iranti/core";
import { strFromU8, strToU8, unzipSync, zipSync } from "fflate";

/**
 * Decrypted export (BUILD.md §2.6, §16 Phase 1): a zip made on this device with
 * vault.json (every item, decrypted), files/ (original attachments) and summary.html (a
 * readable page). Open formats only.
 */
export interface ExportItem {
  id: string;
  section: Section;
  type: ItemType;
  tier: "URGENT" | "FULL";
  title: string;
  payload: Record<string, unknown>;
  updatedAt: string;
}

export interface ExportFile {
  id: string;
  itemId: string | null;
  name: string;
  type: string;
  data: Uint8Array;
}

export interface ExportBundle {
  format: "iranti-export";
  version: 1;
  exportedAt: string;
  account: { email: string };
  items: ExportItem[];
  files: Array<Omit<ExportFile, "data"> & { path: string }>;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

function safeName(name: string): string {
  const printable = [...name].map((c) => (c.charCodeAt(0) < 32 ? "_" : c)).join("");
  return printable.replace(/[\\/:*?"<>|]/g, "_").slice(0, 120) || "file";
}

function renderValue(v: unknown): string {
  if (Array.isArray(v)) return v.map((x) => esc(String(x))).join(", ");
  if (typeof v === "boolean") return v ? "Yes" : "No";
  return esc(String(v)).replace(/\n/g, "<br>");
}

export function summaryHtml(bundle: ExportBundle): string {
  const bySection = new Map<Section, ExportItem[]>();
  for (const it of bundle.items)
    bySection.set(it.section, [...(bySection.get(it.section) ?? []), it]);
  const sections = [...bySection].map(([section, items]) => {
    const body = items
      .map((it) => {
        const def = ITEM_TYPES[it.type];
        const rows = def.fields
          .filter((f) => it.payload[f.key] !== undefined)
          .map((f) => {
            const raw = it.payload[f.key];
            const label = f.options?.find((o) => o.value === raw)?.label;
            return `<tr><th>${esc(f.label)}</th><td>${label ? esc(label) : renderValue(raw)}</td></tr>`;
          })
          .join("");
        const files = bundle.files.filter((f) => f.itemId === it.id);
        const fileList = files.length
          ? `<p>Files: ${files.map((f) => `<a href="${esc(f.path)}">${esc(f.name)}</a>`).join(", ")}</p>`
          : "";
        return `<article><h3>${esc(it.title)} <small>${esc(def.label)} · ${it.tier === "URGENT" ? "opens in the first days" : "opens with everything else"}</small></h3><table>${rows}</table>${fileList}</article>`;
      })
      .join("");
    return `<section><h2>${esc(SECTION_LABELS[section].label)}</h2>${body}</section>`;
  });
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Ìrántí export</title>
<style>body{font:17px/1.6 Georgia,serif;max-width:46rem;margin:2rem auto;padding:0 1rem;color:#23211d}
h1,h2{font-weight:500}small{color:#6e6a63;font:14px system-ui,sans-serif}th{text-align:left;vertical-align:top;padding:4px 16px 4px 0;color:#6e6a63;font:15px system-ui,sans-serif;white-space:nowrap}
article{border-top:1px solid #e2dbcf;padding:1rem 0}</style></head><body>
<h1>Ìrántí export</h1><p>${esc(bundle.account.email)} · exported ${esc(bundle.exportedAt.slice(0, 10))}</p>
<p><strong>This file is not encrypted.</strong> Anyone who has it can read everything in it. Keep it as safe as the papers it describes.</p>
${sections.join("")}</body></html>`;
}

export function buildExportZip(
  email: string,
  items: ExportItem[],
  files: ExportFile[],
  now = new Date(),
): Uint8Array {
  const used = new Set<string>();
  const fileEntries = files.map((f) => {
    let path = `files/${safeName(f.name)}`;
    for (let n = 2; used.has(path); n++) path = `files/${n}-${safeName(f.name)}`;
    used.add(path);
    return { ...f, path };
  });
  const bundle: ExportBundle = {
    format: "iranti-export",
    version: 1,
    exportedAt: now.toISOString(),
    account: { email },
    items,
    files: fileEntries.map(({ data: _data, ...rest }) => rest),
  };
  const zip: Record<string, Uint8Array> = {
    "vault.json": strToU8(JSON.stringify(bundle, null, 2)),
    "summary.html": strToU8(summaryHtml(bundle)),
  };
  for (const f of fileEntries) zip[f.path] = f.data;
  return zipSync(zip, { level: 6 });
}

/** Read an export back (used by tests to prove the export round-trips). */
export function parseExportZip(bytes: Uint8Array): {
  bundle: ExportBundle;
  files: Record<string, Uint8Array>;
} {
  const entries = unzipSync(bytes);
  const bundle = JSON.parse(strFromU8(entries["vault.json"]!)) as ExportBundle;
  const files: Record<string, Uint8Array> = {};
  for (const f of bundle.files) files[f.path] = entries[f.path]!;
  return { bundle, files };
}
