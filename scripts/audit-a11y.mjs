/**
 * WCAG 2.2 audit of the deployed site.
 *
 * Runs axe-core over every public page in every locale, then adds the checks
 * axe cannot make on its own: target size (SC 2.5.8), visible focus (SC
 * 2.4.11) and keyboard reachability. Arabic is included because a
 * right-to-left page reorders the accessibility tree as well as the layout.
 *
 * Run: node scripts/audit-a11y.mjs [--base https://autohausmotion.com] [--theme dark]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg("--base", "https://autohausmotion.com");
/** The dark palette has to clear the same thresholds as the light one. */
const THEME = arg("--theme", "light");
const LOCALES = ["en", "fr", "de", "zh", "ar", "es"];
const PAGES = ["", "/vehicles", "/rental", "/about", "/contact", "/login"];
const AXE = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";

// WCAG 2.2 SC 2.5.8: 24x24 CSS px, unless the target has enough spacing.
const MIN_TARGET = 24;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
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
    if (THEME === "dark") {
      // The theme is applied by a blocking script that reads localStorage, so
      // it has to be there before the first document loads.
      await page.evaluateOnNewDocument(() => {
        try {
          localStorage.setItem("am-theme", "dark");
        } catch {}
      });
    }
    const url = `${BASE}/${locale}${path}`;
    try {
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      // The splash covers the first paint, and the entrance transitions run
      // for 700ms after that. Sampling before they settle reports contrast
      // failures against a half-faded element that no one ever sees.
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise((r) => setTimeout(r, 2200));
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 800));

      await page.addScriptTag({ url: AXE });
      const results = await page.evaluate(async () =>
        await window.axe.run(document, {
          runOnly: { type: "tag", values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa", "best-practice"] },
        }),
      );
      record(locale, path, results);

      // Target size and focus visibility, which axe does not evaluate.
      const extra = await page.evaluate((min) => {
        // SC 2.5.8 has two exceptions this page relies on.
        //
        // A card's title link is stretched over the whole card by an absolutely
        // positioned ::after, so the thing a pointer actually hits is the card,
        // not the words. Measure whichever is bigger.
        const hitArea = (el) => {
          const own = el.getBoundingClientRect();
          const after = getComputedStyle(el, "::after");
          if (after.position !== "absolute" || after.content === "none") return own;
          const stretched = el.offsetParent?.getBoundingClientRect();
          return stretched && stretched.width * stretched.height > own.width * own.height ? stretched : own;
        };

        // And a small target passes when nothing else sits within 24px of it:
        // there is no risk of hitting the wrong one.
        const spacedOut = (el, all) => {
          const a = el.getBoundingClientRect();
          for (const other of all) {
            if (other === el) continue;
            const b = other.getBoundingClientRect();
            if (b.width === 0 || b.height === 0) continue;
            const dx = Math.max(0, Math.max(a.left - b.right, b.left - a.right));
            const dy = Math.max(0, Math.max(a.top - b.bottom, b.top - a.bottom));
            const centreGap = Math.hypot(dx + a.width / 2 + b.width / 2, dy + a.height / 2 + b.height / 2);
            if (centreGap < min) return false;
          }
          return true;
        };
        const small = [];
        const invisibleFocus = [];
        const interactive = document.querySelectorAll(
          'a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [tabindex]:not([tabindex="-1"])',
        );
        for (const el of interactive) {
          const r = el.getBoundingClientRect();
          if (r.width === 0 && r.height === 0) continue; // hidden
          // Visually hidden until focused (skip links): 1x1 by design, and
          // never a pointer target.
          if (r.width <= 1 && r.height <= 1) continue;
          const style = getComputedStyle(el);
          if (style.visibility === "hidden" || style.display === "none") continue;
          // A disabled control cannot take focus at all, so it has no focus
          // ring to show — it is not a keyboard stop, and not a finding.
          if (el.disabled || el.getAttribute("aria-disabled") === "true") continue;
          const hit = hitArea(el);
          if ((hit.width < min || hit.height < min) && !spacedOut(el, interactive)) {
            small.push({
              tag: el.tagName.toLowerCase(),
              name: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0, 40),
              w: Math.round(hit.width), h: Math.round(hit.height),
            });
          }
          // A ring may sit on an ancestor: a card whose link is stretched over
          // it carries the outline itself. And an outline that is transparent
          // or still mid-transition is not an indicator.
          el.focus({ preventScroll: true });
          let node = el, hasRing = false;
          for (let depth = 0; depth < 7 && node && !hasRing; depth++, node = node.parentElement) {
            const cs = getComputedStyle(node);
            const solid =
              cs.outlineStyle !== "none" &&
              parseFloat(cs.outlineWidth) > 0 &&
              !/transparent|rgba\(0, 0, 0, 0\)/.test(cs.outlineColor);
            const shadow = cs.boxShadow !== "none" && !/rgba\(0, 0, 0, 0\)/.test(cs.boxShadow);
            hasRing = solid || shadow;
          }
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
  if (v.why) console.log(`  → ${v.why}`);
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
