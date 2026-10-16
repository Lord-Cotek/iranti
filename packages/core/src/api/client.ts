import { z } from "zod";

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
}

/**
 * Typed fetch wrapper. Every response is parsed with its Zod schema so a server change
 * cannot silently hand the UI an unexpected shape.
 */
export function createApiClient(options: ApiClientOptions) {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const base = options.baseUrl.replace(/\/+$/, "");

  async function request<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}) {
    const headers = new Headers(init.headers);
    headers.set("accept", "application/json");
    const token = await options.getToken?.();
    if (token) headers.set("authorization", `Bearer ${token}`);

    const res = await doFetch(`${base}${path}`, { ...init, headers, credentials: "include" });
    const body: unknown = await res.json().catch(() => null);
    if (!res.ok && res.status !== 503) {
      throw new ApiError(res.status, `Request to ${path} failed with ${res.status}`);
    }
    return schema.parse(body);
  }

  return {
    health: () => request("/api/health", HealthResponse),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
