import { Inter, Playfair_Display, Barlow_Condensed } from "next/font/google";

/* Inter carries the interface and all data; Playfair gives the editorial
   display voice; Barlow Condensed carries the racing wordmark and, upright,
   the whole Big Toys universe. */
const inter = Inter({
  subsets: ["latin", "latin-ext"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin", "latin-ext"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

const barlowCondensed = Barlow_Condensed({
  subsets: ["latin"],
  weight: ["700", "800"],
  // Italic for the racing wordmark, upright for the Big Toys display voice.
  style: ["normal", "italic"],
  variable: "--font-barlow-condensed",
  display: "swap",
});

/**
 * The three families as CSS variables, for the <html> of each document that
 * stands on its own: the site, and the 404 page for addresses outside it.
 */
export const fontVariables = `${inter.variable} ${playfair.variable} ${barlowCondensed.variable}`;
