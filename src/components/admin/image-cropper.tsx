"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getDictionary, type Locale } from "@/i18n";
import { IconX, IconCheck, IconSpinner, IconAlert, IconCrop } from "../icons";
import { cn } from "@/lib/utils";

/**
 * Crops one uploaded photo to a display shape.
 *
 * Every listing image on the site is drawn in a 16:10 box with `object-cover`,
 * which means a portrait photo of a car is silently cut down the middle and a
 * panorama loses its ends. The choice of what survives that cut belongs to
 * whoever is writing the listing, not to the CSS.
 *
 * The model is the one every phone uses: the crop frame is fixed and the photo
 * moves behind it. Drag to choose what stays, zoom to cut what is left over.
 * No library — the whole thing is a transform on an <img> and one
 * `drawImage` at the end, which keeps the back office's bundle where it was
 * and costs the public site nothing at all.
 *
 * The result is re-encoded as WebP at the same ceiling the uploader uses, so a
 * crop never makes a file heavier than the upload it replaces.
 */

/** Long edge of the written file — the same ceiling lib/image-resize.ts uses. */
const MAX_EDGE = 2000;
const QUALITY = 0.85;
const MAX_ZOOM = 4;

export type CropRatio = { id: string; label: string; value: number };

export function ImageCropper({
  locale,
  url,
  onCancel,
  onCropped,
}: {
  locale: Locale;
  /** The stored photo to re-frame. */
  url: string;
  onCancel: () => void;
  /** Receives the cropped file; the caller uploads it and swaps the URL. */
  onCropped: (file: File) => Promise<void> | void;
}) {
  const t = getDictionary(locale);

  const [mounted, setMounted] = useState(false);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const ratios: CropRatio[] = [
    { id: "site", label: `${t.admin.cropSiteRatio} · 16:10`, value: 16 / 10 },
    { id: "43", label: "4:3", value: 4 / 3 },
    { id: "11", label: t.admin.cropSquare, value: 1 },
  ];
  const [ratio, setRatio] = useState(ratios[0].value);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });

  const frame = useRef<HTMLDivElement>(null);
  const drag = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  useEffect(() => setMounted(true), []);

  /* ── Load the photo somewhere the canvas may read it ────────
     A canvas refuses to give back the pixels of an image fetched from
     another origin without CORS headers, and the bucket sends none — so a
     stored photo goes through the relay at /api/image, which hands the same
     bytes back from here. A site-relative path is already ours and needs no
     detour. */
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => { if (!cancelled) setImage(img); };
    img.onerror = () => { if (!cancelled) setError(t.admin.cropFailed); };
    img.src = url.startsWith("/") ? url : `/api/image?url=${encodeURIComponent(url)}`;
    return () => { cancelled = true; };
  }, [url, t.admin.cropFailed]);

  /* The frame's pixel size, which every offset is measured against. */
  useEffect(() => {
    const node = frame.current;
    if (!node) return;
    const measure = () => setBox({ w: node.clientWidth, h: node.clientHeight });
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(node);
    return () => observer.disconnect();
  }, [image, ratio]);

  /**
   * The scale at which the photo exactly covers the frame. Everything else is
   * a multiple of it, so zoom 1 always means "no empty corners".
   */
  const baseScale =
    image && box.w && box.h ? Math.max(box.w / image.naturalWidth, box.h / image.naturalHeight) : 1;
  const scale = baseScale * zoom;
  // Rounded up, and the same rounded values are used for the element's size
  // and for the drag limits. A fractional width let the photo stop one pixel
  // short of the frame at full travel, showing a hairline of the backing.
  const shownW = image ? Math.ceil(image.naturalWidth * scale) : 0;
  const shownH = image ? Math.ceil(image.naturalHeight * scale) : 0;

  /** Keeps the frame full: the photo may never be dragged off its own edge. */
  const clamp = useCallback(
    (next: { x: number; y: number }) => ({
      x: Math.min(0, Math.max(box.w - shownW, next.x)),
      y: Math.min(0, Math.max(box.h - shownH, next.y)),
    }),
    [box.w, box.h, shownW, shownH],
  );

  const centre = useCallback(() => {
    setOffset({ x: (box.w - shownW) / 2, y: (box.h - shownH) / 2 });
  }, [box.w, box.h, shownW, shownH]);

  // Re-centre whenever the shape or the zoom changes the geometry underneath.
  useEffect(() => { centre(); }, [ratio, zoom, image, box.w, box.h]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onCancel();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onCancel, busy]);

  function startDrag(event: React.PointerEvent) {
    if (!image) return;
    (event.target as Element).setPointerCapture(event.pointerId);
    drag.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y };
  }

  function onDrag(event: React.PointerEvent) {
    const from = drag.current;
    if (!from) return;
    setOffset(clamp({ x: from.ox + (event.clientX - from.x), y: from.oy + (event.clientY - from.y) }));
  }

  function endDrag(event: React.PointerEvent) {
    drag.current = null;
    (event.target as Element).releasePointerCapture?.(event.pointerId);
  }

  /** Arrow keys move the photo too, so the tool is not pointer-only. */
  function onFrameKey(event: React.KeyboardEvent) {
    const step = event.shiftKey ? 40 : 8;
    const moves: Record<string, { x: number; y: number }> = {
      ArrowLeft: { x: -step, y: 0 },
      ArrowRight: { x: step, y: 0 },
      ArrowUp: { x: 0, y: -step },
      ArrowDown: { x: 0, y: step },
    };
    const move = moves[event.key];
    if (!move) return;
    event.preventDefault();
    setOffset((current) => clamp({ x: current.x + move.x, y: current.y + move.y }));
  }

  async function apply() {
    if (!image || busy) return;
    setBusy(true);
    setError(null);

    try {
      // The frame, expressed back in the photo's own pixels — and kept inside
      // them. A source rectangle that runs off the edge is drawn as
      // transparent by the canvas, which would put a clear sliver down the
      // side of a crop taken at full travel.
      const sw = Math.min(box.w / scale, image.naturalWidth);
      const sh = Math.min(box.h / scale, image.naturalHeight);
      const sx = Math.min(Math.max(0, -offset.x / scale), image.naturalWidth - sw);
      const sy = Math.min(Math.max(0, -offset.y / scale), image.naturalHeight - sh);

      // Never upscale: a crop of a small photo stays small.
      const outW = Math.round(Math.min(sw, MAX_EDGE, ratio >= 1 ? MAX_EDGE : MAX_EDGE * ratio));
      const outH = Math.round(outW / ratio);

      const canvas = document.createElement("canvas");
      canvas.width = outW;
      canvas.height = outH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("no-canvas");
      ctx.drawImage(image, sx, sy, sw, sh, 0, 0, outW, outH);

      const blob = await new Promise<Blob | null>((resolve) =>
        canvas.toBlob(resolve, "image/webp", QUALITY),
      );
      if (!blob) throw new Error("no-blob");

      await onCropped(
        new File([blob], `crop-${Date.now()}.webp`, { type: "image/webp", lastModified: Date.now() }),
      );
    } catch {
      setError(t.admin.cropFailed);
      setBusy(false);
    }
  }

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.admin.cropTitle}
      onClick={(event) => { if (event.target === event.currentTarget && !busy) onCancel(); }}
    >
      <div className="flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-sm border border-line bg-canvas shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="display flex items-center gap-2 text-xl">
            <IconCrop size={18} className="text-red" />
            {t.admin.cropTitle}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            aria-label={t.common.close}
            className="cursor-pointer rounded-sm p-1 text-subtle transition-colors duration-200 hover:text-fg disabled:opacity-40"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          <p className="field-help mb-4">{t.admin.cropHelp}</p>

          {/* ── The frame ── */}
          <div
            ref={frame}
            role="application"
            aria-label={t.admin.cropMove}
            tabIndex={0}
            onKeyDown={onFrameKey}
            onPointerDown={startDrag}
            onPointerMove={onDrag}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
            className={cn(
              "relative mx-auto w-full max-w-xl select-none overflow-hidden rounded-sm border border-line-strong bg-surface-2",
              image ? "cursor-grab touch-none active:cursor-grabbing" : "cursor-wait",
            )}
            style={{ aspectRatio: String(ratio) }}
          >
            {image ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={image.src}
                alt=""
                draggable={false}
                className="pointer-events-none absolute left-0 top-0 max-w-none"
                style={{ width: shownW, height: shownH, transform: `translate(${offset.x}px, ${offset.y}px)` }}
              />
            ) : (
              <span className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-subtle">
                {error ? <IconAlert size={16} className="text-red" /> : <IconSpinner size={16} />}
                {error ?? t.admin.cropLoading}
              </span>
            )}

            {/* Thirds, drawn over the photo: the one guide that helps frame a car. */}
            <div className="pointer-events-none absolute inset-0" aria-hidden="true">
              <div className="absolute inset-y-0 left-1/3 w-px bg-white/25" />
              <div className="absolute inset-y-0 left-2/3 w-px bg-white/25" />
              <div className="absolute inset-x-0 top-1/3 h-px bg-white/25" />
              <div className="absolute inset-x-0 top-2/3 h-px bg-white/25" />
            </div>
          </div>

          {/* ── Shape ── */}
          <div className="mt-5 flex flex-wrap gap-2">
            {ratios.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setRatio(option.value)}
                aria-pressed={ratio === option.value}
                className={cn(
                  "inline-flex min-h-11 cursor-pointer items-center rounded-sm border px-3.5 text-sm font-semibold transition-colors duration-200",
                  ratio === option.value
                    ? "border-red bg-red-wash text-red"
                    : "border-line bg-surface-2 text-muted hover:border-line-strong hover:text-fg",
                )}
              >
                {option.label}
              </button>
            ))}

            <button
              type="button"
              onClick={() => { setZoom(1); centre(); }}
              className="ms-auto inline-flex min-h-11 cursor-pointer items-center rounded-sm px-3 text-sm font-semibold text-muted transition-colors duration-200 hover:text-fg"
            >
              {t.admin.cropReset}
            </button>
          </div>

          {/* ── Zoom ── */}
          <div className="mt-4 flex items-center gap-3">
            <label htmlFor="crop-zoom" className="whitespace-nowrap text-sm text-muted">
              {t.admin.cropZoom}
            </label>
            <input
              id="crop-zoom"
              type="range"
              min={1}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              disabled={!image}
              onChange={(event) => setZoom(Number(event.target.value))}
              className="h-11 flex-1 cursor-pointer accent-[var(--color-red)]"
            />
            <span className="w-12 text-end text-sm text-subtle tabular-nums">
              {zoom.toFixed(1)}×
            </span>
          </div>

          {error ? (
            <p role="alert" className="mt-4 flex items-start gap-2 rounded-sm border border-red/40 bg-red/10 px-3 py-2 text-sm">
              <IconAlert size={15} className="mt-0.5 shrink-0 text-red" />
              {error}
            </p>
          ) : null}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-line px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={busy}
            className="btn btn-ghost cursor-pointer"
          >
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={apply}
            disabled={!image || busy}
            className="btn btn-primary cursor-pointer"
          >
            {busy ? <IconSpinner size={17} /> : <IconCheck size={17} />}
            {busy ? t.admin.cropWorking : t.admin.cropApply}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
