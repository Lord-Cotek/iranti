"use client";

import { loadSettings } from "./settings";

/**
 * Auto-lock (BUILD.md §16 Phase 1): lock after a period without interaction, and optionally
 * when the tab is hidden. Returns a cleanup function.
 */
export function startAutoLock(lock: () => void): () => void {
  const { autoLockMinutes, lockOnHide } = loadSettings();
  const ms = autoLockMinutes * 60_000;
  let timer = window.setTimeout(lock, ms);
  const reset = () => {
    window.clearTimeout(timer);
    timer = window.setTimeout(lock, ms);
  };
  const events = ["pointerdown", "keydown", "scroll", "touchstart"] as const;
  for (const e of events) window.addEventListener(e, reset, { passive: true });
  const onVisibility = () => {
    if (lockOnHide && document.visibilityState === "hidden") lock();
  };
  document.addEventListener("visibilitychange", onVisibility);
  return () => {
    window.clearTimeout(timer);
    for (const e of events) window.removeEventListener(e, reset);
    document.removeEventListener("visibilitychange", onVisibility);
  };
}
