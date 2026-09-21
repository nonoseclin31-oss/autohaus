import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Prisma client.
 *
 * Cloudflare Workers cannot open a raw TCP socket to Postgres, so queries go
 * through Neon's serverless driver (HTTP/WebSocket) via Prisma's driver
 * adapter. The same adapter works fine on Node during local development, so
 * there is one code path rather than two.
 *
 * A Worker isolate is short-lived and may handle many requests, so the client
 * is cached on globalThis exactly as it is in dev — this also stops Next's hot
 * reload from opening a new pool on every edit.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  const adapter = new PrismaNeon({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
