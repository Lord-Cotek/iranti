import { devMailEnabled } from "@/lib/env";
import { json } from "@/lib/http";
import { devMailbox } from "@/lib/mail";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Local development and e2e only: read the last emails sent to an address. Returns 404
 * unless IRANTI_DEV_MAIL=1 and the app is not running on Vercel.
 */
export function GET(request: Request) {
  if (!devMailEnabled()) return json({ error: "not_found" }, 404);
  const to = new URL(request.url).searchParams.get("to") ?? "";
  return json({ messages: devMailbox(to).map((m) => ({ subject: m.subject, text: m.text })) });
}
