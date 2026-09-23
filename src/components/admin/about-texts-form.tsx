"use client";

import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { saveAboutTexts, type AboutTextsState } from "@/app/actions/settings";
import { getDictionary, localePath, LOCALE_META, type Locale } from "@/i18n";
import { LOCALES } from "@/lib/taxonomy";
import { ABOUT_TEXTS, ABOUT_TEXT_MAX, type AboutText } from "@/lib/about-texts";
import { IconCheck, IconSpinner, IconAlert, IconChevronDown, IconArrowRight } from "@/components/icons";

type Texts = Record<Locale, Record<AboutText, string>>;

/**
 * The two paragraphs that present the company on the About page — and only
 * those: the headings, the commitments and the team have their own places.
 *
 * Every language arrives filled with what the page shows today, so the
 * administrator edits a text rather than writes one from nothing. The
 * language the back office is used in comes first and open; the other five
 * are folded, each one marked when it has been rewritten.
 */
export function AboutTextsForm({
  locale,
  current,
  originals,
}: {
  locale: Locale;
  /** What the page shows today, per language. */
  current: Texts;
  /** The text the site ships with, per language — what "restore" puts back. */
  originals: Texts;
}) {
  const t = getDictionary(locale);
  const [state, action] = useActionState<AboutTextsState, FormData>(saveAboutTexts, { status: "idle" });
  const [texts, setTexts] = useState<Texts>(current);

  const others = LOCALES.filter((l) => l !== locale);
  const changed = (loc: Locale) => ABOUT_TEXTS.some((k) => texts[loc][k].trim() !== originals[loc][k].trim());

  function set(loc: Locale, key: AboutText, value: string) {
    setTexts((prev) => ({ ...prev, [loc]: { ...prev[loc], [key]: value } }));
  }

  function language(loc: Locale) {
    const meta = LOCALE_META[loc];
    return (
      <div className="space-y-4">
        {ABOUT_TEXTS.map((key, i) => {
          const value = texts[loc][key];
          const edited = value.trim() !== originals[loc][key].trim();
          const id = `about-${key}-${loc}`;
          return (
            <div key={key}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <label htmlFor={id} className="label">
                  {i === 0 ? t.admin.aboutTextsFirst : t.admin.aboutTextsSecond}
                </label>
                {edited ? (
                  <button
                    type="button"
                    onClick={() => set(loc, key, originals[loc][key])}
                    className="min-h-11 cursor-pointer text-xs font-semibold text-red transition-colors duration-200 hover:underline"
                  >
                    {t.admin.aboutTextsRestore}
                  </button>
                ) : null}
              </div>
              <textarea
                id={id}
                name={`${key}:${loc}`}
                value={value}
                onChange={(event) => set(loc, key, event.target.value)}
                maxLength={ABOUT_TEXT_MAX}
                rows={6}
                lang={meta.htmlLang}
                dir={meta.dir}
                className="input min-h-36 resize-y leading-relaxed"
              />
              <p className="field-help mt-1 tabular-nums">
                {value.length}/{ABOUT_TEXT_MAX}
                {edited ? <span className="ms-2 font-semibold text-bronze">· {t.admin.aboutTextsEdited}</span> : null}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <form id="about-texts" action={action} className="max-w-2xl scroll-mt-24 space-y-4 rounded-sm border border-line bg-surface p-5">
      <input type="hidden" name="locale" value={locale} />

      <div>
        <h2 className="text-base font-semibold">{t.admin.aboutTextsTitle}</h2>
        <p className="field-help mt-1">{t.admin.aboutTextsHelp}</p>
        <Link
          href={localePath(locale, "/about")}
          target="_blank"
          className="mt-2 inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-sm font-semibold text-red transition-colors duration-200 hover:underline"
        >
          {t.admin.viewSite}
          <IconArrowRight size={15} />
        </Link>
      </div>

      {state.status === "success" ? (
        <p role="status" className="flex items-center gap-2 rounded-sm border border-ok/40 bg-ok-wash px-4 py-3 text-sm">
          <IconCheck size={16} className="shrink-0 text-ok" />
          {t.admin.aboutTextsSaved}
        </p>
      ) : null}
      {state.status === "error" ? (
        <p role="alert" className="flex items-start gap-2 rounded-sm border border-red/40 bg-red/10 px-4 py-3 text-sm">
          <IconAlert size={16} className="mt-0.5 shrink-0 text-red" />
          {state.message === "forbidden" ? t.admin.permDenied : t.common.error}
        </p>
      ) : null}

      <fieldset className="border-t border-line pt-4">
        <legend className="pe-2 text-xs font-bold uppercase tracking-[0.12em] text-subtle">
          {LOCALE_META[locale].name}
        </legend>
        {language(locale)}
      </fieldset>

      <div className="border-t border-line pt-2">
        <p className="field-help mb-2">{t.admin.aboutTextsTranslationsHelp}</p>
        <div className="divide-y divide-line">
          {others.map((loc) => (
            <details key={loc} className="group">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-sm font-semibold [&::-webkit-details-marker]:hidden">
                <span className="flex items-center gap-2">
                  {LOCALE_META[loc].name}
                  {changed(loc) ? (
                    <span className="rounded-full bg-gold-wash px-2 py-0.5 text-[11px] font-bold text-bronze">
                      {t.admin.aboutTextsEdited}
                    </span>
                  ) : null}
                </span>
                <IconChevronDown size={16} className="shrink-0 text-muted transition-transform duration-200 group-open:rotate-180" />
              </summary>
              <div className="pb-4">{language(loc)}</div>
            </details>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 border-t border-line pt-4">
        <SaveButton idle={t.common.save} busy={t.common.saving} />
      </div>
    </form>
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
