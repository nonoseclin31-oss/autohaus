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
const LEAVE_AT = 900;
const DONE_AT = 1620;

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
      timers.current.push(
        setTimeout(() => router.push(href), NAVIGATE_AT),
        setTimeout(() => setPhase("leave"), LEAVE_AT),
        setTimeout(() => setPhase("idle"), DONE_AT),
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
