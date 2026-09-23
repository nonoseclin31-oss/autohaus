import { cn } from "@/lib/utils";

/**
 * The official Autohaus Motion logo.
 *
 * Two assets, both generated from the supplied artwork by
 * `scripts/build-logo.mjs` with the white ground keyed out so they sit on any
 * surface:
 *   wordmark — AUTOHAUS MOTION only, for headers, the footer and the sidebar
 *   full     — the complete lockup with the Nürburgring outline and tagline
 *
 * Each has a light-on-dark twin, because the near-black "AUTO" vanishes on the
 * dark theme's canvas. The pair is swapped in CSS rather than in React: a
 * component that read the theme after hydration would render the wrong mark
 * for a frame, and a browser only fetches the background-image that applies,
 * so the unused variant is never downloaded.
 */

const WORDMARK = { ratio: 1320 / 192, className: "logo-wordmark" };
const FULL = { ratio: 1328 / 542, className: "logo-full" };

const WORDMARK_HEIGHT = { xs: 18, sm: 24, md: 32, lg: 46, xl: 64 } as const;
const FULL_HEIGHT = { xs: 48, sm: 68, md: 96, lg: 150, xl: 210 } as const;

export type LogoSize = keyof typeof WORDMARK_HEIGHT;

export function Logo({
  variant = "wordmark",
  size = "md",
  heightClass,
  className,
  alt = "Autohaus Motion",
}: {
  variant?: "wordmark" | "full";
  size?: LogoSize;
  /**
   * Tailwind height classes, e.g. "h-6 sm:h-8", for a logo that has to adapt
   * across breakpoints. Takes over from `size` entirely so there is only ever
   * one source of height — the wordmark is 6.9:1, so a fixed desktop width
   * overflows a 375px header.
   */
  heightClass?: string;
  /** Kept for call sites; the mark is a background image and always eager. */
  priority?: boolean;
  className?: string;
  alt?: string;
}) {
  const asset = variant === "full" ? FULL : WORDMARK;
  const height = variant === "full" ? FULL_HEIGHT[size] : WORDMARK_HEIGHT[size];
  const width = Math.round(height * asset.ratio);

  return (
    <span
      role="img"
      aria-label={alt}
      className={cn("block select-none bg-contain bg-center bg-no-repeat", asset.className, heightClass, className)}
      style={
        heightClass
          ? { aspectRatio: String(asset.ratio) }
          : { height, width, aspectRatio: String(asset.ratio) }
      }
    />
  );
}
