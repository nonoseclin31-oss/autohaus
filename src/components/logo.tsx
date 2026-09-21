import Image from "next/image";
import { cn } from "@/lib/utils";

/**
 * The official Autohaus Motion logo.
 *
 * Two assets, both generated from the supplied artwork by
 * `scripts/build-logo.mjs` with the white ground keyed out so they sit on any
 * surface:
 *   wordmark — AUTOHAUS MOTION only, for headers, the footer and the sidebar
 *   full     — the complete lockup with the Nürburgring outline and tagline
 */

const WORDMARK = { src: "/brand/logo-wordmark.png", ratio: 1320 / 192 };
const FULL = { src: "/brand/logo-full.png", ratio: 1328 / 542 };

const WORDMARK_HEIGHT = { xs: 18, sm: 24, md: 32, lg: 46, xl: 64 } as const;
const FULL_HEIGHT = { xs: 48, sm: 68, md: 96, lg: 150, xl: 210 } as const;

export type LogoSize = keyof typeof WORDMARK_HEIGHT;

export function Logo({
  variant = "wordmark",
  size = "md",
  heightClass,
  priority = false,
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
  priority?: boolean;
  className?: string;
  alt?: string;
}) {
  const asset = variant === "full" ? FULL : WORDMARK;
  const height = variant === "full" ? FULL_HEIGHT[size] : WORDMARK_HEIGHT[size];
  const width = Math.round(height * asset.ratio);

  return (
    <Image
      src={asset.src}
      alt={alt}
      width={width}
      height={height}
      priority={priority}
      className={cn("w-auto max-w-full select-none", heightClass, className)}
      style={heightClass ? undefined : { height, width }}
    />
  );
}
