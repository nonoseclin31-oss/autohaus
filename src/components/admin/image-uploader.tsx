"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { getDictionary, type Locale } from "@/i18n";
import {
  IconUpload, IconTrash, IconStar, IconSpinner, IconAlert, IconChevronLeft,
  IconChevronRight, IconCrop, IconGrip,
} from "../icons";
import { ImageCropper } from "./image-cropper";
import { shrinkAll } from "@/lib/image-resize";
import { cn } from "@/lib/utils";

export type UploadedImage = { url: string; alt?: string | null };

/**
 * Multi-photo uploader. Files go to /api/upload immediately; the ordered list
 * is serialised into a hidden input so the parent form submits it in one go.
 * First image in the list is the cover.
 */
export function ImageUploader({
  locale,
  name = "images",
  initial = [],
}: {
  locale: Locale;
  name?: string;
  initial?: UploadedImage[];
}) {
  const t = getDictionary(locale);
  const [images, setImages] = useState<UploadedImage[]>(initial);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  // Which photo is open in the crop tool, by position in the list.
  const [cropping, setCropping] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /** Sends one file and returns where it landed, or null if it was refused. */
  async function send(file: File): Promise<string | null> {
    const body = new FormData();
    body.append("files", file);
    const response = await fetch("/api/upload", { method: "POST", body });
    if (!response.ok) return null;
    const result = (await response.json()) as { uploaded: { url: string }[] };
    return result.uploaded[0]?.url ?? null;
  }

  /**
   * Puts a cropped photo in place of the one it was made from.
   *
   * The original object is left in the bucket rather than deleted: the form
   * has not been saved yet, so the listing on the site is still pointing at
   * it, and a crop that is abandoned by cancelling the form must not have
   * taken the live photo with it.
   */
  async function replaceAt(index: number, file: File) {
    const url = await send(file);
    if (!url) {
      setError(t.admin.cropFailed);
      return;
    }
    setImages((prev) => prev.map((image, i) => (i === index ? { ...image, url } : image)));
    setCropping(null);
  }

  async function upload(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;

    setBusy(true);
    setError(null);

    try {
      // Downscale in the browser first: Cloudflare's free plan does no image
      // resizing, so an unshrunk phone photo would be served at full size.
      const prepared = await shrinkAll(list);
      const body = new FormData();
      for (const file of prepared) body.append("files", file);

      const response = await fetch("/api/upload", { method: "POST", body });
      if (!response.ok) throw new Error(String(response.status));

      const result = (await response.json()) as {
        uploaded: { url: string }[];
        rejected: { name: string; reason: string }[];
      };

      setImages((prev) => [...prev, ...result.uploaded.map((u) => ({ url: u.url, alt: null }))]);
      if (result.rejected.length) {
        const why: Record<string, string> = {
          type: t.admin.uploadBadType,
          size: t.admin.uploadTooBig,
          storage: t.admin.uploadFailed,
        };
        setError(
          result.rejected
            .map((r) => `${r.name} — ${why[r.reason] ?? t.common.error}`)
            .join(" · "),
        );
      }
    } catch {
      setError(t.common.error);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  /* ── Reordering by dragging ────────────────────────────────
     The order of this list is the order on the site, and the first photo is
     the cover, so rearranging it is the common edit — not an afterthought
     behind two arrow buttons.

     Pointer events rather than HTML5 drag-and-drop, which does not exist on
     touch at all. The list reorders live under the finger, so there is no
     floating ghost to keep in sync with anything. */
  const [dragging, setDragging] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  /** Which tile sits under this point, ignoring the one being carried. */
  function tileAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-photo]");
    if (!el) return null;
    const index = Number(el.dataset.photo);
    return Number.isInteger(index) ? index : null;
  }

  function startDrag(event: React.PointerEvent, index: number) {
    // A finger on the photo itself has to keep scrolling the page — there is
    // a grid of these and the form runs well past the fold. Touch picks a
    // photo up by its grip; a mouse can grab it anywhere.
    const fromGrip = !!(event.target as Element).closest("[data-grip]");
    if (event.pointerType === "touch" && !fromGrip) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;

    event.preventDefault();
    dragRef.current = index;
    setDragging(index);

    const onMove = (moved: PointerEvent) => {
      const from = dragRef.current;
      if (from === null) return;
      const to = tileAt(moved.clientX, moved.clientY);
      if (to === null || to === from) return;
      setImages((prev) => {
        const next = [...prev];
        const [carried] = next.splice(from, 1);
        next.splice(to, 0, carried);
        return next;
      });
      dragRef.current = to;
      setDragging(to);
    };

    const stop = () => {
      dragRef.current = null;
      setDragging(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", stop);
      window.removeEventListener("pointercancel", stop);
      releaseRef.current = null;
    };

    // Attached here rather than from an effect, and on the window rather than
    // on the tile. Here, because an effect runs after the paint: a tap quick
    // enough to finish first would leave nothing listening for its release,
    // and the photos would then follow a pointer with no button held. On the
    // window, because the tile is made transparent to the pointer while it is
    // carried, so that what is underneath can be found — and a capture on it
    // would stop delivering.
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    releaseRef.current = stop;
  }

  // A tile let go while the page is being left takes its listeners with it.
  useEffect(() => () => releaseRef.current?.(), []);

  function remove(index: number) {
    setImages((prev) => prev.filter((_, i) => i !== index));
  }

  function move(index: number, delta: number) {
    setImages((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function makeCover(index: number) {
    setImages((prev) => {
      if (index === 0) return prev;
      const next = [...prev];
      const [picked] = next.splice(index, 1);
      return [picked, ...next];
    });
  }

  return (
    <div className="space-y-4">
      <input type="hidden" name={name} value={JSON.stringify(images)} />

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files?.length) void upload(e.dataTransfer.files);
        }}
        className={cn(
          "rounded-sm border-2 border-dashed p-6 text-center transition-colors duration-200",
          dragOver ? "border-red bg-red/8" : "border-line bg-surface-2",
        )}
      >
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="mx-auto flex cursor-pointer flex-col items-center gap-2 disabled:cursor-not-allowed"
        >
          {busy ? <IconSpinner size={26} className="text-red" /> : <IconUpload size={26} className="text-subtle" />}
          <span className="text-xs font-semibold uppercase tracking-[0.14em]">
            {busy ? t.admin.uploading : t.admin.dropImages}
          </span>
          <span className="text-xs text-subtle">{t.admin.imageHelp}</span>
        </button>

        <input
          ref={inputRef}
          type="file"
          // Any image the device offers, including a phone's HEIC; the
          // browser converts what it can before uploading.
          accept="image/*"
          multiple
          className="sr-only"
          onChange={(e) => e.target.files && upload(e.target.files)}
        />
      </div>

      {error ? (
        <p role="alert" className="flex items-start gap-2 rounded-sm border border-red/40 bg-red/10 px-3 py-2 text-sm">
          <IconAlert size={15} className="mt-0.5 shrink-0 text-red" />
          {error}
        </p>
      ) : null}

      {/* Thumbnails */}
      {images.length ? (
        <>
          <p className="field-help">{t.admin.reorderHelp}</p>
          <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              // Keyed by the photo rather than its position: a key that moved
              // with the index would make React rebuild every tile on each
              // step of a drag, throwing away the drag itself.
              key={image.url}
              data-photo={index}
              className={cn(
                "group relative overflow-hidden rounded-sm border bg-surface-2 transition-shadow duration-200",
                index === 0 ? "border-red" : "border-line",
                dragging === index &&
                  // Transparent to the pointer so the tile underneath can be
                  // found, and visibly lifted so it is clear what is moving.
                  "pointer-events-none relative z-10 border-red opacity-90 shadow-[var(--shadow-lg)] ring-2 ring-red",
              )}
            >
              <div
                onPointerDown={(event) => startDrag(event, index)}
                className={cn(
                  "relative aspect-[4/3]",
                  dragging === null ? "cursor-grab" : "cursor-grabbing",
                )}
              >
                <Image src={image.url} alt="" fill sizes="200px" className="object-cover" draggable={false} />

                {/* The touch handle. 44px, always visible — there is no hover
                    on a phone to reveal it with. */}
                <span
                  data-grip
                  role="button"
                  tabIndex={-1}
                  aria-label={t.admin.reorder}
                  title={t.admin.reorder}
                  className="absolute end-1 top-1 flex size-11 cursor-grab touch-none items-center justify-center rounded-sm bg-canvas/80 text-muted backdrop-blur-sm transition-colors duration-200 hover:text-fg active:cursor-grabbing"
                >
                  <IconGrip size={16} />
                </span>
              </div>

              {index === 0 ? (
                <span className="pointer-events-none absolute start-1.5 top-1.5 rounded-sm bg-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
                  {t.admin.coverBadge}
                </span>
              ) : null}

              <div className="flex items-center justify-between gap-1 border-t border-line bg-surface p-1.5">
                <div className="flex gap-0.5">
                  <button
                    type="button" onClick={() => move(index, -1)} disabled={index === 0}
                    aria-label={t.common.previous}
                    className="cursor-pointer rounded-sm p-1.5 text-subtle transition-colors duration-200 hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <IconChevronLeft size={14} />
                  </button>
                  <button
                    type="button" onClick={() => move(index, 1)} disabled={index === images.length - 1}
                    aria-label={t.common.next}
                    className="cursor-pointer rounded-sm p-1.5 text-subtle transition-colors duration-200 hover:text-fg disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <IconChevronRight size={14} />
                  </button>
                </div>
                <div className="flex gap-0.5">
                  <button
                    type="button" onClick={() => setCropping(index)}
                    aria-label={`${t.admin.crop} — ${index + 1}`} title={t.admin.crop}
                    className="cursor-pointer rounded-sm p-1.5 text-subtle transition-colors duration-200 hover:text-red"
                  >
                    <IconCrop size={14} />
                  </button>
                  <button
                    type="button" onClick={() => makeCover(index)} disabled={index === 0}
                    aria-label={t.admin.setCover} title={t.admin.setCover}
                    className="cursor-pointer rounded-sm p-1.5 text-subtle transition-colors duration-200 hover:text-gold disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <IconStar size={14} />
                  </button>
                  <button
                    type="button" onClick={() => remove(index)}
                    aria-label={t.admin.removeImage} title={t.admin.removeImage}
                    className="cursor-pointer rounded-sm p-1.5 text-subtle transition-colors duration-200 hover:text-red"
                  >
                    <IconTrash size={14} />
                  </button>
                </div>
              </div>
            </li>
          ))}
          </ul>
        </>
      ) : null}

      {cropping !== null && images[cropping] ? (
        <ImageCropper
          locale={locale}
          url={images[cropping].url}
          onCancel={() => setCropping(null)}
          onCropped={(file) => replaceAt(cropping, file)}
        />
      ) : null}
    </div>
  );
}
