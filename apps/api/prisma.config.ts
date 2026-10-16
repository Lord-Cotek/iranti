import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

// Prisma 7 no longer reads .env itself. Load it for local work; Vercel injects real env.
if (existsSync(".env")) process.loadEnvFile(".env");

// Prisma 7: connection URLs live here, not in schema.prisma. The CLI (migrate, studio)
// uses the direct (unpooled) Neon URL; the runtime client uses the pooled DATABASE_URL via
// the Neon driver adapter (src/lib/db.ts). `generate` needs no database, so an unset URL is
// allowed here and only fails when a command actually connects.
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  datasource: { url: process.env.DIRECT_URL ?? process.env.DATABASE_URL ?? "" },
});
