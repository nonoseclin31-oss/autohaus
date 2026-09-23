import type { Locale } from "./taxonomy";

/**
 * The two paragraphs presenting the company on the About page, as the back
 * office and the page both name them. Pure data, no database, so the admin
 * form in the browser shares the same keys and limits as the server.
 */
export const ABOUT_TEXTS = ["body1", "body2"] as const;
export type AboutText = (typeof ABOUT_TEXTS)[number];

/** Longest paragraph the form accepts — about three times today's. */
export const ABOUT_TEXT_MAX = 1500;

export const aboutTextKey = (text: AboutText, locale: Locale) => `about.${text}.${locale}`;
