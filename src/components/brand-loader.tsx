import { Logo } from "./logo";
import { cn } from "@/lib/utils";

/**
 * The loading state, built around the logo: the full lockup over a track-style
 * progress bar running the German flag colours.
 *
 * `fullscreen` fills the viewport (route-level loading.tsx); the default fills
 * its container (section-level suspense).
 */
export function BrandLoader({
  fullscreen = false,
  label = "Loading",
  className,
}: {
  fullscreen?: boolean;
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={label}
      className={cn(
        "studio flex flex-col items-center justify-center gap-7 px-6",
        fullscreen ? "min-h-screen" : "min-h-[60vh] w-full",
        className,
      )}
    >
      <div className="loader-logo">
        <Logo variant="full" size="md" priority />
      </div>

      <div className="loader-track" aria-hidden="true">
        <span className="loader-bar" />
      </div>

      <span className="sr-only">{label}</span>
    </div>
  );
}
