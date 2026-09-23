"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { saveToyShowcase, type ToyShowcaseState } from "@/app/actions/toys";
import { getDictionary, type Locale } from "@/i18n";
import {
  IconStar, IconCompass, IconSearch, IconChevronDown, IconCheck, IconSpinner, IconImage,
} from "@/components/icons";

export type ToyShowcaseOption = {
  id: string;
  /** "Ducati Panigale V4" */
  name: string;
  /** "Moto · 2025 · 32 000 € · 1 200 km" */
  detail: string;
  coverUrl: string | null;
};

function Thumb({ toy, size = 56 }: { toy: ToyShowcaseOption | undefined; size?: number }) {
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-sm border border-line bg-surface-2"
      style={{ width: size, height: Math.round(size * 0.7) }}
    >
      {toy?.coverUrl ? (
        <Image src={toy.coverUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
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

export function ToyShowcase({
  locale,
  toys,
  hero: initialHero,
  slots: initialSlots,
}: {
  locale: Locale;
  toys: ToyShowcaseOption[];
  hero: string;
  slots: string[];
}) {
  const t = getDictionary(locale);
  const [state, action] = useActionState<ToyShowcaseState, FormData>(saveToyShowcase, { status: "idle" });
  const [hero, setHero] = useState(initialHero);
  const [slots, setSlots] = useState(initialSlots);

  const byId = new Map(toys.map((v) => [v.id, v]));

  // A piece cannot be in two places on one page. Picking one that is already
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
  const rest = toys.filter((v) => !placed.has(v.id));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />

      {/* ── The showcase piece ──────────────────────────── */}
      <section className="rounded-sm border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-start gap-2 text-lg font-semibold">
          <IconStar size={18} className="mt-0.5 shrink-0 text-bronze" />
          {t.admin.toyHero}
        </h2>
        <p className="field-help mt-1">{t.admin.toyHeroHelp}</p>

        <div className="mt-4 flex items-center gap-3">
          <Thumb toy={byId.get(hero)} size={72} />
          <div className="min-w-0 flex-1">
            <label htmlFor="toy-hero" className="sr-only">{t.admin.toyHero}</label>
            <select
              id="toy-hero"
              name="hero"
              value={hero}
              onChange={(event) => chooseHero(event.target.value)}
              className="select"
            >
              <option value="">{t.admin.homeAuto}</option>
              {toys.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} — {v.detail}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {/* ── The six under it ────────────────────────────── */}
      <section className="rounded-sm border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-start gap-2 text-lg font-semibold">
          <IconCompass size={18} className="mt-0.5 shrink-0 text-bronze" />
          {t.admin.toyGrid}
        </h2>
        <p className="field-help mt-1">{t.admin.toyGridHelp}</p>

        <ol className="mt-4 divide-y divide-line border-y border-line">
          {slots.map((id, index) => {
            const toy = byId.get(id);
            return (
              <li key={index} className="py-3">
                <div className="flex items-center gap-3">
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-2 text-xs font-bold tabular-nums text-muted">
                    {index + 1}
                  </span>
                  <Thumb toy={toy} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">
                      {toy ? toy.name : <span className="text-subtle">{t.admin.homeEmpty}</span>}
                    </p>
                    <p className="truncate text-xs text-subtle tabular-nums">{toy?.detail ?? "—"}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label={`${t.admin.homeMoveUp} — ${t.admin.homeSlot} ${index + 1}`}
                      className="flex size-11 md:size-9 cursor-pointer items-center justify-center rounded-sm border border-line text-muted transition-colors duration-200 hover:border-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <IconChevronDown size={15} className="rotate-180" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === slots.length - 1}
                      aria-label={`${t.admin.homeMoveDown} — ${t.admin.homeSlot} ${index + 1}`}
                      className="flex size-11 md:size-9 cursor-pointer items-center justify-center rounded-sm border border-line text-muted transition-colors duration-200 hover:border-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                    >
                      <IconChevronDown size={15} />
                    </button>
                  </div>
                </div>

                <label htmlFor={`toy-slot-${index}`} className="sr-only">
                  {t.admin.homeSlot} {index + 1}
                </label>
                <select
                  id={`toy-slot-${index}`}
                  name="slot"
                  value={id}
                  onChange={(event) => chooseSlot(index, event.target.value)}
                  className="select mt-2"
                >
                  <option value="">{t.admin.homeEmpty}</option>
                  {toys.map((v) => (
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
          {t.admin.toyRest}
          <span className="rounded-full bg-fg/10 px-2 text-xs font-bold tabular-nums">{rest.length}</span>
        </h2>
        <p className="field-help mt-1">{t.admin.toyRestHelp}</p>

        {rest.length ? (
          <ul className="mt-4 space-y-2">
            {rest.map((v) => (
              <li key={v.id} className="flex items-center gap-3">
                <Thumb toy={v} size={44} />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{v.name}</p>
                  <p className="truncate text-xs text-subtle tabular-nums">{v.detail}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">{t.admin.toyNoOther}</p>
        )}
      </section>

      <div className="sticky bottom-[var(--admin-dock,0px)] z-20 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        {state.status === "saved" ? (
          <span className="me-auto flex items-center gap-1.5 text-sm font-medium text-ok">
            <IconCheck size={15} />
            {t.admin.toySaved}
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
