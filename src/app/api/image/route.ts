import { getCurrentUser } from "@/lib/auth";

/**
 * Reads a stored image back, from this origin.
 *
 * The crop tool draws a photo into a canvas and reads the pixels out again.
 * A browser refuses that for an image fetched from another origin without
 * CORS headers, and the R2 bucket sends none — so a photo already on a
 * listing could be displayed but never re-cropped. This hands the same bytes
 * back from here, where the canvas is allowed to read them.
 *
 * Only signed-in staff, and only images this site actually stored: the target
 * must be site-relative, or share an origin with the configured bucket. The
 * comparison is on the parsed origin rather than a string prefix, so no
 * `https://bucket.example.com.attacker.net/` can slip past it and turn this
 * into a request forwarder.
 */

/** What a stored image may be. Anything else is not ours to hand back. */
const IMAGE = /^image\//;

/** Site-relative folders this origin serves itself. */
const LOCAL = ["/uploads/", "/samples/", "/avatars/", "/brand/"];

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return new Response("unauthenticated", { status: 401 });

  const target = new URL(request.url).searchParams.get("url") ?? "";
  if (!target) return new Response("missing-url", { status: 400 });

  let source: string;

  if (LOCAL.some((folder) => target.startsWith(folder))) {
    source = new URL(target, new URL(request.url).origin).toString();
  } else {
    const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
    if (!base) return new Response("forbidden", { status: 403 });
    let asked: URL;
    let allowed: URL;
    try {
      asked = new URL(target);
      allowed = new URL(base);
    } catch {
      return new Response("bad-url", { status: 400 });
    }
    if (asked.origin !== allowed.origin) return new Response("forbidden", { status: 403 });
    source = asked.toString();
  }

  const upstream = await fetch(source).catch(() => null);
  if (!upstream?.ok) return new Response("not-found", { status: 404 });

  const type = upstream.headers.get("content-type") ?? "";
  if (!IMAGE.test(type)) return new Response("not-an-image", { status: 415 });

  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      // Staff-only and short-lived: the tool fetches each photo once per edit.
      "cache-control": "private, max-age=60",
    },
  });
}
