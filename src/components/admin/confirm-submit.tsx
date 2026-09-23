"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { IconSpinner, IconTrash } from "@/components/icons";
import { cn } from "@/lib/utils";

/**
 * A destructive submit that asks twice.
 *
 * The first press arms it: the button turns red and says what it is about to
 * do. Only a second press submits. It disarms by itself after a few seconds,
 * on Escape, or when focus leaves it — so a thumb that brushed a bin icon
 * while scrolling a list on a phone deletes nothing.
 *
 * Inline rather than a browser `confirm()`, which some mobile browsers
 * suppress and which cannot be styled or translated beyond its message.
 */
export function ConfirmSubmit({
  label,
  confirm,
  formAction,
  compact = false,
  className,
}: {
  /** What the idle button is called, for screen readers and the tooltip. */
  label: string;
  /** What the armed button says: the consequence, in plain words. */
  confirm: string;
  /** Submit to this action instead of the form's own. */
  formAction?: (formData: FormData) => void | Promise<void>;
  /** Icon-only while idle — for tight rows of actions. */
  compact?: boolean;
  className?: string;
}) {
  const [armed, setArmed] = useState(false);
  const { pending } = useFormStatus();
  const armedRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!armed) return;
    armedRef.current?.focus();
    const timer = setTimeout(() => setArmed(false), 5000);
    return () => clearTimeout(timer);
  }, [armed]);

  if (!armed) {
    return (
      <button
        type="button"
        onClick={() => setArmed(true)}
        aria-label={compact ? label : undefined}
        title={label}
        className={cn(
          "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center gap-1.5 rounded-sm text-subtle transition-colors duration-200 hover:bg-red/12 hover:text-red md:min-h-9 md:min-w-9",
          !compact && "px-3 text-sm font-semibold",
          className,
        )}
      >
        <IconTrash size={16} />
        {compact ? null : label}
      </button>
    );
  }

  return (
    <button
      ref={armedRef}
      type="submit"
      formAction={formAction}
      disabled={pending}
      onBlur={() => setArmed(false)}
      onKeyDown={(event) => {
        if (event.key === "Escape") setArmed(false);
      }}
      aria-live="assertive"
      className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-sm bg-red px-3 text-sm font-semibold text-white shadow-sm transition-colors duration-200 hover:bg-red/90 disabled:opacity-70 md:min-h-9"
    >
      {pending ? <IconSpinner size={15} /> : <IconTrash size={15} />}
      {confirm}
    </button>
  );
}
