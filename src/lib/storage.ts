import { randomUUID } from "node:crypto";

/**
 * Where uploaded images live.
 *
 * On Cloudflare Workers the filesystem is read-only and there is no `public/`
 * to write into, so uploads go to an R2 bucket bound to the Worker as
 * `MEDIA`. Locally there is no binding, so they go to `public/` instead and
 * development needs no Cloudflare account.
 *
 * `node:fs` is imported dynamically and only inside the local branch — a
 * static import would be pulled into the Workers bundle, where it does not
 * exist, and the build would fail.
 *
 * To read the objects back out, R2 is exposed either on its r2.dev public URL
 * or on a custom domain; whichever is configured goes in R2_PUBLIC_URL.
 */

export type UploadKind = "vehicle" | "avatar";

const FOLDER: Record<UploadKind, string> = {
  vehicle: "uploads",
  avatar: "avatars",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

/**
 * What the server will store. Wider than what a browser can display, because
 * phones hand over HEIC and cameras hand over TIFF: the uploader converts
 * those to WebP before they get here, and this list is the safety net for the
 * cases where it cannot (an unusual browser, a file it fails to decode).
 */
export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/jpg": "jpg",
  "image/pjpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
  "image/bmp": "bmp",
  "image/tiff": "tiff",
  "image/heic": "heic",
  "image/heif": "heif",
};

type R2Bucket = {
  put(key: string, value: ArrayBuffer, options?: { httpMetadata?: { contentType?: string } }): Promise<unknown>;
  delete(key: string): Promise<void>;
};

/** The R2 binding, or null when running outside Workers (i.e. local dev). */
async function getBucket(): Promise<R2Bucket | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const bucket = (ctx.env as Record<string, unknown>)?.MEDIA;
    return (bucket as R2Bucket) ?? null;
  } catch {
    return null;
  }
}

function publicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
  if (!base) throw new Error("R2_PUBLIC_URL is not set");
  return `${base}/${key}`;
}

/** Stores one image and returns the URL to render it from. */
export async function putObject(file: File, kind: UploadKind): Promise<{ url: string }> {
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) throw new Error("unsupported-type");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("too-large");

  const folder = FOLDER[kind];
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;
  const key = `${folder}/${filename}`;

  const bucket = await getBucket();
  if (bucket) {
    await bucket.put(key, await file.arrayBuffer(), {
      httpMetadata: { contentType: file.type },
    });
    return { url: publicUrl(key) };
  }

  // Local development: write into public/ so the dev server serves it back.
  const { writeFile, mkdir } = await import("node:fs/promises");
  const path = await import("node:path");
  const dir = path.join(process.cwd(), "public", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return { url: `/${key}` };
}

/** Best-effort delete. Never throws — a stale object is not worth failing a request. */
export async function deleteObject(url: string): Promise<void> {
  try {
    const bucket = await getBucket();
    if (bucket) {
      const base = process.env.R2_PUBLIC_URL?.replace(/\/$/, "");
      if (!base || !url.startsWith(base)) return;
      await bucket.delete(url.slice(base.length + 1));
      return;
    }

    const relative = url.replace(/^\//, "");
    if (!relative.startsWith("uploads/") && !relative.startsWith("avatars/")) return;
    const { unlink } = await import("node:fs/promises");
    const path = await import("node:path");
    await unlink(path.join(process.cwd(), "public", relative));
  } catch {
    // ignore
  }
}
