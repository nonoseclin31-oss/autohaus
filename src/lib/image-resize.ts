/**
 * Downscale and re-encode an image in the browser before uploading.
 *
 * Cloudflare's free plan has no image resizing, so whatever is uploaded is
 * what every visitor downloads. A 6 MB phone photo of a car would be served
 * at 6 MB. Doing it here costs nothing, works on any host, and means R2 only
 * ever stores web-sized files.
 *
 * Falls back to the original file if anything goes wrong — a slightly heavy
 * upload is much better than a failed one.
 */

const MAX_EDGE = 2000;
const QUALITY = 0.82;

/** Formats every browser can draw. Anything else has to be converted. */
const DISPLAYABLE = new Set(["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"]);

export async function shrinkImage(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (typeof createImageBitmap !== "function" || typeof document === "undefined") return file;

  // A phone photo arrives as HEIC and a camera card as TIFF; neither renders in
  // a browser, so those are converted however small they are. Formats that do
  // render are only touched when there is something to gain.
  const mustConvert = !DISPLAYABLE.has(file.type);
  if (!mustConvert && file.size < 300 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const { width, height } = bitmap;
    const scale = Math.min(1, MAX_EDGE / Math.max(width, height));

    // Already small enough and already efficiently encoded — leave it.
    if (!mustConvert && scale === 1 && file.type === "image/webp") {
      bitmap.close();
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      bitmap.close();
      return file;
    }
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", QUALITY),
    );
    // A conversion that grew the file is still worth keeping when the original
    // could not be displayed at all.
    if (!blob) return file;
    if (!mustConvert && blob.size >= file.size) return file;

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp";
    return new File([blob], name, { type: "image/webp", lastModified: Date.now() });
  } catch {
    return file;
  }
}

export async function shrinkAll(files: File[]): Promise<File[]> {
  return Promise.all(files.map(shrinkImage));
}
