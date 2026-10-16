import { z } from "zod";
import {
  FileDownloadResponse,
  FilesResponse,
  FileUploadResponse,
  ItemRecord,
  ItemsResponse,
  MeResponse,
  Envelope,
  type EnvelopeInput,
  type FileCreate,
  type ItemUpsert,
  type SetupRequest,
} from "./dto";

/** Response of GET /api/health on apps/api. */
export const HealthResponse = z.object({
  status: z.enum(["ok", "degraded"]),
  service: z.literal("iranti-api"),
  version: z.string(),
  time: z.string(),
  db: z.enum(["ok", "unconfigured", "error"]),
});
export type HealthResponse = z.infer<typeof HealthResponse>;

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiClientOptions {
  baseUrl: string;
  /** Bearer token for Capacitor; web uses the httpOnly session cookie instead. */
  getToken?: () => string | null | Promise<string | null>;
  fetch?: typeof fetch;
  /**
   * Proof-of-unlock signer (CRYPTO.md §3.4). Called for every request that changes data;
   * returns the X-Iranti-Proof header value, or null when the vault is locked.
   */
  sign?: (method: string, path: string, body: string) => string | null | Promise<string | null>;
}

const Ok = z.object({ ok: z.literal(true) });

/**
 * Typed fetch wrapper. Every response is parsed with its Zod schema so a server change
 * cannot silently hand the UI an unexpected shape. Errors arrive as { error, message }.
 */
export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const base = options.baseUrl.replace(/\/+$/, "");

  async function request<T>(
    method: string,
    path: string,
    schema: z.ZodType<T>,
    body?: unknown,
    allowStatus: number[] = [],
  ): Promise<T> {
    const headers = new Headers({ accept: "application/json" });
    if (body !== undefined) headers.set("content-type", "application/json");
    const token = await options.getToken?.();
    if (token) headers.set("authorization", `Bearer ${token}`);

    const text = body === undefined ? undefined : JSON.stringify(body);
    if (method !== "GET" && options.sign) {
      const proof = await options.sign(method, path.split("?")[0]!, text ?? "");
      if (proof) headers.set("x-iranti-proof", proof);
    }
    const res = await doFetch(`${base}${path}`, {
      method,
      headers,
      credentials: "include",
      body: text,
    });
    const json: unknown = await res.json().catch(() => null);
    if (!res.ok && !allowStatus.includes(res.status)) {
      const err = (json ?? {}) as { error?: string; message?: string };
      throw new ApiError(
        res.status,
        err.error ?? "http_error",
        err.message ?? `Request failed (${res.status})`,
      );
    }
    return schema.parse(json);
  }

  return {
    health: () => request("GET", "/api/health", HealthResponse, undefined, [503]),
    me: () => request("GET", "/api/me", MeResponse),
    setup: (body: SetupRequest) => request("POST", "/api/setup", Ok, body),
    addEnvelope: (body: EnvelopeInput) => request("POST", "/api/envelopes", Envelope, body),
    revokeEnvelope: (id: string) => request("DELETE", `/api/envelopes/${id}`, Ok),
    items: () => request("GET", "/api/vault/items", ItemsResponse),
    putItem: (id: string, body: ItemUpsert) =>
      request("PUT", `/api/vault/items/${id}`, ItemRecord, body),
    deleteItem: (id: string) => request("DELETE", `/api/vault/items/${id}`, Ok),
    files: () => request("GET", "/api/vault/files", FilesResponse),
    createFile: (body: FileCreate) => request("POST", "/api/vault/files", FileUploadResponse, body),
    completeFile: (id: string) => request("POST", `/api/vault/files/${id}/complete`, Ok),
    downloadFile: (id: string) => request("GET", `/api/vault/files/${id}`, FileDownloadResponse),
    deleteFile: (id: string) => request("DELETE", `/api/vault/files/${id}`, Ok),
    deleteAccount: () =>
      request("POST", "/api/account/delete", Ok, { confirm: "delete my account" }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
