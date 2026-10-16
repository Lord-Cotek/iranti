"use client";

import { SECTIONS, SECTION_LABELS, typesInSection, type Section } from "@iranti/core";
import { Card } from "@iranti/ui";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { PageHeader, TierTag } from "@/components/ui";
import { useVault } from "@/lib/vault";

function VaultView() {
  const params = useSearchParams();
  const raw = params.get("section");
  const section: Section = SECTIONS.includes(raw as Section) ? (raw as Section) : "people";
  const { items, files } = useVault();
  const [picking, setPicking] = useState(false);
  const list = items.filter((i) => i.section === section);
  const types = typesInSection(section);
  const meta = SECTION_LABELS[section];

  return (
    <>
      <PageHeader eyebrow={meta.eyebrow} title={meta.label}>
        {meta.blurb}
      </PageHeader>

      <nav aria-label="Sections" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-1">
        {SECTIONS.map((s) => (
          <Link
            key={s}
            href={`/app/vault/?section=${s}`}
            aria-current={s === section ? "page" : undefined}
            className={`whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[15px] ${
              s === section ? "border-accent/60 bg-accent-soft text-ink" : "border-line text-muted"
            }`}
          >
            {SECTION_LABELS[s].label}
          </Link>
        ))}
      </nav>

      {list.length === 0 ? <p className="mb-6 text-muted">Nothing here yet.</p> : null}
      <ul className="mb-6 grid gap-3">
        {list.map((it) => {
          const attached = files.filter((f) => f.itemId === it.id).length;
          const def = types.find((t) => t.type === it.type);
          return (
            <li key={it.id}>
              <Link href={`/app/item/?id=${it.id}`}>
                <Card className="flex flex-wrap items-center gap-x-4 gap-y-2 transition hover:border-accent/50">
                  <div className="min-w-0 flex-1">
                    <p
                      className={`truncate text-[17px] font-medium ${it.unreadable ? "text-alert" : ""}`}
                    >
                      {it.title}
                    </p>
                    <p className="text-[14px] text-muted">
                      {def?.label ?? it.type}
                      {attached ? ` · ${attached} ${attached === 1 ? "file" : "files"}` : ""}
                    </p>
                  </div>
                  <TierTag tier={it.tier} />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      {types.length === 1 ? (
        <Link
          href={`/app/item/?new=${types[0]!.type}`}
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-accent px-4 font-semibold text-accent-ink"
        >
          Add {types[0]!.label.toLowerCase()}
        </Link>
      ) : picking ? (
        <Card>
          <p className="mb-3 font-medium">What would you like to add?</p>
          <ul className="grid gap-2 sm:grid-cols-2">
            {types.map((t) => (
              <li key={t.type}>
                <Link
                  href={`/app/item/?new=${t.type}`}
                  className="block rounded-[12px] border border-line px-3.5 py-2.5 hover:border-accent/50"
                >
                  <span className="block text-[16px]">{t.label}</span>
                  <span className="block text-[14px] text-muted">{t.hint}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <button
          type="button"
          onClick={() => setPicking(true)}
          className="inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-accent px-4 font-semibold text-accent-ink"
        >
          Add to {meta.label.toLowerCase()}
        </button>
      )}
    </>
  );
}

export default function VaultPage() {
  return (
    <Suspense>
      <VaultView />
    </Suspense>
  );
}
