"use client";

import { useEffect } from "react";

/**
 * Puts the Big Toys universe on the document itself.
 *
 * The page content and the header carry `data-universe` in their own markup,
 * so they are dressed from the first paint. Two things are outside both and
 * cannot be: the footer, which the site layout renders after the page, and
 * the body background, which shows through the overscroll bounce on iOS.
 * Setting the attribute on <html> covers all of it at once.
 *
 * Rendered twice on purpose. The inline script runs while the browser is
 * still parsing the page — above the footer, and before anything has been
 * painted — so the first load has no flash of the light site. The effect
 * takes over for client-side navigation and, more importantly, removes the
 * attribute again when the visitor leaves for a car page.
 */

const APPLY = 'document.documentElement.dataset.universe="toys"';

export function UniverseScope() {
  useEffect(() => {
    document.documentElement.dataset.universe = "toys";
    return () => { delete document.documentElement.dataset.universe; };
  }, []);

  return <script dangerouslySetInnerHTML={{ __html: APPLY }} />;
}
