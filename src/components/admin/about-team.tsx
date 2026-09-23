"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import Image from "next/image";
import { saveAboutTeam, type TeamState } from "@/app/actions/users";
import { getDictionary, formatNumber, LOCALE_META, type Locale } from "@/i18n";
import { LOCALES } from "@/lib/taxonomy";
import {
  AGE_MAX, AGE_MIN, ROLE_MAX, TAGLINE_MAX, ageFrom, pickCopy, type AboutCopy,
} from "@/lib/team-copy";
import {
  IconUser, IconUsers, IconX, IconCheck, IconSpinner, IconGrip, IconChevronDown, IconPlus, IconEdit,
} from "@/components/icons";
import { cn } from "@/lib/utils";

export type TeamPerson = {
  id: string;
  name: string;
  /** The title on the account, used when no public function is written. */
  jobTitle: string | null;
  avatarUrl: string | null;
  /** "YYYY-MM-DD", or "" when none is recorded. */
  birthDate: string;
  copy: AboutCopy;
};

type Draft = { birthDate: string; copy: AboutCopy };

function Avatar({ person, size = 44 }: { person: TeamPerson; size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-line bg-surface-2 text-muted"
      style={{ width: size, height: size }}
    >
      {person.avatarUrl ? (
        <Image src={person.avatarUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
      ) : (
        <IconUser size={Math.round(size * 0.4)} />
      )}
    </span>
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

/** A date as the date picker writes it, `years` before today. */
function yearsAgo(years: number): string {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear() - years, now.getUTCMonth(), now.getUTCDate()))
    .toISOString()
    .slice(0, 10);
}

/**
 * Chooses who appears on the About page, in which order, and what it says of
 * them. Built as the catalogue order is: the people shown, as a short list to
 * arrange, and everyone else underneath with a button to bring them up.
 *
 * Each shown person folds out into their public profile. The first language
 * is the one the back office is being used in; the other five are optional,
 * because the page falls back to a language that is filled.
 */
export function AboutTeam({
  locale,
  people,
  shown: initialShown,
}: {
  locale: Locale;
  people: TeamPerson[];
  shown: string[];
}) {
  const t = getDictionary(locale);
  const [state, action] = useActionState<TeamState, FormData>(saveAboutTeam, { status: "idle" });
  const [shown, setShown] = useState(initialShown);
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() =>
    Object.fromEntries(people.map((p) => [p.id, { birthDate: p.birthDate, copy: p.copy }])),
  );

  const byId = new Map(people.map((p) => [p.id, p]));
  const rows = shown.filter((id) => byId.has(id));
  const rest = people.filter((p) => !rows.includes(p.id));
  const others = LOCALES.filter((l) => l !== locale);
  const latest = yearsAgo(AGE_MIN);
  const earliest = yearsAgo(AGE_MAX);

  function show(id: string) {
    setShown((prev) => (prev.includes(id) ? prev : [...prev, id]));
  }

  function hide(id: string) {
    setShown((prev) => prev.filter((entry) => entry !== id));
  }

  function move(index: number, delta: number) {
    const target = index + delta;
    if (target < 0 || target >= rows.length) return;
    setShown((prev) => {
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function setBirthDate(id: string, value: string) {
    setDrafts((prev) => ({ ...prev, [id]: { ...prev[id], birthDate: value } }));
  }

  function setCopy(id: string, loc: Locale, field: "role" | "tagline", value: string) {
    setDrafts((prev) => {
      const copy = { ...prev[id].copy, [loc]: { ...prev[id].copy[loc], [field]: value } };
      return { ...prev, [id]: { ...prev[id], copy } };
    });
  }

  /* ── Reordering by dragging ────────────────────────────────
     The gesture the photo grid and the catalogue order use. The listeners
     go on at pointerdown rather than from an effect, so a tap too quick for
     an effect to see cannot leave the list following the pointer. */
  const [dragging, setDragging] = useState<number | null>(null);
  const dragRef = useRef<number | null>(null);
  const releaseRef = useRef<(() => void) | null>(null);

  function rowAt(x: number, y: number): number | null {
    const el = document.elementFromPoint(x, y)?.closest<HTMLElement>("[data-row]");
    if (!el) return null;
    const index = Number(el.dataset.row);
    return Number.isInteger(index) ? index : null;
  }

  function startDrag(event: React.PointerEvent, index: number) {
    const target = event.target as Element;
    // A finger on the row has to keep scrolling the page; touch lifts a
    // person by the grip. And nothing that is itself a control starts a
    // drag — a click into a field is a click into a field.
    const fromGrip = !!target.closest("[data-grip]");
    if (event.pointerType === "touch" && !fromGrip) return;
    if (event.button !== 0 && event.pointerType === "mouse") return;
    if (target.closest("button:not([data-grip]), a, input, textarea, select, label, summary")) return;

    event.preventDefault();
    dragRef.current = index;
    setDragging(index);

    const onMove = (moved: PointerEvent) => {
      const from = dragRef.current;
      if (from === null) return;
      const to = rowAt(moved.clientX, moved.clientY);
      if (to === null || to === from) return;
      setShown((prev) => {
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

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", stop);
    window.addEventListener("pointercancel", stop);
    releaseRef.current = stop;
  }

  useEffect(() => () => releaseRef.current?.(), []);

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="locale" value={locale} />
      {rows.map((id) => (
        <input key={id} type="hidden" name="shown" value={id} />
      ))}

      {/* ── Shown on the site ───────────────────────────── */}
      <section className="rounded-sm border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-start gap-2 text-lg font-semibold">
          <IconUsers size={18} className="mt-0.5 shrink-0 text-red" />
          {t.admin.teamShown}
          <span className="rounded-full bg-fg/10 px-2 text-xs font-bold tabular-nums">{rows.length}</span>
        </h2>
        <p className="field-help mt-1">{t.admin.teamShownHelp}</p>

        {rows.length ? (
          <ol className="mt-4 divide-y divide-line border-y border-line">
            {rows.map((id, index) => {
              const person = byId.get(id)!;
              const draft = drafts[id];
              const role = pickCopy(draft.copy, locale, "role") ?? person.jobTitle;
              const tagline = pickCopy(draft.copy, locale, "tagline");
              const born = draft.birthDate ? new Date(`${draft.birthDate}T00:00:00Z`) : null;
              const age = born && !Number.isNaN(born.getTime()) ? ageFrom(born) : null;

              return (
                <li
                  key={id}
                  data-row={index}
                  className={cn(
                    "py-3 transition-colors duration-150",
                    dragging === index && "pointer-events-none relative z-10 rounded-sm bg-surface-2 opacity-90 ring-2 ring-red",
                  )}
                >
                  <div
                    onPointerDown={(event) => startDrag(event, index)}
                    className={cn(
                      "flex touch-pan-y items-center gap-3 select-none",
                      dragging === null ? "sm:cursor-grab" : "sm:cursor-grabbing",
                    )}
                  >
                    <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-red text-xs font-bold tabular-nums text-white">
                      {index + 1}
                    </span>

                    <button
                      type="button"
                      data-grip
                      aria-label={`${t.admin.reorder} — ${person.name}`}
                      className="flex size-11 shrink-0 cursor-grab touch-none items-center justify-center rounded-sm text-subtle transition-colors duration-200 hover:bg-surface-2 hover:text-fg"
                    >
                      <IconGrip size={16} />
                    </button>

                    <Avatar person={person} />

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{person.name}</p>
                      <p className="truncate text-xs text-subtle">
                        {[role, age !== null ? t.about.age.replace("{n}", formatNumber(age, locale)) : null]
                          .filter(Boolean)
                          .join(" · ") || "—"}
                      </p>
                      {tagline ? <p className="truncate text-xs italic text-muted"><q>{tagline}</q></p> : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-1">
                      <button
                        type="button"
                        onClick={() => move(index, -1)}
                        disabled={index === 0}
                        aria-label={`${t.admin.homeMoveUp} — ${person.name}`}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-sm border border-line text-muted transition-colors duration-200 hover:border-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <IconChevronDown size={15} className="rotate-180" />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(index, 1)}
                        disabled={index === rows.length - 1}
                        aria-label={`${t.admin.homeMoveDown} — ${person.name}`}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-sm border border-line text-muted transition-colors duration-200 hover:border-fg hover:text-fg disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        <IconChevronDown size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={() => hide(id)}
                        aria-label={`${t.admin.teamHide} — ${person.name}`}
                        title={t.admin.teamHide}
                        className="flex size-10 cursor-pointer items-center justify-center rounded-sm text-subtle transition-colors duration-200 hover:bg-red/12 hover:text-red"
                      >
                        <IconX size={16} />
                      </button>
                    </div>
                  </div>

                  {/* ── The public profile ── */}
                  <details className="group mt-2 ms-10 sm:ms-[4.75rem]">
                    <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-red transition-colors duration-200 hover:underline [&::-webkit-details-marker]:hidden">
                      <IconEdit size={14} />
                      {t.admin.teamEdit}
                      <IconChevronDown size={14} className="transition-transform duration-200 group-open:rotate-180" />
                    </summary>

                    <div className="mt-2 space-y-4 rounded-sm border border-line bg-surface-2 p-4">
                      <div className="max-w-xs">
                        <label htmlFor={`birthDate-${id}`} className="label">{t.admin.teamBirthDate}</label>
                        <input
                          id={`birthDate-${id}`}
                          type="date"
                          name={`birthDate:${id}`}
                          value={draft.birthDate}
                          min={earliest}
                          max={latest}
                          onChange={(event) => setBirthDate(id, event.target.value)}
                          className="input"
                        />
                        <p className="field-help mt-1">{t.admin.teamBirthDateHelp}</p>
                      </div>

                      <CopyFields
                        id={id}
                        loc={locale}
                        draft={draft}
                        placeholder={person.jobTitle ?? ""}
                        onChange={setCopy}
                        labels={{ role: t.admin.teamRole, tagline: t.admin.teamTagline, taglineHelp: t.admin.teamTaglineHelp }}
                      />

                      <details className="group/tr">
                        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-sm font-semibold text-muted transition-colors duration-200 hover:text-fg [&::-webkit-details-marker]:hidden">
                          {t.admin.teamTranslations}
                          <IconChevronDown size={14} className="transition-transform duration-200 group-open/tr:rotate-180" />
                        </summary>
                        <p className="field-help mb-3">{t.admin.teamTranslationsHelp}</p>
                        <div className="space-y-5">
                          {others.map((loc) => (
                            <fieldset key={loc} className="border-t border-line pt-3">
                              <legend className="pe-2 text-xs font-bold uppercase tracking-[0.12em] text-subtle">
                                {LOCALE_META[loc].name}
                              </legend>
                              <CopyFields
                                id={id}
                                loc={loc}
                                draft={draft}
                                placeholder=""
                                onChange={setCopy}
                                labels={{ role: t.admin.teamRole, tagline: t.admin.teamTagline }}
                              />
                            </fieldset>
                          ))}
                        </div>
                      </details>
                    </div>
                  </details>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-4 rounded-sm border border-dashed border-line px-4 py-6 text-center text-sm text-muted">
            {t.admin.teamNoneShown}
          </p>
        )}
      </section>

      {/* ── Not on the site ─────────────────────────────── */}
      <section className="rounded-sm border border-line bg-surface p-5 sm:p-6">
        <h2 className="flex items-start gap-2 text-lg font-semibold">
          <IconUser size={18} className="mt-0.5 shrink-0 text-muted" />
          {t.admin.teamHidden}
          <span className="rounded-full bg-fg/10 px-2 text-xs font-bold tabular-nums">{rest.length}</span>
        </h2>
        <p className="field-help mt-1">{t.admin.teamHiddenHelp}</p>

        {rest.length ? (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {rest.map((person) => (
              <li key={person.id} className="flex items-center gap-3 py-3">
                <Avatar person={person} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{person.name}</p>
                  <p className="truncate text-xs text-subtle">{person.jobTitle ?? "—"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => show(person.id)}
                  className="btn btn-ghost btn-sm shrink-0 cursor-pointer"
                >
                  <IconPlus size={15} />
                  {t.admin.teamShow}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-muted">{t.admin.teamNoOther}</p>
        )}
      </section>

      <div className="sticky bottom-[var(--admin-dock,0px)] z-20 -mx-4 flex items-center justify-end gap-3 border-t border-line bg-canvas/90 px-4 py-3 backdrop-blur-xl sm:-mx-6 sm:px-6">
        {state.status === "saved" ? (
          <span className="me-auto flex items-center gap-1.5 text-sm font-medium text-ok">
            <IconCheck size={15} />
            {t.admin.teamSaved}
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

/** The function and the introduction, in one language. */
function CopyFields({
  id,
  loc,
  draft,
  placeholder,
  onChange,
  labels,
}: {
  id: string;
  loc: Locale;
  draft: Draft;
  placeholder: string;
  onChange: (id: string, loc: Locale, field: "role" | "tagline", value: string) => void;
  labels: { role: string; tagline: string; taglineHelp?: string };
}) {
  const entry = draft.copy[loc] ?? {};
  const dir = LOCALE_META[loc].dir;
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label htmlFor={`role-${id}-${loc}`} className="label">{labels.role}</label>
        <input
          id={`role-${id}-${loc}`}
          name={`role:${id}:${loc}`}
          value={entry.role ?? ""}
          onChange={(event) => onChange(id, loc, "role", event.target.value)}
          maxLength={ROLE_MAX}
          placeholder={placeholder}
          lang={LOCALE_META[loc].htmlLang}
          dir={dir}
          className="input"
        />
      </div>
      <div>
        <label htmlFor={`tagline-${id}-${loc}`} className="label">{labels.tagline}</label>
        <textarea
          id={`tagline-${id}-${loc}`}
          name={`tagline:${id}:${loc}`}
          value={entry.tagline ?? ""}
          onChange={(event) => onChange(id, loc, "tagline", event.target.value)}
          maxLength={TAGLINE_MAX}
          rows={2}
          lang={LOCALE_META[loc].htmlLang}
          dir={dir}
          className="input resize-y"
        />
        {labels.taglineHelp ? (
          <p className="field-help mt-1 tabular-nums">
            {labels.taglineHelp} · {(entry.tagline ?? "").length}/{TAGLINE_MAX}
          </p>
        ) : null}
      </div>
    </div>
  );
}
