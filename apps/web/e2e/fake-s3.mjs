// In-memory S3 stand-in for e2e: PUT/GET/HEAD/DELETE and ListObjectsV2, with CORS so the
// browser can upload straight to it as it would to R2.
import { createServer } from "node:http";

const port = Number(process.argv[2] ?? 9000);
const objects = new Map();
const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,PUT,HEAD,DELETE",
  "access-control-allow-headers": "*",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://x");
  if (req.method === "OPTIONS") return res.writeHead(204, cors).end();
  if (url.pathname === "/" || url.pathname === "/health") return res.writeHead(200, cors).end("ok");
  const [, , ...rest] = url.pathname.split("/");
  const key = decodeURIComponent(rest.join("/"));
  if (req.method === "GET" && url.searchParams.get("list-type") === "2") {
    const prefix = url.searchParams.get("prefix") ?? "";
    const keys = [...objects.keys()].filter((k) => k.startsWith(prefix));
    res.writeHead(200, { ...cors, "content-type": "application/xml" });
    return res.end(
      `<ListBucketResult>${keys.map((k) => `<Contents><Key>${k}</Key></Contents>`).join("")}<IsTruncated>false</IsTruncated></ListBucketResult>`,
    );
  }
  if (req.method === "PUT") {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => {
      objects.set(key, Buffer.concat(chunks));
      res.writeHead(200, cors).end();
    });
    return;
  }
  if (req.method === "DELETE") {
    objects.delete(key);
    return res.writeHead(204, cors).end();
  }
  const obj = objects.get(key);
  if (!obj) return res.writeHead(404, cors).end();
  res.writeHead(200, { ...cors, "content-length": String(obj.length) });
  res.end(req.method === "HEAD" ? undefined : obj);
}).listen(port, () => console.log(`fake-s3 on :${port}`));
