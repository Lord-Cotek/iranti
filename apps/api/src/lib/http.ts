import { ready, verifyProof } from "@iranti/crypto";
import { ZodError, type ZodType } from "zod";
import { auth } from "./auth";
import { db } from "./db";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
  }
}

export function json(body: unknown, status = 200): Response {
  return Response.json(body, { status, headers: { "cache-control": "no-store" } });
}

function isUniqueViolation(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === "P2002";
}

type Handler<C> = (request: Request, ctx: C) => Promise<Response>;

/**
 * Wrap a route handler: typed errors become { error, message } responses; anything else is
 * a 500 with no detail. Request bodies are never logged.
 */
export function route<C>(fn: Handler<C>): Handler<C> {
  return async (request, ctx) => {
    try {
      return await fn(request, ctx);
    } catch (err) {
      if (err instanceof HttpError)
        return json({ error: err.code, message: err.message }, err.status);
      if (isUniqueViolation(err)) {
        return json({ error: "conflict", message: "That already exists." }, 409);
      }
      if (err instanceof ZodError) {
        return json({ error: "invalid_request", message: "The request was not valid." }, 400);
      }
      console.error(
        `api: unhandled ${err instanceof Error ? err.name : "error"} on ${new URL(request.url).pathname}`,
      );
      return json({ error: "server_error", message: "Something went wrong." }, 500);
    }
  };
}

export interface SessionUser {
  id: string;
  email: string;
}

export async function requireUser(request: Request): Promise<SessionUser> {
  const session = await auth().api.getSession({ headers: request.headers });
  if (!session) throw new HttpError(401, "unauthenticated", "Please sign in.");
  return { id: session.user.id, email: session.user.email };
}

/**
 * Read and validate a JSON body, and check the proof-of-unlock signature over the exact
 * body text (CRYPTO.md §3.4). Every vault-changing route goes through here.
 */
export async function requireProof<T>(
  request: Request,
  user: SessionUser,
  schema: ZodType<T> | null,
): Promise<T> {
  const text = await request.text();
  const record = await db().user.findUnique({
    where: { id: user.id },
    select: { unlockPublicKey: true },
  });
  if (!record?.unlockPublicKey) throw new HttpError(409, "not_set_up", "Set up your Ìrántí first.");
  await ready();
  const ok = verifyProof(record.unlockPublicKey, request.headers.get("x-iranti-proof"), {
    userId: user.id,
    method: request.method,
    path: new URL(request.url).pathname,
    body: text,
  });
  if (!ok) throw new HttpError(403, "unlock_required", "Unlock your vault to make changes.");
  if (!schema) return undefined as T;
  let parsed: unknown;
  try {
    parsed = text ? JSON.parse(text) : undefined;
  } catch {
    throw new HttpError(400, "invalid_request", "The request was not valid.");
  }
  return schema.parse(parsed);
}

export async function readJson<T>(request: Request, schema: ZodType<T>): Promise<T> {
  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    throw new HttpError(400, "invalid_request", "The request was not valid.");
  }
  return schema.parse(parsed);
}

export async function requireVault(userId: string) {
  const vault = await db().vault.findUnique({ where: { ownerId: userId } });
  if (!vault) throw new HttpError(409, "not_set_up", "Set up your Ìrántí first.");
  return vault;
}
