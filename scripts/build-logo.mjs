/**
 * Turns the supplied logo JPEG into web assets.
 *
 * The original is a 1500×1500 JPEG on a solid white ground. Two problems for
 * the site: the white box shows against our off-white canvas, and the lockup
 * is mostly empty space. So we key out the white, then cut two crops:
 *
 *   logo-wordmark.png — AUTOHAUS MOTION only, for the header/footer/sidebar
 *   logo-full.png     — the full lockup with the Nürburgring outline
 *
 * White is keyed on the *minimum* RGB channel, not luminance: white has a high
 * minimum, while the brand yellow (#FFC300) and red (#E30613) both have a
 * channel at or near zero, so they survive untouched.
 *
 * Run: node scripts/build-logo.mjs
 */
import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
// The supplied artwork with its tagline spelling corrected. Built by
// scripts/fix-logo-tagline.mjs; logo.jpg is kept untouched as the original.
const SOURCE = path.join(ROOT, "public/brand/logo-source.png");
const OUT = path.join(ROOT, "public/brand");

// Alpha ramp: fully transparent at/above OPAQUE_MAX, fully opaque at/below INK_MAX.
const OPAQUE_MAX = 248;
const INK_MAX = 230;

// Measured ink bounds in the 1500×1500 source.
const CROPS = {
  "logo-wordmark.png": { left: 86, top: 655, width: 1320, height: 192 },
  "logo-full.png": { left: 80, top: 505, width: 1330, height: 560 },
};

async function keyOutWhite(buffer) {
  const { data, info } = await sharp(buffer).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  const out = Buffer.alloc(width * height * 4);

  for (let p = 0; p < width * height; p++) {
    const i = p * channels;
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const min = Math.min(r, g, b);

    let alpha;
    if (min >= OPAQUE_MAX) alpha = 0;
    else if (min <= INK_MAX) alpha = 255;
    else alpha = Math.round((1 - (min - INK_MAX) / (OPAQUE_MAX - INK_MAX)) * 255);

    const o = p * 4;
    out[o] = r;
    out[o + 1] = g;
    out[o + 2] = b;
    out[o + 3] = alpha;
  }

  return sharp(out, { raw: { width, height, channels: 4 } }).png({ compressionLevel: 9, palette: true, colours: 64, dither: 0 }).toBuffer();
}

async function main() {
  const source = await sharp(SOURCE).toBuffer();

  for (const [name, crop] of Object.entries(CROPS)) {
    const cropped = await sharp(source).extract(crop).toBuffer();
    const keyed = await keyOutWhite(cropped);
    // Trim any residual transparent margin so the asset hugs the artwork.
    const trimmed = await sharp(keyed).trim({ threshold: 1 }).png({ compressionLevel: 9, palette: true, colours: 64, dither: 0 }).toBuffer();

    const target = path.join(OUT, name);
    await sharp(trimmed).toFile(target);

    const meta = await sharp(target).metadata();
    console.log(`  · ${name.padEnd(20)} ${meta.width}×${meta.height}  ${(trimmed.length / 1024).toFixed(0)} kB`);
  }

  // Square mark for favicon / OG / app icon: the full lockup centred on white.
  const full = await sharp(path.join(OUT, "logo-full.png")).toBuffer();
  await sharp({
    create: { width: 1024, height: 1024, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: await sharp(full).resize({ width: 880, fit: "inside" }).toBuffer(), gravity: "centre" }])
    .png()
    .toFile(path.join(OUT, "logo-square.png"));
  console.log("  · logo-square.png     1024×1024  (favicon / OG)");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

/**
 * Light-on-dark variants.
 *
 * The wordmark's "AUTO" is near-black, which disappears on the dark theme's
 * canvas. Only the dark ink is lifted to the off-white the dark theme uses for
 * text — the red of "HAUS", the gold bar and the circuit outline keep their
 * exact values, so the mark stays the same mark.
 */
async function buildDarkVariants() {
  const INK_MAX_LIFT = 120; // below this on every channel counts as the black ink
  const LIFT = [245, 242, 239]; // --color-fg of the dark theme

  for (const name of ["logo-wordmark.png", "logo-full.png"]) {
    const file = path.join(OUT, name);
    const { data, info } = await sharp(file).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const { width, height } = info;

    for (let p = 0; p < width * height; p++) {
      const i = p * 4;
      if (data[i + 3] === 0) continue;
      const r = data[i], g = data[i + 1], b = data[i + 2];
      // Only neutral dark pixels: leaves red and gold untouched, and keeps the
      // anti-aliased edges neutral by scaling rather than flattening.
      const max = Math.max(r, g, b);
      const spread = max - Math.min(r, g, b);
      if (max > INK_MAX_LIFT || spread > 26) continue;
      const k = 1 - max / INK_MAX_LIFT;
      data[i] = Math.round(r + (LIFT[0] - r) * k);
      data[i + 1] = Math.round(g + (LIFT[1] - g) * k);
      data[i + 2] = Math.round(b + (LIFT[2] - b) * k);
    }

    const target = path.join(OUT, name.replace(".png", "-dark.png"));
    await sharp(data, { raw: { width, height, channels: 4 } })
      .png({ compressionLevel: 9, palette: true, colours: 64, dither: 0 })
      .toFile(target);
    const { size } = await sharp(target).metadata().then(async (m) => ({ size: m.size ?? 0 }));
    console.log(`  · ${path.basename(target)}  ${width}×${height}  ${Math.round((size || 0) / 1024)} kB`);
  }
}

await buildDarkVariants();
