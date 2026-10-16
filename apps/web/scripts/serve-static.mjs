// Minimal static server for the exported site (e2e and local preview). Mirrors how Vercel
// serves `out/` with trailingSlash: true. Not for production.
import { createReadStream, existsSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { extname, join, normalize, resolve } from "node:path";

const root = resolve(process.argv[2] ?? "out");
const port = Number(process.argv[3] ?? 4173);
const types = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".txt": "text/plain",
};

createServer((req, res) => {
  const url = new URL(req.url ?? "/", "http://localhost");
  let path = normalize(join(root, decodeURIComponent(url.pathname)));
  if (!path.startsWith(root)) {
    res.writeHead(403).end();
    return;
  }
  if (existsSync(path) && statSync(path).isDirectory()) path = join(path, "index.html");
  if (!existsSync(path)) {
    const notFound = join(root, "404.html");
    res.writeHead(404, { "content-type": types[".html"] });
    if (existsSync(notFound)) createReadStream(notFound).pipe(res);
    else res.end("Not found");
    return;
  }
  // next/og images are exported without an extension; Vercel gets the same via vercel.json.
  const isImageRoute = /\/(icon|opengraph-image)(\/[^/.]+)?$/.test(path);
  const type = isImageRoute ? "image/png" : (types[extname(path)] ?? "application/octet-stream");
  res.writeHead(200, { "content-type": type });
  createReadStream(path).pipe(res);
}).listen(port, () => {
  console.log(`Serving ${root} on http://localhost:${port}`);
});
