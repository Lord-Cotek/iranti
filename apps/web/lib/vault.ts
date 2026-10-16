"use client";

import {
  ApiError,
  isTypeInSection,
  itemTitle,
  openItem,
  sealItem,
  unlockWithPassphrase as engineUnlockPassphrase,
  unlockWithPrf as engineUnlockPrf,
  unlockWithRecoveryCode as engineUnlockRecovery,
  wipeSession,
  type FileRecord,
  type ItemRecord,
  type ItemType,
  type MeResponse,
  type ReleaseTier,
  type Section,
  type SetupResult,
  type UnlockedSession,
} from "@iranti/core";
import { newId, ready } from "@iranti/crypto";
import { useSyncExternalStore } from "react";
import { api, setSigningSession } from "./api";
import { authClient } from "./auth-client";
import { clearOffline, loadOffline, saveOffline } from "./cache";

/**
 * The vault store. Keys live only in this module's memory while unlocked and are wiped on
 * lock. React components read a snapshot through useVault(); they never hold keys.
 */
export type VaultStatus = "loading" | "signed-out" | "needs-setup" | "locked" | "unlocked";

export interface DecryptedItem {
  id: string;
  section: Section;
  type: ItemType;
  tier: ReleaseTier;
  revision: number;
  updatedAt: string;
  payload: Record<string, unknown>;
  title: string;
  /** Decryption failed: shown as unreadable instead of breaking the vault. */
  unreadable?: boolean;
}

export interface VaultState {
  status: VaultStatus;
  offline: boolean;
  me: MeResponse | null;
  items: DecryptedItem[];
  files: FileRecord[];
}

let session: UnlockedSession | null = null;
let records: ItemRecord[] = [];
let state: VaultState = { status: "loading", offline: false, me: null, items: [], files: [] };
const listeners = new Set<() => void>();

function setState(patch: Partial<VaultState>) {
  state = { ...state, ...patch };
  for (const l of listeners) l();
}

export function useVault(): VaultState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
    () => state,
    () => state,
  );
}

export function getSession(): UnlockedSession | null {
  return session;
}

function decryptAll(s: UnlockedSession, list: ItemRecord[]): DecryptedItem[] {
  return list.map((r) => {
    const base = {
      id: r.id,
      section: r.section,
      type: r.type as ItemType,
      tier: r.tier,
      revision: r.revision,
      updatedAt: r.updatedAt,
    };
    try {
      if (!isTypeInSection(r.section, r.type)) throw new Error("unknown type");
      const payload = openItem(s, r) as Record<string, unknown>;
      return { ...base, payload, title: itemTitle(r.type as ItemType, payload) };
    } catch {
      return { ...base, payload: {}, title: "Unreadable item", unreadable: true };
    }
  });
}

async function persist() {
  if (state.me)
    await saveOffline({
      me: state.me,
      items: records,
      files: state.files,
      savedAt: new Date().toISOString(),
    });
}

/** Load account state from the API, or from the offline copy when there is no network. */
export async function initVault(): Promise<void> {
  await ready();
  let me: MeResponse;
  try {
    me = await api.me();
  } catch (e) {
    if (e instanceof ApiError && e.status === 401) {
      lockVault();
      setState({ status: "signed-out", me: null, items: [], files: [], offline: false });
      return;
    }
    const copy = await loadOffline();
    if (copy?.me.vault) {
      records = copy.items;
      setState({
        me: copy.me,
        files: copy.files,
        offline: true,
        status: session ? "unlocked" : "locked",
      });
      return;
    }
    throw e;
  }
  if (session && session.userId !== me.user.id) lockVault();
  if (!me.vault) {
    setState({ status: "needs-setup", me, offline: false });
    return;
  }
  const [{ items }, { files }] = await Promise.all([api.items(), api.files()]);
  records = items;
  setState({ me, files, offline: false });
  await persist();
  if (session) setState({ status: "unlocked", items: decryptAll(session, records) });
  else setState({ status: "locked", items: [] });
}

function adopt(s: UnlockedSession) {
  if (session && session !== s) wipeSession(session);
  session = s;
  setSigningSession(s);
  setState({ status: "unlocked", items: decryptAll(s, records) });
}

function requireMe(): MeResponse {
  if (!state.me) throw new Error("Not signed in");
  return state.me;
}

export async function unlockWithPassphrase(passphrase: string): Promise<void> {
  adopt(await engineUnlockPassphrase(requireMe(), passphrase));
}

export async function unlockWithRecoveryCode(code: string): Promise<void> {
  adopt(await engineUnlockRecovery(requireMe(), code));
}

export async function unlockWithPrf(prf: Uint8Array, credentialId?: string): Promise<void> {
  adopt(await engineUnlockPrf(requireMe(), prf, credentialId));
}

/** Forget all keys and decrypted content. */
export function lockVault(): void {
  if (session) wipeSession(session);
  session = null;
  setSigningSession(null);
  if (state.status === "unlocked") setState({ status: "locked", items: [] });
}

export async function signOut(): Promise<void> {
  lockVault();
  await authClient.signOut().catch(() => undefined);
  await clearOffline();
  records = [];
  setState({ status: "signed-out", me: null, items: [], files: [] });
}

/** Store the keys made at setup, then continue unlocked. */
export async function completeSetup(result: SetupResult): Promise<void> {
  await api.setup(result.request);
  const me = await api.me();
  records = [];
  setState({ me, files: [], offline: false });
  adopt(result.session);
  await persist();
}

export async function refreshMe(): Promise<void> {
  const me = await api.me();
  setState({ me });
  await persist();
}

export interface ItemDraft {
  id?: string;
  section: Section;
  type: ItemType;
  tier: ReleaseTier;
  payload: Record<string, unknown>;
}

/** Encrypt and save an item; returns its id. */
export async function saveItem(draft: ItemDraft): Promise<string> {
  if (!session) throw new Error("Vault is locked");
  const id = draft.id ?? newId();
  const existing = records.find((r) => r.id === id);
  const revision = existing ? existing.revision + 1 : 1;
  const saved = await api.putItem(id, sealItem(session, { ...draft, id, revision }));
  records = existing ? records.map((r) => (r.id === id ? saved : r)) : [...records, saved];
  setState({ items: decryptAll(session, records) });
  await persist();
  return id;
}

export async function deleteItem(id: string): Promise<void> {
  await api.deleteItem(id);
  records = records.filter((r) => r.id !== id);
  const files = state.files.filter((f) => f.itemId !== id);
  setState({ items: session ? decryptAll(session, records) : [], files });
  await persist();
}

export async function reloadFiles(): Promise<void> {
  const { files } = await api.files();
  setState({ files });
  await persist();
}
