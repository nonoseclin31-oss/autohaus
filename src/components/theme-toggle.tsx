"use client";

import { useEffect, useState } from "react";
import { getDictionary, type Locale } from "@/i18n";
import { IconSun, IconMoon } from "@/components/icons";

export const THEME_STORAGE_KEY = "am-theme";

/**
 * Switches the site between the light and dark palettes.
 *
 * The choice lives in localStorage and is applied by the inline script in the
 * document head, before the first paint — a preference read after hydration
 * would show the wrong theme for a moment on every page load.
 *
 * The button renders its label only once mounted. Before that the component
 * cannot know which theme is active (the server does not), and guessing would
 * mean announcing the wrong one to a screen reader.
 */
export function ThemeToggle({ locale, className }: { locale: Locale; className?: string }) {
  const t = getDictionary(locale);
  const [theme, setTheme] = useState<"light" | "dark" | null>(null);

  useEffect(() => {
    const current = document.documentElement.dataset.theme === "dark" ? "dark" : "light";
    setTheme(current);
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private browsing can refuse storage; the theme still applies for
      // this page, it just will not be remembered.
    }
  }

  const label = theme === "dark" ? t.common.themeLight : t.common.themeDark;

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className={
        className ??
        "inline-flex size-9 cursor-pointer items-center justify-center rounded-sm text-muted transition-colors duration-200 hover:bg-surface-2 hover:text-fg"
      }
    >
      {/* Both icons ship; which one shows is decided once mounted, so the
          button never flips shape under the pointer. */}
      {theme === null ? (
        <span className="size-[18px]" aria-hidden="true" />
      ) : theme === "dark" ? (
        <IconSun size={18} />
      ) : (
        <IconMoon size={18} />
      )}
    </button>
  );
}

/**
 * Applies the stored theme before the page paints.
 *
 * Rendered as a blocking inline script in <head>: anything later, including
 * an effect, runs after the first paint and the light theme flashes.
 */
export function ThemeScript() {
  const script = `try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(t==="dark"||t==="light"){document.documentElement.dataset.theme=t}}catch(e){}`;
  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
