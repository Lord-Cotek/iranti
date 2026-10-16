import { AwsClient } from "aws4fetch";
import { env } from "./env";

/**
 * Cloudflare R2 (S3-compatible). Only encrypted chunks are ever stored. Uploads and
 * downloads go straight from the device to R2 with short-lived presigned URLs.
 */
const URL_TTL_SECONDS = 15 * 60;

function client() {
  const e = env();
  if (!e.R2_ACCESS_KEY_ID || !e.R2_SECRET_ACCESS_KEY || (!e.R2_ACCOUNT_ID && !e.R2_ENDPOINT)) {
    return null;
  }
  const endpoint = e.R2_ENDPOINT ?? `https://${e.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;
  return {
    aws: new AwsClient({
      accessKeyId: e.R2_ACCESS_KEY_ID,
      secretAccessKey: e.R2_SECRET_ACCESS_KEY,
      service: "s3",
      region: "auto",
    }),
    base: `${endpoint.replace(/\/+$/, "")}/${e.R2_BUCKET}`,
  };
}

export function isStorageConfigured(): boolean {
  return client() !== null;
}

function required() {
  const c = client();
  if (!c) throw new Error("R2 is not configured");
  return c;
}

export function chunkKey(r2Key: string, index: number): string {
  return `${r2Key}/${index}`;
}

async function presign(method: "PUT" | "GET", key: string): Promise<string> {
  const { aws, base } = required();
  const url = new URL(`${base}/${key}`);
  url.searchParams.set("X-Amz-Expires", String(URL_TTL_SECONDS));
  const signed = await aws.sign(new Request(url, { method }), { aws: { signQuery: true } });
  return signed.url;
}

export const presignPut = (key: string) => presign("PUT", key);
export const presignGet = (key: string) => presign("GET", key);

export async function objectExists(key: string): Promise<boolean> {
  const { aws, base } = required();
  const res = await aws.fetch(`${base}/${key}`, { method: "HEAD" });
  return res.ok;
}

/** Delete every object under a prefix (a file, or a whole vault on account deletion). */
export async function deletePrefix(prefix: string): Promise<void> {
  const c = client();
  if (!c) return;
  for (;;) {
    const list = await c.aws.fetch(
      `${c.base}?list-type=2&prefix=${encodeURIComponent(prefix)}&max-keys=1000`,
    );
    if (!list.ok) throw new Error(`R2 list failed (${list.status})`);
    const xml = await list.text();
    const keys = [...xml.matchAll(/<Key>([^<]+)<\/Key>/g)].map((m) => m[1]!);
    if (keys.length === 0) return;
    for (const key of keys) {
      const res = await c.aws.fetch(`${c.base}/${key}`, { method: "DELETE" });
      if (!res.ok && res.status !== 404) throw new Error(`R2 delete failed (${res.status})`);
    }
    if (!/<IsTruncated>true<\/IsTruncated>/.test(xml)) return;
  }
}
