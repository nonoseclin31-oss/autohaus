import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

/**
 * Prisma client, created on first query rather than on import.
 *
 * The build runs on the host's CI with no DATABASE_URL, and Next imports every
 * route module to collect page data, so the client is built on first property
 * access and never at module load.
 *
 * Cloudflare Workers refuse to let one request touch I/O opened by another:
 * "Cannot perform I/O on behalf of a different request". A client cached on
 * globalThis outlives the request that created it, so the next request on a
 * warm isolate would inherit its Neon connection and throw — mid-render, which
 * left the request hanging until the runtime cancelled it.
 *
 * The cure is to make sure the client holds no connection between requests,
 * rather than to build a client per request: constructing one instantiates the
 * query engine, and on the free plan's CPU budget paying that per request costs
 * more than it saves. With pool queries sent over HTTP, each query is a
 * self-contained fetch and nothing survives the response, so one cached client
 * per isolate is safe.
 */

neonConfig.poolQueryViaFetch = true;

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
  // Cached in development so hot reload does not open a pool per edit, and in
  // production so a warm isolate reuses its engine.
  globalForPrisma.prisma ??= createClient();
  return globalForPrisma.prisma;
}

/**
 * Behaves exactly like a PrismaClient, but the real one is only constructed
 * when a property is first read.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const active = client();
    const value = Reflect.get(active, property, receiver);
    return typeof value === "function" ? value.bind(active) : value;
  },
});
