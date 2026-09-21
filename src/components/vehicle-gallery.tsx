"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import { IconChevronLeft, IconChevronRight, IconImage, IconX } from "./icons";
import { getDictionary, type Locale } from "@/i18n";
import { label, VEHICLE_STATUS, type Locale as TaxLocale } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";

type GalleryImage = { id: string; url: string; alt: string | null };

export function VehicleGallery({
  images,
  title,
  locale,
  status,
}: {
  images: GalleryImage[];
  title: string;
  locale: Locale;
  status: string;
}) {
  const t = getDictionary(locale);
  const [index, setIndex] = useState(0);
  const [lightbox, setLightbox] = useState(false);

  const count = images.length;
  const go = useCallback(
    (delta: number) => setIndex((i) => (count ? (i + delta + count) % count : 0)),
    [count],
  );

  useEffect(() => {
    if (!lightbox) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setLightbox(false);
      if (event.key === "ArrowRight") go(1);
      if (event.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [lightbox, go]);

  if (!count) {
    return (
      <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-3 rounded-sm border border-line bg-surface text-subtle">
        <IconImage size={44} />
        <p className="text-sm">{t.detail.noImages}</p>
      </div>
    );
  }

  const current = images[index];

  return (
    <>
      <div className="space-y-3">
        <div className="group relative aspect-[16/10] w-full overflow-hidden rounded-sm border border-line bg-surface-2">
          <button
            type="button"
            onClick={() => setLightbox(true)}
            className="absolute inset-0 z-10 cursor-zoom-in"
            aria-label={`${t.detail.gallery}: ${title}`}
          />
          <Image
            src={current.url}
            alt={current.alt ?? `${title} — ${t.detail.imageOf} ${index + 1}`}
            fill
            sizes="(max-width: 1024px) 100vw, 60vw"
            priority
            className={cn("object-cover", status === "SOLD" && "grayscale-[0.5]")}
          />

          {status !== "AVAILABLE" ? (
            <span
              className={cn(
                "vignette absolute start-4 top-4 z-20",
                status === "RESERVED" && "vignette-reserved",
                status === "COMING_SOON" && "vignette-soon",
              )}
            >
              {label(VEHICLE_STATUS, status, locale as TaxLocale)}
            </span>
          ) : null}

          {count > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                aria-label={t.detail.previousImage}
                className="absolute start-3 top-1/2 z-20 -translate-y-1/2 cursor-pointer rounded-sm bg-black/65 p-2.5 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/85 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <IconChevronLeft size={20} />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                aria-label={t.detail.nextImage}
                className="absolute end-3 top-1/2 z-20 -translate-y-1/2 cursor-pointer rounded-sm bg-black/65 p-2.5 text-white opacity-0 backdrop-blur-sm transition-opacity duration-200 hover:bg-black/85 focus-visible:opacity-100 group-hover:opacity-100"
              >
                <IconChevronRight size={20} />
              </button>
              <span className="absolute bottom-3 end-3 z-20 rounded-sm bg-black/70 px-2.5 py-1 text-xs font-semibold text-white tabular-nums backdrop-blur-sm">
                {index + 1} / {count}
              </span>
            </>
          ) : null}
        </div>

        {count > 1 ? (
          <ul className="no-scrollbar flex gap-2 overflow-x-auto pb-1">
            {images.map((image, i) => (
              <li key={image.id} className="shrink-0">
                <button
                  type="button"
                  onClick={() => setIndex(i)}
                  aria-label={`${t.detail.imageOf} ${i + 1}`}
                  aria-current={i === index}
                  className={cn(
                    "relative block h-16 w-24 cursor-pointer overflow-hidden rounded-sm border-2 transition-colors duration-200",
                    i === index ? "border-red" : "border-transparent opacity-65 hover:opacity-100",
                  )}
                >
                  <Image src={image.url} alt="" fill sizes="96px" className="object-cover" />
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>

      {lightbox ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 p-4 animate-fade"
          role="dialog"
          aria-modal="true"
          aria-label={t.detail.gallery}
        >
          <button
            type="button"
            onClick={() => setLightbox(false)}
            aria-label={t.common.close}
            className="absolute end-4 top-4 z-10 cursor-pointer rounded-sm bg-white/10 p-2.5 text-white transition-colors duration-200 hover:bg-white/20"
          >
            <IconX size={22} />
          </button>

          <div className="relative h-full max-h-[85vh] w-full max-w-6xl">
            <Image
              src={current.url}
              alt={current.alt ?? `${title} — ${t.detail.imageOf} ${index + 1}`}
              fill
              sizes="100vw"
              className="object-contain"
            />
          </div>

          {count > 1 ? (
            <>
              <button
                type="button" onClick={() => go(-1)} aria-label={t.detail.previousImage}
                className="absolute start-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm bg-white/10 p-3 text-white transition-colors duration-200 hover:bg-white/20"
              >
                <IconChevronLeft size={24} />
              </button>
              <button
                type="button" onClick={() => go(1)} aria-label={t.detail.nextImage}
                className="absolute end-4 top-1/2 -translate-y-1/2 cursor-pointer rounded-sm bg-white/10 p-3 text-white transition-colors duration-200 hover:bg-white/20"
              >
                <IconChevronRight size={24} />
              </button>
              <span className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-sm bg-white/10 px-3 py-1.5 text-sm font-semibold text-white tabular-nums">
                {index + 1} / {count}
              </span>
            </>
          ) : null}
        </div>
      ) : null}
    </>
  );
}
