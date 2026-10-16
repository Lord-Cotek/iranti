"use client";

import { CryptoError } from "@iranti/crypto";
import { ApiError } from "@iranti/core";
import type { ReactNode } from "react";

/** Plain-language message for an error, never exposing internals. */
export function errorMessage(
  e: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (e instanceof ApiError) return e.message;
  if (e instanceof CryptoError) {
    return e.code === "INVALID_INPUT"
      ? e.message
      : "That didn't unlock your vault. Check it and try again.";
  }
  if (e instanceof TypeError) return "We couldn't reach Ìrántí. Check your connection.";
  if (e instanceof Error && e.message && e.message.length < 140) return e.message;
  return fallback;
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-8">
      {eyebrow ? (
        <p className="font-mono text-[13px] font-medium uppercase tracking-[0.14em] text-accent">
          {eyebrow}
        </p>
      ) : null}
      <h1 className="mt-1 font-display text-[clamp(1.9rem,4.5vw,2.6rem)] font-medium leading-tight">
        {title}
      </h1>
      {children ? <div className="mt-3 max-w-[62ch] text-muted">{children}</div> : null}
    </header>
  );
}

export function Quiet({ children }: { children: ReactNode }) {
  return (
    <div
      className="flex min-h-[50dvh] items-center justify-center text-muted"
      role="status"
      aria-live="polite"
    >
      {children}
    </div>
  );
}

export function TierTag({ tier }: { tier: "URGENT" | "FULL" }) {
  return (
    <span className="whitespace-nowrap rounded-full border border-line px-2.5 py-0.5 text-[13px] text-muted">
      {tier === "URGENT" ? "Opens in the first days" : "Opens with everything else"}
    </span>
  );
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30_000);
}
