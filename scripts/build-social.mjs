/**
 * The pictures the site shows when it is not being read.
 *
 * Two jobs the plain logo does badly on its own:
 *
 *   opengraph-image — the card a messaging app draws when someone pastes the
 *     URL. The logo on a white ground reads as a missing image; on the
 *     dealership's own ink, with its warm wash, it reads as a brand.
 *
 *   icon / apple-icon — the browser tab. The full lockup shrunk to 16px is an
 *     unreadable smudge, so the tab mark is the wordmark's own "A" on the
 *     German bar: the same artwork, cropped to the one element that survives
 *     being that small.
 *
 * Run: node scripts/build-social.mjs
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const BRAND = path.join(ROOT, "public/brand");
const APP = path.join(ROOT, "src/app");
/** The supplied artwork, tagline corrected — the highest-fidelity copy there is. */
const SOURCE = path.join(BRAND, "logo-source.png");

/* The dealership's ink and its two accents, straight from globals.css. */
const INK = { r: 0x12, g: 0x10, b: 0x0f };
const RED = "#e30613";
const GOLD = "#ffc300";

/** The warm wash behind the hero, as an SVG the compositor can rasterise. */
function wash(width, height) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <radialGradient id="a" cx="14%" cy="0%" r="62%">
        <stop offset="0%" stop-color="${RED}" stop-opacity="0.30"/>
        <stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="b" cx="90%" cy="10%" r="58%">
        <stop offset="0%" stop-color="${GOLD}" stop-opacity="0.13"/>
        <stop offset="100%" stop-color="${GOLD}" stop-opacity="0"/>
      </radialGradient>
      <radialGradient id="c" cx="50%" cy="108%" r="70%">
        <stop offset="0%" stop-color="${RED}" stop-opacity="0.11"/>
        <stop offset="100%" stop-color="${RED}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="100%" height="100%" fill="url(#a)"/>
    <rect width="100%" height="100%" fill="url(#b)"/>
    <rect width="100%" height="100%" fill="url(#c)"/>
  </svg>`);
}

/** The German rule the site closes its header with. */
function flagRule(width, height) {
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <rect x="0" y="0" width="${width / 3}" height="${height}" fill="#1c1917"/>
    <rect x="${width / 3}" y="0" width="${width / 3}" height="${height}" fill="${RED}"/>
    <rect x="${(width * 2) / 3}" y="0" width="${width / 3}" height="${height}" fill="${GOLD}"/>
  </svg>`);
}

/**
 * Where the supplied artwork's ink actually sits in the 1500x1500 original —
 * the full lockup, wordmark and circuit together. Measured, not guessed.
 */
const LOCKUP = { left: 91, top: 514, width: 1307, height: 542 };

async function buildOpenGraph() {
  const W = 1200, H = 630, RULE = 6;

  // Cut from the supplied artwork itself rather than from public/brand's
  // derived assets. Those are palette-reduced to 64 colours to keep a header
  // logo light — right for a 32px mark on every page, wrong for the one
  // picture of this company that a messaging app will ever show. The source
  // holds some three thousand colours; the derivative holds two hundred, and
  // it is the thin circuit outline and the small tagline that pay for it.
  const lockup = await sharp(SOURCE)
    .extract(LOCKUP)
    .resize({ width: 960, fit: "inside", kernel: sharp.kernel.lanczos3 })
    .toBuffer();
  const { width: lw, height: lh } = await sharp(lockup).metadata();

  const card = await sharp({
    create: { width: W, height: H, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([
      // Optically centred: the rule at the foot pulls the eye down, so the
      // lockup sits a touch above the true middle.
      { input: lockup, top: Math.round((H - RULE - lh) / 2) - 10, left: Math.round((W - lw) / 2) },
      { input: flagRule(W, RULE), top: H - RULE, left: 0 },
    ])
    // No palette: this file is fetched once by a link preview, never by a
    // visitor loading a page, so its weight buys nothing and its fidelity
    // is the whole point.
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp(card).toFile(path.join(APP, "opengraph-image.png"));
  await sharp(card).toFile(path.join(APP, "twitter-image.png"));
  console.log(`  · opengraph-image.png  ${W}x${H}  ${(card.length / 1024).toFixed(0)} kB  (lockup ${lw}x${lh})`);
  console.log(`  · twitter-image.png    ${W}x${H}  (same card)`);
}

/**
 * The tab mark.
 *
 * The wordmark's letters are steeply italic and interlock, so there is no
 * column of blank pixels between the "A" and the "U" to find — an automatic
 * letter split returns the whole word. The crop is therefore measured once
 * and written down: 168 px of a 1314 px wordmark is the complete A with its
 * slice of the German bar, and clipping either side of that either cuts the
 * A's right leg or starts eating the U.
 *
 * Taken from the light-on-dark wordmark so the letter arrives already
 * inverted, which leaves the red and gold of the bar at their exact values.
 */
const LETTER_A = { left: 0, top: 0, width: 168 };

async function buildIcons() {
  const source = path.join(BRAND, "logo-wordmark-dark.png");
  const { height: srcH } = await sharp(source).metadata();
  const crop = { ...LETTER_A, height: srcH };

  const SIZE = 512;
  const letter = await sharp(source)
    .extract(crop)
    .resize({ height: Math.round(SIZE * 0.54), fit: "inside" })
    .toBuffer();
  const { width: lw, height: lh } = await sharp(letter).metadata();

  const mark = await sharp({
    create: { width: SIZE, height: SIZE, channels: 4, background: { ...INK, alpha: 1 } },
  })
    .composite([
      { input: wash(SIZE, SIZE), top: 0, left: 0 },
      {
        input: letter,
        top: Math.round((SIZE - lh) / 2),
        left: Math.round((SIZE - lw) / 2),
      },
    ])
    .png({ compressionLevel: 9 })
    .toBuffer();

  await sharp(mark).toFile(path.join(APP, "icon.png"));
  await sharp(mark).resize(180, 180).png({ compressionLevel: 9 }).toFile(path.join(APP, "apple-icon.png"));
  console.log(`  · icon.png             ${SIZE}×${SIZE}  (letter ${lw}×${lh})`);
  console.log("  · apple-icon.png       180×180");
}

console.log("Building social and tab artwork…");
await buildOpenGraph();
await buildIcons();
