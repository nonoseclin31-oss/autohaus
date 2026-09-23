"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

/**
 * The crossing between the two universes.
 *
 * Big Toys does not look like the rest of the site, and arriving there by a
 * plain page swap makes that read as a bug rather than a decision. So the
 * link plays a wipe: a marine curtain rises over the dealership, the
 * navigation happens behind it, and the curtain leaves upward onto the new
 * page. The two universes are never in the same frame.
 *
 * The gate lives in the header rather than in the link, because the mobile
 * drawer unmounts itself the moment the route changes — a gate owned by the
 * link inside it would disappear halfway through its own animation.
 */

export type GatePhase = "idle" | "enter" | "leave";

/** Curtain fully covers the screen at 560ms (see .gate-enter). */
const COVERED = 560;
/** Navigate just before that, so the swap happens out of sight. */
const NAVIGATE_AT = 500;
/** The earliest the curtain may lift — the word needs this long to land. */
const LEAVE_AT = 900;
/** How long lifting takes (see .gate-leave), plus a frame of margin. */
const LEAVE_FOR = 720;
/** How often to look whether the destination has finished loading. */
const POLL = 50;
/**
 * The latest it lifts regardless. A curtain that never rose would be worse
 * than a loading screen: past this, the visitor gets the loader rather than
 * a wall.
 */
const GIVE_UP_AT = 12000;

/**
 * Whether the destination is on screen and finished.
 *
 * Both halves matter. Until the router has committed, the old page is still
 * behind the curtain and there is no loader to see yet; once it has, the
 * page may still be waiting for its data behind Big Toys' own loading
 * screen, which is marked for exactly this question.
 */
function arrived(target: string): boolean {
  const here = window.location.pathname;
  if (here !== target && !here.startsWith(`${target}/`)) return false;
  return !document.querySelector("[data-toys-loader]");
}

export function useUniverseGate() {
  const router = useRouter();
  const [phase, setPhase] = useState<GatePhase>("idle");
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clear = useCallback(() => {
    for (const timer of timers.current) clearTimeout(timer);
    timers.current = [];
  }, []);

  useEffect(() => clear, [clear]);

  // The curtain is opaque and fixed, so the page behind it must not scroll
  // out from under the visitor while it is up.
  useEffect(() => {
    if (phase === "idle") return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [phase]);

  const cross = useCallback(
    (href: string) => {
      // Someone who asked for less motion gets the page, not the show.
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        router.push(href);
        return;
      }

      clear();
      setPhase("enter");
      // Warm the route while the curtain is still rising, so the wipe is not
      // paying for the fetch as well as the animation.
      router.prefetch(href);

      // The curtain lifts when the page behind it is ready, not on a clock.
      // It used to leave at a fixed 900ms: fine when the collection was
      // already cached, but on a first visit over a phone connection the
      // page was still loading — and lifting the curtain uncovered Big Toys'
      // own loading screen, two entrances one after the other. Now the
      // crossing is the only entrance: it holds until the page has arrived.
      const target = new URL(href, window.location.href).pathname;
      const started = performance.now();
      const lift = () => {
        const elapsed = performance.now() - started;
        if (elapsed < GIVE_UP_AT && !arrived(target)) {
          timers.current.push(setTimeout(lift, POLL));
          return;
        }
        setPhase("leave");
        timers.current.push(setTimeout(() => setPhase("idle"), LEAVE_FOR));
      };

      timers.current.push(
        setTimeout(() => router.push(href), NAVIGATE_AT),
        setTimeout(lift, LEAVE_AT),
      );
    },
    [clear, router],
  );

  /**
   * Wrap a link's onClick. Modifier and middle clicks fall straight through,
   * so "open in a new tab" keeps working and the link stays a real link for
   * anything that reads the page rather than clicks it.
   */
  const onLinkClick = useCallback(
    (href: string) => (event: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        event.defaultPrevented || event.button !== 0 ||
        event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      ) return;
      event.preventDefault();
      cross(href);
    },
    [cross],
  );

  return { phase, cross, onLinkClick };
}

export function UniverseGate({
  phase,
  word,
  label,
}: {
  phase: GatePhase;
  /** The word the curtain carries — the destination's name. */
  word: string;
  /** What a screen reader hears while the curtain is up. */
  label: string;
}) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || phase === "idle") return null;

  return createPortal(
    <div
      className={cn("gate", phase === "enter" ? "gate-enter" : "gate-leave")}
      // A curtain is a loading state, not a dialog: it announces itself once
      // and takes no focus, so the keyboard lands on the new page.
      role="status"
      aria-label={label}
    >
      <div className="caustics absolute inset-0" aria-hidden="true" />
      <div className="gate-horizon" aria-hidden="true" />
      <span className="gate-word text-[clamp(1.75rem,10vw,5.5rem)]" aria-hidden="true">
        {word}
      </span>
    </div>,
    document.body,
  );
}

/** Milliseconds the curtain needs before the destination should be ready. */
export const GATE_COVERED_AT = COVERED;
