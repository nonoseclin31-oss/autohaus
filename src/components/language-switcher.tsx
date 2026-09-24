"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { LOCALES, LOCALE_META, switchLocalePath, type Locale } from "@/i18n";
import { IconGlobe, IconChevronDown, IconCheck } from "./icons";
import { cn } from "@/lib/utils";

export function LanguageSwitcher({
  locale,
  label,
  compact = false,
}: {
  locale: Locale;
  label: string;
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node)) setOpen(false);
    }
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function choose(next: Locale) {
    document.cookie = `NEXT_LOCALE=${next}; path=/; max-age=31536000; samesite=lax`;
    setOpen(false);
    router.push(switchLocalePath(pathname, next));
    router.refresh();
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={label}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-sm border border-line px-2.5 py-2 text-sm font-semibold",
          "text-muted transition-colors duration-200 hover:border-line-strong hover:text-fg",
          compact && "px-2",
        )}
      >
        <IconGlobe size={17} />
        <span className="uppercase tracking-wider">{locale}</span>
        {/* The globe and the code say "language" on their own; on a phone the
            arrow's width is better spent keeping the header off the edge. */}
        <IconChevronDown size={14} className={cn("hidden transition-transform duration-200 sm:block", open && "rotate-180")} />
      </button>

      {open ? (
        <div
          role="listbox"
          aria-label={label}
          className="absolute inset-inline-end-0 end-0 z-50 mt-2 w-48 overflow-hidden rounded-sm border border-line bg-surface shadow-[var(--shadow-lg)] animate-fade"
        >
          {LOCALES.map((code) => {
            const meta = LOCALE_META[code];
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => choose(code)}
                dir={meta.dir}
                className={cn(
                  "flex w-full cursor-pointer items-center justify-between gap-3 px-3 py-2.5 text-start text-sm transition-colors duration-150",
                  active ? "bg-surface-3 text-fg" : "text-muted hover:bg-surface-2 hover:text-fg",
                )}
              >
                <span className="flex items-center gap-2.5">
                  <span className="w-7 shrink-0 text-[10px] font-bold uppercase tracking-widest text-subtle">{code}</span>
                  <span className="font-medium">{meta.name}</span>
                </span>
                {active ? <IconCheck size={15} className="text-red" /> : null}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
