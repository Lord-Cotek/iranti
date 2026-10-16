import { env } from "./env";

/**
 * Exact-match origin allowlist: the web origin and the Capacitor webview origins. Web
 * uses cookies (credentials), so the origin is echoed, never "*".
 */
export function allowedOrigins(): Set<string> {
  const e = env();
  return new Set(
    [e.WEB_ORIGIN, ...e.CAPACITOR_ORIGINS.split(",")].map((o) => o.trim()).filter(Boolean),
  );
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = { Vary: "Origin" };
  if (origin && allowedOrigins().has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "true";
    headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS";
    headers["Access-Control-Allow-Headers"] = "authorization,content-type";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}

export function preflight(request: Request): Response {
  return new Response(null, { status: 204, headers: corsHeaders(request.headers.get("origin")) });
}

export function json(request: Request, body: unknown, init: ResponseInit = {}): Response {
  const headers = new Headers(init.headers);
  for (const [k, v] of Object.entries(corsHeaders(request.headers.get("origin")))) {
    headers.set(k, v);
  }
  headers.set("content-type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(body), { ...init, headers });
}
