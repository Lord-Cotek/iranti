import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

// One client per server instance, created on first use so builds and tests without a
// database still work. Neon URLs use the serverless driver (pooled); anything else (local
// Postgres, CI) uses node-postgres.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function isDbConfigured(): boolean {
  return Boolean(env().DATABASE_URL);
}

export function db(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const url = env().DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const adapter = /\.neon\.tech[:/]/.test(url)
    ? new PrismaNeon({ connectionString: url })
    : new PrismaPg({ connectionString: url });
  globalForPrisma.prisma = new PrismaClient({ adapter });
  return globalForPrisma.prisma;
}
