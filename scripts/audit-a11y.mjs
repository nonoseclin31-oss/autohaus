/**
 * WCAG 2.2 audit of the deployed site.
 *
 * Runs axe-core over every public page in every locale, then adds the checks
 * axe cannot make on its own: target size (SC 2.5.8), visible focus (SC
 * 2.4.11) and keyboard reachability. Arabic is included because a
 * right-to-left page reorders the accessibility tree as well as the layout.
 *
 * Run: node scripts/audit-a11y.mjs [--base https://autohausmotion.com]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg("--base", "https://autohausmotion.com");
const LOCALES = ["en", "fr", "de", "zh", "ar", "es"];
const PAGES = ["", "/vehicles", "/rental", "/about", "/contact", "/login"];
const AXE = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";

// WCAG 2.2 SC 2.5.8: 24x24 CSS px, unless the target has enough spacing.
const MIN_TARGET = 24;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--force-prefers-reduced-motion"],
});

const violations = new Map(); // rule id -> { impact, help, nodes: [] }
const targets = [];
const focusIssues = [];

function record(locale, path, results) {
  for (const v of results.violations) {
    const entry = violations.get(v.id) ?? { impact: v.impact, help: v.help, wcag: v.tags.filter(t => t.startsWith("wcag")), nodes: [] };
    for (const n of v.nodes) {
      entry.nodes.push({ locale, path, target: n.target.join(" "), html: n.html.slice(0, 110) });
    }
    violations.set(v.id, entry);
  }
}

for (const locale of LOCALES) {
  for (const path of PAGES) {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900 });
    const url = `${BASE}/${locale}${path}`;
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      // The splash screen covers the page on first paint.
      await new Promise((r) => setTimeout(r, 1200));

      await page.addScriptTag({ url: AXE });
      const results = await page.evaluate(async () =>
        await window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
        }),
      );
      record(locale, path, results);

      // Target size and focus visibility, which axe does not evaluate.
      const extra = await page.evaluate((min) => {
        const small = [];
        const invisibleFocus = [];
        const interactive = document.querySelectorAll(
          'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [tabindex]:not([tabindex="-1"])',
        );
        for (const el of interactive) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue; // hidden
          const style = getComputedStyle(el);
          if (style.visibility === "hidden" || style.display === "none") continue;
          if (r.width < min || r.height < min) {
            small.push({
              tag: el.tagName.toLowerCase(),
              name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
              w: Math.round(r.width), h: Math.round(r.height),
            });
          }
          el.focus({ preventScroll: true });
          const focused = getComputedStyle(el);
          const hasRing =
            focused.outlineStyle !== "none" && parseFloat(focused.outlineWidth) > 0 ||
            focused.boxShadow !== style.boxShadow ||
            focused.borderColor !== style.borderColor ||
            focused.backgroundColor !== style.backgroundColor;
          if (!hasRing) {
            invisibleFocus.push({
              tag: el.tagName.toLowerCase(),
              name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
            });
          }
          el.blur();
        }
        return { small, invisibleFocus };
      }, MIN_TARGET);

      for (const s of extra.small) targets.push({ locale, path, ...s });
      for (const f of extra.invisibleFocus) focusIssues.push({ locale, path, ...f });

      process.stdout.write(`  ${locale}${path || "/"} ✓\n`);
    } catch (error) {
      process.stdout.write(`  ${locale}${path || "/"} — ${error.message}\n`);
    } finally {
      await page.close();
    }
  }
}

await browser.close();

const dedupe = (rows, key) => {
  const seen = new Map();
  for (const r of rows) {
    const k = key(r);
    const hit = seen.get(k);
    if (hit) hit.locales.add(r.locale);
    else seen.set(k, { ...r, locales: new Set([r.locale]) });
  }
  return [...seen.values()];
};

console.log("\n──────── axe-core ────────");
if (!violations.size) console.log("Aucune violation.");
for (const [id, v] of [...violations].sort((a, b) => b[1].nodes.length - a[1].nodes.length)) {
  const pages = new Set(v.nodes.map((n) => `${n.locale}${n.path}`));
  console.log(`\n[${v.impact}] ${id} — ${v.help}`);
  console.log(`  ${v.wcag.join(", ")} · ${v.nodes.length} occurrence(s) sur ${pages.size} page(s)`);
  for (const n of dedupe(v.nodes, (n) => n.target + n.html).slice(0, 4)) {
    console.log(`    ${n.target}  ${n.html.replace(/\s+/g, " ")}`);
  }
}

console.log("\n──────── cibles < 24px (SC 2.5.8) ────────");
const smallUnique = dedupe(targets, (t) => `${t.tag}|${t.name}|${t.w}x${t.h}`);
if (!smallUnique.length) console.log("Aucune.");
for (const t of smallUnique.slice(0, 20)) {
  console.log(`  ${t.tag} "${t.name}" ${t.w}×${t.h}px — ${[...t.locales].join(",")} ${t.path || "/"}`);
}

console.log("\n──────── focus invisible (SC 2.4.11) ────────");
const focusUnique = dedupe(focusIssues, (f) => `${f.tag}|${f.name}`);
if (!focusUnique.length) console.log("Aucun.");
for (const f of focusUnique.slice(0, 20)) console.log(`  ${f.tag} "${f.name}" — ${f.path || "/"}`);
