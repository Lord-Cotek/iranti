import { createApiClient, proofHeader, type UnlockedSession } from "@iranti/core";
import { API_URL } from "./config";

let currentSession: UnlockedSession | null = null;

/** The vault store tells the API client which unlocked session (if any) signs changes. */
export function setSigningSession(session: UnlockedSession | null): void {
  currentSession = session;
}

export const api = createApiClient({
  baseUrl: API_URL,
  sign: (method, path, body) =>
    currentSession ? proofHeader(currentSession, method, path, body) : null,
});
