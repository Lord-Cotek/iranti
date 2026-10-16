import { NextResponse, type NextRequest } from "next/server";
import { allowedOrigins, corsHeaders } from "./src/lib/cors";

/**
 * CORS for every /api route, plus a CSRF guard: a state-changing request that carries an
 * Origin header must come from an allowed origin. (Same-site subdomains share cookies under
 * SameSite=Lax, so cookies alone are not proof of origin.)
 */
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = corsHeaders(origin);

  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers });
  }

  const unsafe = !["GET", "HEAD"].includes(request.method);
  if (unsafe && origin && !allowedOrigins().has(origin)) {
    return NextResponse.json(
      { error: "forbidden_origin", message: "This origin may not make changes." },
      { status: 403, headers },
    );
  }

  const response = NextResponse.next();
  for (const [k, v] of Object.entries(headers)) response.headers.set(k, v);
  return response;
}

export const config = { matcher: "/api/:path*" };
