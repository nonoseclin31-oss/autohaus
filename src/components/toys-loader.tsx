import { IconCompass } from "./icons";
import { cn } from "@/lib/utils";

/**
 * Big Toys' loading state.
 *
 * The dealership's splash is suppressed on this route and its brand loader is
 * swapped for this one, so this is the only thing a visitor sees while the
 * collection is fetched — and it is already the room they are arriving in:
 * the tide wash, the caustics, the condensed capitals.
 *
 * It is the loader for moving around inside Big Toys, and for a Big Toys page
 * opened directly. It is never seen on the way in from the dealership: the
 * crossing curtain is the entrance, and it holds until this has gone.
 *
 * `data-universe` is set here as well as by the layout, because a loading
 * boundary further up the tree renders before that layout exists.
 *
 * The word is the brand name, the one string identical in all six languages:
 * loading UI receives no route params, so it cannot look up a translation.
 */
export function ToysLoader({ fullscreen = false }: { fullscreen?: boolean }) {
  return (
    <div
      data-universe="toys"
      // What the crossing curtain waits on: it stays down while this is on
      // screen, so the visitor arriving through it never sees this one too.
      data-toys-loader
      role="status"
      aria-live="polite"
      aria-label="Big Toys"
      className={cn(
        "tide relative flex flex-col items-center justify-center gap-7 overflow-hidden px-6",
        fullscreen ? "min-h-screen" : "min-h-[70vh] w-full",
      )}
    >
      <div className="caustics pointer-events-none absolute inset-0" aria-hidden="true" />
      <IconCompass size={30} className="loader-logo relative text-bronze" aria-hidden="true" />
      <span className="toys-display relative text-[clamp(2.25rem,9vw,4.5rem)]">Big Toys</span>
      <div className="loader-track relative" aria-hidden="true">
        <span className="loader-bar" />
      </div>
    </div>
  );
}
