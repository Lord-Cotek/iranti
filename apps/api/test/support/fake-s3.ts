import { createServer, type Server } from "node:http";
import type { AddressInfo } from "node:net";

/** A tiny in-memory S3 stand-in: PUT, GET, HEAD, DELETE and ListObjectsV2 by prefix. */
export async function startFakeS3(): Promise<{
  url: string;
  objects: Map<string, Buffer>;
  close: () => Promise<void>;
}> {
  const objects = new Map<string, Buffer>();
  const server: Server = createServer((req, res) => {
    const url = new URL(req.url ?? "/", "http://x");
    const [, , ...rest] = url.pathname.split("/"); // /<bucket>/<key...>
    const key = decodeURIComponent(rest.join("/"));
    if (req.method === "GET" && url.searchParams.get("list-type") === "2") {
      const prefix = url.searchParams.get("prefix") ?? "";
      const keys = [...objects.keys()].filter((k) => k.startsWith(prefix));
      res.writeHead(200, { "content-type": "application/xml" });
      res.end(
        `<ListBucketResult>${keys.map((k) => `<Contents><Key>${k}</Key></Contents>`).join("")}<IsTruncated>false</IsTruncated></ListBucketResult>`,
      );
      return;
    }
    if (req.method === "PUT") {
      const chunks: Buffer[] = [];
      req.on("data", (c: Buffer) => chunks.push(c));
      req.on("end", () => {
        objects.set(key, Buffer.concat(chunks));
        res.writeHead(200).end();
      });
      return;
    }
    const obj = objects.get(key);
    if (req.method === "DELETE") {
      objects.delete(key);
      res.writeHead(204).end();
      return;
    }
    if (!obj) {
      res.writeHead(404).end();
      return;
    }
    res.writeHead(200, { "content-length": String(obj.length) });
    res.end(req.method === "HEAD" ? undefined : obj);
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  const { port } = server.address() as AddressInfo;
  return {
    url: `http://127.0.0.1:${port}`,
    objects,
    close: () => new Promise((r) => server.close(() => r())),
  };
}
