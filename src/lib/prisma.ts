import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";

/**
 * Prisma client, created on first query rather than on import.
 *
 * Two reasons for the laziness. The build runs on the host's CI with no
 * DATABASE_URL, and Next imports every route module to collect page data — an
 * eager client would throw there and fail the build. And on Workers, an
 * isolate that never touches the database should never pay to construct one.
 *
 * Cloudflare Workers cannot open a raw TCP socket to Postgres, so queries go
 * through Neon's serverless driver via Prisma's driver adapter. The same
 * adapter works on Node, so there is one code path rather than two.
 */

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function client(): PrismaClient {
  if (!globalForPrisma.prisma) {
    const created = createClient();
    // Cache in dev so hot reload does not open a pool per edit; cache in
    // production so a warm isolate reuses its connection.
    globalForPrisma.prisma = created;
  }
  return globalForPrisma.prisma;
}

/**
 * Behaves exactly like a PrismaClient, but the real one is only constructed
 * when a property is first read.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const value = Reflect.get(client(), property, receiver);
    return typeof value === "function" ? value.bind(client()) : value;
  },
});
