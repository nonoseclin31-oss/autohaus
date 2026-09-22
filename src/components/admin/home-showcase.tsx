"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { saveHomeShowcase, type ShowcaseState } from "@/app/actions/vehicles";
import { getDictionary, type Locale } from "@/i18n";
import {
  IconStar, IconCar, IconSearch, IconChevronDown, IconCheck, IconSpinner, IconImage,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export type ShowcaseOption = {
  id: string;
  /** "Ferrari Purosangue" */
  name: string;
  /** "2026 · 395 000 € · 12 000 km" */
  detail: string;
  coverUrl: string | null;
};

function Thumb({ vehicle, size = 56 }: { vehicle: ShowcaseOption | undefined; size?: number }) {
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

export function HomeShowcase({
  locale,
  vehicles,
  hero: initialHero,
  slots: initialSlots,
}: {
  locale: Locale;
  vehicles: ShowcaseOption[];
  hero: string;
  slots: string[];
}) {
  const t = getDictionary(locale);
  const [state, action] = useActionState<ShowcaseState, FormData>(saveHomeShowcase, { status: "idle" });
  const [hero, setHero] = useState(initialHero);
  const [slots, setSlots] = useState(initialSlots);

  const byId = new Map(vehicles.map((v) => [v.id, v]));

  // A car cannot be in two places on one page. Picking one that is already
  // placed moves it rather than showing it twice.
  function chooseHero(id: string) {
    setHero(id);
    if (id) setSlots((prev) => prev.map((slot) => (slot === id ? "" : slot)));
  }

  function chooseSlot(index: number, id: string) {
    setSlots((prev) => {
      const next = [...prev];
      const already = id ? next.indexOf(id) : -1;
      if (already >= 0 && already !== index) next[already] = next[index];
      next[index] = id;
      return next;
    });
    if (id && id === hero) setHero("");
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= slots.length) return;
    setSlots((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  const placed = new Set([hero, ...slots].filter(Boolean));
  const rest = vehicles.filter((v) => !placed.has(v.id));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      {/* ── The showcase car ────────────────────────────── */}
      <section className="rounded-sm border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-start gap-2 text-lg font-semibold">
          <IconStar size={18} className="mt-0.5 shrink-0 text-bronze" />
          {t.admin.homeHero}
        </h2>
        <p className="field-help mt-1">{t.admin.homeHeroHelp}</p>

        <div className="mt-4 flex items-center gap-3">
          <Thumb vehicle={byId.get(hero)} size={72} />
          <div className="min-w-0 flex-1">
            <label htmlFor="hero" className="sr-only">{t.admin.homeHero}</label>
            <select
              id="hero"
              name="hero"
              value={hero}
              onChange={(event) => chooseHero(event.target.value)}
              className="select"
            >
              <option value="">{t.admin.homeAuto}</option>
              {vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.detail}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── The six cards ───────────────────────────────── */}
      <section className="rounded-sm border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-start gap-2 text-lg font-semibold">
          <IconCar size={18} className="mt-0.5 shrink-0 text-red" />
          {t.admin.homeGrid}
        </h2>
        <p className="field-help mt-1">{t.admin.homeGridHelp}</p>

        <ol className="mt-4 divide-y divide-line border-y border-line">
          {slots.map((id, index) => {
            const vehicle = byId.get(id);
            return (
              <li key={index} className="py-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <Thumb vehicle={vehicle} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {vehicle ? vehicle.name : <span className="text-subtle">{t.admin.homeEmpty}</span>}
                    </p>
                    <p className="truncate text-xs text-subtle tabular-nums">{vehicle?.detail ?? "—"}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`${t.admin.homeMoveUp} — ${t.admin.homeSlot} ${index + 1}`}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-sm border border-line text-muted transition-colors duration-200 hover:border-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <IconChevronDown size={15} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === slots.length - 1}
                      aria-label={`${t.admin.homeMoveDown} — ${t.admin.homeSlot} ${index + 1}`}
                      className="flex size-9 cursor-pointer items-center justify-center rounded-sm border border-line text-muted transition-colors duration-200 hover:border-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <IconChevronDown size={15} />
                    </button>
                  </div>
                </div>

                <label htmlFor={`slot-${index}`} className="sr-only">
                  {t.admin.homeSlot} {index + 1}
                </label>
                <select
                  id={`slot-${index}`}
                  name="slot"
                  value={id}
                  onChange={(event) => chooseSlot(index, event.target.value)}
                  className="select mt-2"
                >
                  <option value="">{t.admin.homeEmpty}</option>
                  {vehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.name} — {v.detail}
                    </option>
                  ))}
                </select>
              </li>
            );
          })}
        </ol>
      </section>

      {/* ── What is left ────────────────────────────────── */}
      <section className="rounded-sm border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-start gap-2 text-lg font-semibold">
          <IconSearch size={18} className="mt-0.5 shrink-0 text-muted" />
          {t.admin.homeRest}
          <span className="rounded-full bg-fg/10 px-2 text-xs font-bold tabular-nums">{rest.length}</span>
        </h2>
        <p className="field-help mt-1">{t.admin.homeRestHelp}</p>

        {rest.length ? (
          <ul className="mt-4 space-y-2">
            {rest.map((v) => (
              <li key={v.id} className="flex items-center gap-3">
                <Thumb vehicle={v} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{v.name}</p>
                  <p className="truncate text-xs text-subtle tabular-nums">{v.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">{t.admin.homeNoOther}</p>
        )}
      </section>

      <div
        className={cn(
          "sticky bottom-0 z-20 -mx-4 flex items-center gap-3 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6",
          "justify-end",
        )}
      >
        {state.status === "saved" ? (
          <span className="me-auto flex items-center gap-1.5 text-sm font-medium text-ok">
            <IconCheck size={15} />
            {t.admin.homeSaved}
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
