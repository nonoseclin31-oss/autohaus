"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { getDictionary, localePath, type Locale } from "@/i18n";
import { deleteVehicleTemplate } from "@/app/actions/vehicles";
import { IconLayers, IconSearch, IconX, IconCheck } from "@/components/icons";
import { ConfirmSubmit } from "./confirm-submit";
import { cn } from "@/lib/utils";

export type PickableTemplate = {
  id: string;
  name: string;
  brand: string;
  model: string;
  version: string | null;
  usageCount: number;
  authorName: string | null;
  /** Decided on the server: its author, or anyone who may edit any listing. */
  deletable: boolean;
};

/**
 * Start a listing from a saved template.
 *
 * A dealership accumulates these, so the list is searchable rather than a
 * dropdown: typing matches the template's name and the car it describes, which
 * is how someone actually looks for one ("RS3", "berline diesel", "Hans").
 * Choosing one is a plain link — the page reloads with the values filled in
 * server-side, so nothing has to be poked into the form afterwards.
 */
export function TemplatePicker({
  locale,
  templates,
}: {
  locale: Locale;
  templates: PickableTemplate[];
}) {
  const t = getDictionary(locale);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  // The picker sits inside the form's sticky section nav, and a sticky element
  // creates its own stacking context — so a dialog rendered in place is
  // trapped inside it and the save bar lower down the form paints over it. A
  // portal puts the dialog on the body, where its z-index means what it says.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // Escape closes it, and the page behind does not scroll while it is open.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open]);

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return templates;
    return templates.filter((template) =>
      `${template.name} ${template.brand} ${template.model} ${template.version ?? ""} ${template.authorName ?? ""}`
        .toLowerCase()
        .includes(needle),
    );
  }, [templates, query]);

  if (!templates.length) return null;

  const dialog = (
    <div
      className="fixed inset-0 z-[70] flex items-start justify-center bg-ink/60 p-4 pt-[8vh] backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label={t.admin.useTemplate}
      onClick={(event) => {
        if (event.target === event.currentTarget) setOpen(false);
      }}
    >
      <div className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden rounded-sm border border-line bg-canvas shadow-[var(--shadow-lg)]">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="display text-xl">{t.admin.useTemplate}</h2>
          <button
            type="button"
            onClick={() => setOpen(false)}
            aria-label={t.common.close}
            className="cursor-pointer rounded-sm p-1 text-subtle transition-colors duration-200 hover:text-fg"
          >
            <IconX size={18} />
          </button>
        </div>

        <div className="border-b border-line px-5 py-3">
          <div className="relative">
            <IconSearch
              size={15}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-subtle"
            />
            <input
              autoFocus
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={t.admin.searchTemplates}
              className="input ps-9"
            />
          </div>
        </div>

        <ul className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {matches.length ? (
            matches.map((template) => (
              <li key={template.id} className="border-b border-line last:border-0">
                <div className="flex items-center gap-3 px-5 py-3 transition-colors duration-200 hover:bg-surface-2">
                  <Link
                    href={localePath(locale, `/admin/vehicles/new?template=${template.id}`)}
                    className="min-w-0 flex-1 cursor-pointer"
                  >
                    <span className="block truncate font-semibold">{template.name}</span>
                    <span className="block truncate text-sm text-muted">
                      {[template.brand, template.model, template.version].filter(Boolean).join(" ")}
                      {template.authorName ? ` · ${template.authorName}` : ""}
                      {template.usageCount > 0 ? ` · ${template.usageCount}×` : ""}
                    </span>
                  </Link>

                  {template.deletable ? (
                    <form action={deleteVehicleTemplate}>
                      <input type="hidden" name="id" value={template.id} />
                      <input type="hidden" name="locale" value={locale} />
                      <ConfirmSubmit compact label={`${t.common.delete} — ${template.name}`} confirm={t.admin.confirmDelete} />
                    </form>
                  ) : null}
                </div>
              </li>
            ))
          ) : (
            <li className="px-5 py-8 text-center text-sm text-muted">{t.admin.noTemplateMatch}</li>
          )}
        </ul>
      </div>
    </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-solid w-full cursor-pointer justify-start"
      >
        <IconLayers size={16} />
        {t.admin.useTemplate}
        <span className="ms-auto rounded-full bg-fg/10 px-1.5 text-xs font-bold tabular-nums">
          {templates.length}
        </span>
      </button>

      {open && mounted ? createPortal(dialog, document.body) : null}
    </>
  );
}


/**
 * Names a template before the form submits it.
 *
 * The name cannot be collected after submission — the action needs it — so the
 * button reveals a field and the confirm inside it is what actually submits,
 * carrying intent=template.
 */
export function TemplateNameField({ locale, saved }: { locale: Locale; saved?: string }) {
  const t = getDictionary(locale);
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [confirmed, setConfirmed] = useState<string | null>(null);

  // The confirmation stands in for the button, so it has to step aside again —
  // otherwise a second template cannot be saved without reloading the page.
  useEffect(() => {
    if (!saved) return;
    setConfirmed(saved);
    setOpen(false);
    setName("");
    const timer = setTimeout(() => setConfirmed(null), 4000);
    return () => clearTimeout(timer);
  }, [saved]);

  if (confirmed) {
    return (
      <span className="flex items-center justify-center gap-1.5 py-2 text-sm font-medium text-ok md:justify-start md:py-0">
        <IconCheck size={15} />
        {t.admin.templateSaved}
      </span>
    );
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-solid w-full cursor-pointer md:w-auto">
        <IconLayers size={16} />
        {t.admin.saveTemplate}
      </button>
    );
  }

  return (
    <div className="flex w-full flex-wrap items-center gap-2 md:w-auto md:flex-nowrap">
      <input
        autoFocus
        name="templateName"
        value={name}
        onChange={(event) => setName(event.target.value)}
        maxLength={80}
        placeholder={t.admin.templateNamePlaceholder}
        className="input h-11 w-full md:h-10 md:w-56"
        // Enter would submit the form with the primary button's intent, which
        // would publish the listing instead of saving a template.
        onKeyDown={(event) => event.key === "Enter" && event.preventDefault()}
      />
      <button
        type="submit"
        name="intent"
        value="template"
        formNoValidate
        disabled={!name.trim()}
        className={cn("btn btn-primary flex-1 cursor-pointer md:flex-none", !name.trim() && "opacity-50")}
      >
        <IconCheck size={16} />
        {t.common.save}
      </button>
      <button
        type="button"
        onClick={() => setOpen(false)}
        aria-label={t.common.cancel}
        className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center rounded-sm text-subtle transition-colors duration-200 hover:text-fg md:h-9 md:w-9"
      >
        <IconX size={16} />
      </button>
    </div>
  );
}
