import type { FileRecord, ItemRecord, MeResponse } from "@iranti/core";
import { del, get, set } from "idb-keyval";

/**
 * Offline copy of what the server holds, all of it ciphertext or wrapped keys (BUILD.md
 * §6.3). With it, a device can unlock and read the vault without a network, as long as
 * the person has their passphrase, recovery code or passkey.
 */
export interface OfflineCopy {
  me: MeResponse;
  items: ItemRecord[];
  files: FileRecord[];
  savedAt: string;
}

const LAST_USER = "iranti:last-user";
const key = (userId: string) => `iranti:vault:${userId}`;

export async function saveOffline(copy: OfflineCopy): Promise<void> {
  try {
    await set(key(copy.me.user.id), copy);
    await set(LAST_USER, copy.me.user.id);
  } catch {
    // IndexedDB unavailable (private mode): the app still works online.
  }
}

export async function loadOffline(): Promise<OfflineCopy | null> {
  try {
    const userId = await get<string>(LAST_USER);
    return userId ? ((await get<OfflineCopy>(key(userId))) ?? null) : null;
  } catch {
    return null;
  }
}

export async function clearOffline(): Promise<void> {
  try {
    const userId = await get<string>(LAST_USER);
    if (userId) await del(key(userId));
    await del(LAST_USER);
  } catch {
    // nothing to clear
  }
}
