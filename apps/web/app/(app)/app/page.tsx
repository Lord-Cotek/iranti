"use client";

import { SECTIONS, SECTION_LABELS, type Section } from "@iranti/core";
import { Card, Notice } from "@iranti/ui";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { loadSettings } from "@/lib/settings";
import { useVault } from "@/lib/vault";

function describe(count: number): string {
  if (count === 0) return "Nothing yet";
  return count === 1 ? "1 entry" : `${count} entries`;
}

export default function HomePage() {
  const { items, me } = useVault();
  const counts = new Map<Section, number>();
  for (const it of items) counts.set(it.section, (counts.get(it.section) ?? 0) + 1);
  const minutes = loadSettings().autoLockMinutes;
  const people = counts.get("people") ?? 0;

  return (
    <>
      <PageHeader
        eyebrow="Your Ìrántí"
        title={items.length ? "What your family would find" : "Let's begin"}
      >
        {me?.user.email}
      </PageHeader>

      <Notice tone="safe" className="mb-8">
        <strong className="font-medium">Unlocked on this device.</strong> It locks itself after{" "}
        {minutes} {minutes === 1 ? "minute" : "minutes"} without use. Nothing is shared with anyone.
      </Notice>

      {people === 0 ? (
        <Card className="mb-8">
          <p className="font-mono text-[13px] uppercase tracking-[0.14em] text-accent">Who</p>
          <h2 className="mt-1 text-lg font-medium">Start with who your family should call first</h2>
          <p className="mt-1 text-muted">A name and a phone number is enough for now.</p>
          <Link
            href="/app/item/?new=person"
            className="mt-4 inline-flex min-h-11 items-center rounded-[var(--radius-sm)] bg-accent px-4 font-semibold text-accent-ink"
          >
            Add a person
          </Link>
        </Card>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        {SECTIONS.map((s) => (
          <Link key={s} href={`/app/vault/?section=${s}`} className="group">
            <Card className="h-full transition group-hover:border-accent/50">
              <p className="font-mono text-[12px] uppercase tracking-[0.14em] text-muted">
                {SECTION_LABELS[s].eyebrow}
              </p>
              <h2 className="mt-1 text-[18px] font-medium">{SECTION_LABELS[s].label}</h2>
              <p className="mt-0.5 text-[15px] text-muted">{SECTION_LABELS[s].blurb}</p>
              <p className="mt-3 text-[15px]">{describe(counts.get(s) ?? 0)}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  );
}
