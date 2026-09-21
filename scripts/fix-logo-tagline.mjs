/**
 * Corrects the two spelling mistakes in the supplied logo's tagline —
 * "compagny" and "Frankfort" — and writes the result as the source every
 * other brand asset is built from.
 *
 * The original artwork is left untouched. Only the tagline is repainted: the
 * measured box below the yellow band is filled with the surrounding white,
 * then the corrected line is drawn back at the same position and the same
 * width, so the logo's proportions do not shift.
 *
 *   node scripts/fix-logo-tagline.mjs
 */

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ORIGINAL = path.join(ROOT, "public/brand/logo.jpg");
const CORRECTED = path.join(ROOT, "public/brand/logo-source.png");

const TEXT = "German company based in Frankfurt";

// Measured ink bounds of the old tagline in the 1500×1500 original.
const INK = { left: 594, right: 823, capTop: 848, baseline: 859 };
// A little air around it, verified clear of the circuit outline.
const ERASE = { left: 586, top: 843, width: 250, height: 25 };

const WIDTH = INK.right - INK.left + 1;
// Cap height maps to roughly 0.72 of the em in a humanist sans.
const FONT_SIZE = Math.round((INK.baseline - INK.capTop) / 0.72);

async function main() {
  const base = sharp(ORIGINAL);
  const { width, height } = await base.metadata();

  const patch = {
    create: {
      width: ERASE.width,
      height: ERASE.height,
      channels: 3,
      background: { r: 255, g: 255, b: 255 },
    },
  };

  // textLength pins the corrected line to the width of the one it replaces,
  // so the tagline still sits centred under the wordmark.
  const svg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
       <text x="${INK.left}" y="${INK.baseline}"
             textLength="${WIDTH}" lengthAdjust="spacingAndGlyphs"
             font-family="Helvetica Neue, Helvetica, Arial, sans-serif"
             font-style="italic" font-size="${FONT_SIZE}" fill="#000">${TEXT}</text>
     </svg>`,
  );

  await base
    .composite([
      { input: patch.create ? await sharp(patch).png().toBuffer() : patch, left: ERASE.left, top: ERASE.top },
      { input: svg, left: 0, top: 0 },
    ])
    .png()
    .toFile(CORRECTED);

  console.log(`Wrote ${path.relative(ROOT, CORRECTED)} — tagline: "${TEXT}" (${FONT_SIZE}px)`);
}

await main();
