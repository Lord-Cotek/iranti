import type { NextConfig } from "next";

/**
 * Static export (BUILD.md §6.1): the same `out/` is served as the PWA on Vercel and bundled
 * into the Capacitor apps. No server components that need a server at request time, no
 * middleware, no API routes here; those live in apps/api.
 */
const config: NextConfig = {
  output: "export",
  images: { unoptimized: true },
  trailingSlash: true,
  reactStrictMode: true,
  poweredByHeader: false,
  transpilePackages: ["@iranti/ui", "@iranti/core", "@iranti/crypto"],
  // Lint runs as its own CI step with the monorepo config.
  eslint: { ignoreDuringBuilds: true },
};

export default config;
