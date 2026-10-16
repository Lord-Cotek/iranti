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
    headers["Access-Control-Allow-Headers"] = "authorization,content-type,x-iranti-proof";
    headers["Access-Control-Max-Age"] = "600";
  }
  return headers;
}
