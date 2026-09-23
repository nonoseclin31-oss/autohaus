"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { getDictionary, type Locale } from "@/i18n";
import {
  IconUpload, IconTrash, IconStar, IconSpinner, IconAlert, IconChevronLeft,
  IconChevronRight, IconCrop,
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
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {images.map((image, index) => (
            <li
              key={`${image.url}-${index}`}
              className={cn(
                "group relative overflow-hidden rounded-sm border bg-surface-2",
                index === 0 ? "border-red" : "border-line",
              )}
            >
              <div className="relative aspect-[4/3]">
                <Image src={image.url} alt="" fill sizes="200px" className="object-cover" />
              </div>

              {index === 0 ? (
                <span className="absolute start-1.5 top-1.5 rounded-sm bg-red px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white">
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
