export const dynamic = "force-static";

export function GET() {
  return Response.json({ service: "iranti-api", health: "/api/health" });
}
