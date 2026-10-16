import { sodium } from "./sodium";

/** Constant-time equality for secrets (BUILD.md §8.6). Unequal lengths return false. */
export function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return sodium().memcmp(a, b);
}

/** Best-effort wipe of key material. JS cannot guarantee erasure; see docs/CRYPTO.md §9. */
export function wipe(bytes: Uint8Array): void {
  sodium().memzero(bytes);
}
