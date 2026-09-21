import { writeFile, mkdir, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

/**
 * Where uploaded images live.
 *
 * Hosts like Vercel have a read-only, ephemeral filesystem: anything written
 * to `public/` disappears on the next deploy. So in production we push to
 * Vercel Blob, and locally we keep writing to `public/` so development needs
 * no account and no credentials.
 *
 * The switch is the presence of BLOB_READ_WRITE_TOKEN, which Vercel injects
 * automatically once a Blob store is attached to the project. To move to a
 * different provider later (Cloudflare R2, S3, Supabase Storage), only
 * `putObject` and `deleteObject` below need to change.
 */

export type UploadKind = "vehicle" | "avatar";

const FOLDER: Record<UploadKind, string> = {
  vehicle: "uploads",
  avatar: "avatars",
};

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

export const ALLOWED_IMAGE_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

export function usingBlobStore(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Stores one image and returns the URL to render it from. */
export async function putObject(
  file: File,
  kind: UploadKind,
): Promise<{ url: string }> {
  const extension = ALLOWED_IMAGE_TYPES[file.type];
  if (!extension) throw new Error("unsupported-type");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("too-large");

  const folder = FOLDER[kind];
  const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${extension}`;

  if (usingBlobStore()) {
    const { put } = await import("@vercel/blob");
    const blob = await put(`${folder}/${filename}`, file, {
      access: "public",
      contentType: file.type,
      // the filename already carries a uuid, so keep the path predictable
      addRandomSuffix: false,
    });
    return { url: blob.url };
  }

  const dir = path.join(process.cwd(), "public", folder);
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, filename), Buffer.from(await file.arrayBuffer()));
  return { url: `/${folder}/${filename}` };
}

/** Best-effort delete. Never throws — a stale file is not worth failing a request. */
export async function deleteObject(url: string): Promise<void> {
  try {
    if (url.startsWith("http")) {
      if (!usingBlobStore()) return;
      const { del } = await import("@vercel/blob");
      await del(url);
      return;
    }
    // local path such as /uploads/123.jpg
    const relative = url.replace(/^\//, "");
    if (!relative.startsWith("uploads/") && !relative.startsWith("avatars/")) return;
    await unlink(path.join(process.cwd(), "public", relative));
  } catch {
    // ignore
  }
}
