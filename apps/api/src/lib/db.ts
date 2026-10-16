import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "../generated/prisma/client";
import { env } from "./env";

// One client per server instance. Created on first use so builds and tests without a
// database still work. Runtime traffic uses the pooled Neon URL.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export function isDbConfigured(): boolean {
  return Boolean(env().DATABASE_URL);
}

export function db(): PrismaClient {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;
  const url = env().DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const client = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });
  globalForPrisma.prisma = client;
  return client;
}
