import { createApiClient, proofHeader, type UnlockedSession } from "@iranti/core";
import * as authRoute from "../../app/api/auth/[...all]/route";
import * as accountDelete from "../../app/api/account/delete/route";
import * as devMail from "../../app/api/dev/mail/route";
import * as envelopeId from "../../app/api/envelopes/[id]/route";
import * as envelopes from "../../app/api/envelopes/route";
import * as me from "../../app/api/me/route";
import * as setup from "../../app/api/setup/route";
import * as fileComplete from "../../app/api/vault/files/[id]/complete/route";
import * as fileId from "../../app/api/vault/files/[id]/route";
import * as files from "../../app/api/vault/files/route";
import * as itemId from "../../app/api/vault/items/[id]/route";
import * as items from "../../app/api/vault/items/route";

type Mod = Record<string, unknown>;
const ROUTES: Array<[RegExp, Mod]> = [
  [/^\/api\/auth\/.+$/, authRoute],
  [/^\/api\/me$/, me],
  [/^\/api\/setup$/, setup],
  [/^\/api\/envelopes$/, envelopes],
  [/^\/api\/envelopes\/(?<id>[^/]+)$/, envelopeId],
  [/^\/api\/vault\/items$/, items],
  [/^\/api\/vault\/items\/(?<id>[^/]+)$/, itemId],
  [/^\/api\/vault\/files$/, files],
  [/^\/api\/vault\/files\/(?<id>[^/]+)\/complete$/, fileComplete],
  [/^\/api\/vault\/files\/(?<id>[^/]+)$/, fileId],
  [/^\/api\/account\/delete$/, accountDelete],
  [/^\/api\/dev\/mail$/, devMail],
];

/** Dispatch a Request to the matching route module, as Next would. */
export async function dispatch(request: Request): Promise<Response> {
  const path = new URL(request.url).pathname;
  for (const [re, mod] of ROUTES) {
    const m = re.exec(path);
    if (!m) continue;
    const handler = mod[request.method] as
      | ((r: Request, ctx: { params: Promise<Record<string, string>> }) => Promise<Response>)
      | undefined;
    if (!handler) return new Response(null, { status: 405 });
    return handler(request, { params: Promise.resolve({ ...(m.groups ?? {}) }) });
  }
  return new Response(null, { status: 404 });
}

/** A browser-like client: keeps the session cookie, sends Origin, signs when unlocked. */
export function testClient(ip: string) {
  let cookie = "";
  let session: UnlockedSession | null = null;
  const fetchImpl: typeof fetch = async (input, init) => {
    const headers = new Headers(init?.headers);
    headers.set("origin", "http://localhost:3000");
    headers.set("x-forwarded-for", ip);
    if (cookie) headers.set("cookie", cookie);
    const res = await dispatch(new Request(String(input), { ...init, headers }));
    const setCookies = res.headers.getSetCookie();
    if (setCookies.length) {
      const jar = new Map(
        cookie
          .split("; ")
          .filter(Boolean)
          .map((c) => c.split("=") as [string, string]),
      );
      for (const sc of setCookies) {
        const [pair] = sc.split(";");
        const [k, ...v] = pair!.split("=");
        jar.set(k!, v.join("="));
      }
      cookie = [...jar].map(([k, v]) => `${k}=${v}`).join("; ");
    }
    return res;
  };
  const api = createApiClient({
    baseUrl: "http://localhost:3001",
    fetch: fetchImpl,
    sign: (method, path, body) => (session ? proofHeader(session, method, path, body) : null),
  });
  return {
    api,
    fetch: fetchImpl,
    setSession: (s: UnlockedSession | null) => {
      session = s;
    },
    clearCookie: () => {
      cookie = "";
    },
    async signIn(email: string): Promise<string> {
      const post = (path: string, body: unknown) =>
        fetchImpl(`http://localhost:3001${path}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(body),
        });
      const sent = await post("/api/auth/email-otp/send-verification-otp", {
        email,
        type: "sign-in",
      });
      if (!sent.ok) throw new Error(`send otp failed ${sent.status}`);
      const mail = await (
        await fetchImpl(`http://localhost:3001/api/dev/mail?to=${encodeURIComponent(email)}`)
      ).json();
      const code = /code is (\d{6})/.exec(mail.messages.at(-1).text)![1]!;
      const res = await post("/api/auth/sign-in/email-otp", { email, otp: code });
      if (!res.ok) throw new Error(`sign in failed ${res.status}`);
      return code;
    },
  };
}
