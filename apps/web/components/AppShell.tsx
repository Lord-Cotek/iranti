"use client";

import { Mark } from "@iranti/ui";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { startAutoLock } from "@/lib/autolock";
import { initVault, lockVault, useVault } from "@/lib/vault";
import { Quiet } from "./ui";
import { UnlockScreen } from "./UnlockScreen";

const NAV = [
  { href: "/app/", label: "Home" },
  { href: "/app/vault/", label: "Vault" },
  { href: "/app/settings/", label: "Settings" },
];

/**
 * Guards every /app page: signed out → sign-in; no keys yet → setup; locked → unlock.
 * Children render only when unlocked (or during setup).
 */
export function AppShell({ children }: { children: ReactNode }) {
  const vault = useVault();
  const pathname = usePathname();
  const router = useRouter();
  const [loadError, setLoadError] = useState<string | null>(null);
  const isSetup = pathname.startsWith("/app/setup");

  useEffect(() => {
    if (vault.status === "loading") {
      initVault().catch(() =>
        setLoadError("We couldn't reach Ìrántí. Check your connection and reload."),
      );
    }
  }, [vault.status]);

  useEffect(() => {
    if (vault.status === "signed-out") router.replace("/signin/");
    else if (vault.status === "needs-setup" && !isSetup) router.replace("/app/setup/");
  }, [vault.status, isSetup, router]);

  useEffect(() => {
    if (vault.status !== "unlocked") return;
    return startAutoLock(lockVault);
  }, [vault.status]);

  if (loadError) return <Quiet>{loadError}</Quiet>;
  if (vault.status === "loading" || vault.status === "signed-out") return <Quiet>Opening…</Quiet>;
  if (isSetup) return <>{children}</>;
  if (vault.status === "needs-setup") return <Quiet>Opening…</Quiet>;
  if (vault.status === "locked") return <UnlockScreen />;

  return (
    <div className="min-h-dvh">
      <header className="sticky top-0 z-10 border-b border-line bg-bg/90 backdrop-blur">
        <div className="mx-auto flex max-w-4xl items-center gap-3 px-4 py-3">
          <Link href="/app/" className="flex items-center gap-2" aria-label="Ìrántí home">
            <Mark size={26} />
            <span className="hidden font-display text-lg sm:inline">Ìrántí</span>
          </Link>
          <nav aria-label="Main" className="ms-2 flex gap-1">
            {NAV.map((n) => {
              const active =
                n.href === "/app/"
                  ? pathname === "/app" || pathname === "/app/"
                  : pathname.startsWith(n.href.slice(0, -1));
              return (
                <Link
                  key={n.href}
                  href={n.href}
                  aria-current={active ? "page" : undefined}
                  className={`rounded-[9px] px-3 py-1.5 text-[15px] ${active ? "bg-raise text-ink" : "text-muted hover:text-ink"}`}
                >
                  {n.label}
                </Link>
              );
            })}
          </nav>
          <button
            type="button"
            onClick={lockVault}
            className="ms-auto rounded-[9px] border border-line px-3 py-1.5 text-[15px] text-muted hover:text-ink"
          >
            Lock
          </button>
        </div>
        {vault.offline ? (
          <p className="bg-raise px-4 py-1.5 text-center text-[14px] text-muted">
            Offline. Showing what was last synced; changes need a connection.
          </p>
        ) : null}
      </header>
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8">{children}</main>
    </div>
  );
}
