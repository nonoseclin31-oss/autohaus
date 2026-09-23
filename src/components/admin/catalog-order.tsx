"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { saveCatalogOrder, type ShowcaseState } from "@/app/actions/vehicles";
import { getDictionary, type Locale } from "@/i18n";
import {
  IconPin, IconX, IconCheck, IconSpinner, IconImage, IconGrip, IconChevronDown, IconCar,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export type CatalogOption = {
  id: string;
  /** "Ferrari Purosangue" */
  name: string;
  /** "2026 · 395 000 € · 12 000 km" */
  detail: string;
  coverUrl: string | null;
};

function Thumb({ vehicle, size = 56 }: { vehicle: CatalogOption | undefined; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-sm border border-line bg-surface-2"
      style={{ width: size, height: Math.round(size * 0.7) }}
    >
      {vehicle?.coverUrl ? (
        <Image src={vehicle.coverUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <span className="flex h-full items-center justify-center text-subtle">
          <IconImage size={15} />
        </span>
      )}
    </div>
  );
}

function SaveButton({ idle, busy }: { idle: string; busy: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className="btn btn-primary cursor-pointer" disabled={pending}>
      {pending ? <IconSpinner size={17} /> : <IconCheck size={17} />}
      {pending ? busy : idle}
    </button>
  );
}

/**
 * Chooses which listings open the "vehicles for sale" page, and in which
 * order. Everything not pinned here takes its place by publication date,
 * newest first — which is what the page does on its own when nothing is
 * pinned at all.
 *
 * Two lists rather than one long one: a pinned listing is a decision, and a
 * decision should be visible as a short list rather than found again among
 * the hundred cars it was taken from.
 */
export function CatalogOrder({
  locale,
  vehicles,
  pinned: initialPinned,
  limit,
}: {
  locale: Locale;
  vehicles: CatalogOption[];
  pinned: string[];
  limit: number;
}) {
  const t = getDictionary(locale);
  const [state, action] = useActionState<ShowcaseState, FormData>(saveCatalogOrder, { status: "idle" });
  const [pinned, setPinned] = useState(initialPinned);

  const byId = new Map(vehicles.map((v) => [v.id, v]));
  const rows = pinned.filter((id) => byId.has(id));
  const rest = vehicles.filter((v) => !rows.includes(v.id));
  const full = rows.length >= limit;

  function pin(id: string) {
    setPinned((prev) => (prev.includes(id) || prev.length >= limit ? prev : [...prev, id]));
  }

  function unpin(id: string) {
    setPinned((prev) => prev.filter((entry) => entry !== id));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    setPinned((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  /* ── Reordering by dragging ────────────────────────────────
     The same gesture as the photos of a listing, for the same reason: this
     list is an order, and an order is rearranged by moving things, not by
     counting clicks on an arrow.

     Pointer events rather than HTML5 drag-and-drop, which does not exist on
     touch at all. The list reorders live under the finger, so there is no
     floating ghost to keep in sync with anything. */
  const [dragging, setDragging] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  /** Which row sits under this point, ignoring the one being carried. */
  function rowAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-row]");
    if (!el) return null;
    const index = Number(el.dataset.row);
    return Number.isInteger(index) ? index : null;
  }

  function startDrag(event: React.PointerEvent, index: number) {
    // A finger on the row itself has to keep scrolling the page — this list
    // can run well past the fold. Touch picks a row up by its grip; a mouse
    // can grab it anywhere.
    const fromGrip = !!(event.target as Element).closest("[data-grip]");
    if (event.pointerType === "touch" && !fromGrip) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    // Buttons inside the row keep working: a click on one is not a drag.
    if ((event.target as Element).closest("button:not([data-grip])")) return;

    event.preventDefault();
    dragRef.current = index;
    setDragging(index);

    const onMove = (moved: PointerEvent) => {
      const from = dragRef.current;
      if (from === null) return;
      const to = rowAt(moved.clientX, moved.clientY);
      if (to === null || to === from) return;
      setPinned((prev) => {
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
    // on the row. Here, because an effect runs after the paint: a tap quick
    // enough to finish first would leave nothing listening for its release,
    // and the list would then follow a pointer with no button held. On the
    // window, because the row is made transparent to the pointer while it is
    // carried, so that what is underneath can be found — and a capture on it
    // would stop delivering.
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    releaseRef.current = stop;
  }

  // A row let go while the page is being left takes its listeners with it.
  useEffect(() => () => releaseRef.current?.(), []);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {rows.map((id) => (
        <input key={id} type="hidden" name="pinned" value={id} />
      ))}

      {/* ── Pinned to the top of the page ───────────────── */}
      <section className="rounded-sm border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-start gap-2 text-lg font-semibold">
          <IconPin size={18} className="mt-0.5 shrink-0 text-red" />
          {t.admin.catalogPinned}
          <span className="rounded-full bg-fg/10 px-2 text-xs font-bold tabular-nums">
            {rows.length}/{limit}
          </span>
        </h2>
        <p className="field-help mt-1">{t.admin.catalogPinnedHelp}</p>

        {rows.length ? (
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {rows.map((id, index) => {
              const vehicle = byId.get(id)!;
              return (
                <li
                  key={id}
                  data-row={index}
                  onPointerDown={(event) => startDrag(event, index)}
                  className={cn(
                    "flex touch-pan-y items-center gap-3 py-3 transition-colors duration-150 select-none",
                    dragging === null ? "sm:cursor-grab" : "sm:cursor-grabbing",
                    dragging === index && "pointer-events-none relative z-10 rounded-sm bg-surface-2 opacity-90 ring-2 ring-red",
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red text-xs font-bold tabular-nums text-white">
                    {index + 1}
                  </span>

                  <button
                    type="button"
                    data-grip
                    aria-label={`${t.admin.reorder} — ${vehicle.name}`}
                    className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-subtle transition-colors duration-200 hover:bg-surface-2 hover:text-fg"
                  >
                    <IconGrip size={16} />
                  </button>

                  <Thumb vehicle={vehicle} />

                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{vehicle.name}</p>
                    <p className="truncate text-xs text-subtle tabular-nums">{vehicle.detail}</p>
                  </div>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`${t.admin.homeMoveUp} — ${vehicle.name}`}
                      className="flex size-10 cursor-pointer items-center justify-center rounded-sm border border-line text-muted transition-colors duration-200 hover:border-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <IconChevronDown size={15} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === rows.length - 1}
                      aria-label={`${t.admin.homeMoveDown} — ${vehicle.name}`}
                      className="flex size-10 cursor-pointer items-center justify-center rounded-sm border border-line text-muted transition-colors duration-200 hover:border-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <IconChevronDown size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => unpin(id)}
                      aria-label={`${t.admin.catalogUnpin} — ${vehicle.name}`}
                      title={t.admin.catalogUnpin}
                      className="flex size-10 cursor-pointer items-center justify-center rounded-sm text-subtle transition-colors duration-200 hover:bg-red/12 hover:text-red"
                    >
                      <IconX size={16} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {t.admin.catalogNonePinned}
          </p>
        )}
      </section>

      {/* ── Everything else, newest first ───────────────── */}
      <section className="rounded-sm border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-start gap-2 text-lg font-semibold">
          <IconCar size={18} className="mt-0.5 shrink-0 text-muted" />
          {t.admin.catalogRest}
          <span className="rounded-full bg-fg/10 px-2 text-xs font-bold tabular-nums">{rest.length}</span>
        </h2>
        <p className="field-help mt-1">{t.admin.catalogRestHelp}</p>
        {full ? <p className="mt-2 text-sm font-medium text-bronze">{t.admin.catalogFull}</p> : null}

        {rest.length ? (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {rest.map((vehicle) => (
              <li key={vehicle.id} className="flex items-center gap-3 py-3">
                <Thumb vehicle={vehicle} size={44} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{vehicle.name}</p>
                  <p className="truncate text-xs text-subtle tabular-nums">{vehicle.detail}</p>
                </div>
                <button
                  type="button"
                  onClick={() => pin(vehicle.id)}
                  disabled={full}
                  className="btn btn-ghost btn-sm shrink-0 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <IconPin size={15} />
                  {t.admin.catalogPin}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">{t.admin.catalogNoOther}</p>
        )}
      </section>

      <div className="sticky bottom-[var(--admin-dock,0px)] z-20 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        {state.status === "saved" ? (
          <span className="me-auto flex items-center gap-1.5 text-sm font-medium text-ok">
            <IconCheck size={15} />
            {t.admin.catalogSaved}
          </span>
        ) : null}
        {state.status === "error" ? (
          <span className="me-auto text-sm font-medium text-red">{t.admin.permDenied}</span>
        ) : null}
        <SaveButton idle={t.common.save} busy={t.common.saving} />
      </div>
    </form>
  );
}
