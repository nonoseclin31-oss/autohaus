import { defineCloudflareConfig } from "@opennextjs/cloudflare";

/**
 * OpenNext adapter config.
 *
 * Defaults are deliberate here: incremental cache and tag revalidation would
 * need a KV namespace and a Durable Object, and every page in this app is
 * either statically prerendered at build or marked `force-dynamic`, so there
 * is nothing for them to cache. Add them later if ISR is introduced.
 */
export default defineCloudflareConfig();
