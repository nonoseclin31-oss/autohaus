import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/**
 * Prisma client, created on first query and scoped to the request that asks
 * for it.
 *
 * Two constraints shape this file.
 *
 * The build runs on the host's CI with no DATABASE_URL, and Next imports every
 * route module to collect page data. So the client is built on first property
 * access, never on import.
 *
 * And Cloudflare Workers refuse to let one request touch I/O opened by
 * another: "Cannot perform I/O on behalf of a different request". A client
 * cached on globalThis outlives the request that created it, so the next
 * request on a warm isolate inherits its connection and throws — and because
 * the throw happens inside the streaming render, the request hangs until the
 * runtime cancels it. Concurrent requests on one isolate (Next prefetching a
 * page's links, for instance) hit this reliably.
 *
 * The fix is one client per request, keyed on the execution context, which is
 * also how Prisma's own Workers guidance instantiates it. Outside a Worker —
 * `next dev`, `next build`, seeds — there is no such context and a single
 * cached client is both safe and desirable.
 */

// Send pool queries over HTTP instead of a WebSocket. Each query becomes a
// self-contained fetch, so nothing holds a socket open past the response.
neonConfig.poolQueryViaFetch = true;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Keyed on the Worker's per-request execution context, so entries fall away
// with the request rather than accumulating in the isolate.
const perRequest = new WeakMap<object, PrismaClient>();

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not set");

  return new PrismaClient({
    adapter: new PrismaNeon({ connectionString }),
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

/**
 * The current request's execution context, or undefined when there is no
 * request — during the build, in `next dev`, or in a plain Node script.
 */
function requestScope(): object | undefined {
  try {
    // Synchronous on purpose: this runs on every property access, and the
    // async form would turn `prisma.vehicle` into a promise. Outside a Worker
    // it throws, which is the signal that there is no request to scope to.
    return getCloudflareContext().ctx as unknown as object | undefined;
  } catch {
    return undefined;
  }
}

function client(): PrismaClient {
  const scope = requestScope();

  if (!scope) {
    // No request to scope to. Cache globally so hot reload does not open a
    // pool per edit, and so scripts reuse one client.
    globalForPrisma.prisma ??= createClient();
    return globalForPrisma.prisma;
  }

  let existing = perRequest.get(scope);
  if (!existing) {
    existing = createClient();
    perRequest.set(scope, existing);
  }
  return existing;
}

/**
 * Behaves exactly like a PrismaClient, but the real one is only resolved when
 * a property is first read — and resolves to this request's client.
 */
export const prisma = new Proxy({} as PrismaClient, {
  get(_target, property, receiver) {
    const active = client();
    const value = Reflect.get(active, property, receiver);
    return typeof value === "function" ? value.bind(active) : value;
  },
});
