/**
 * Cross-locale typography and alignment audit.
 *
 * Switching language changes every string length on the page, and two of the
 * six locales (zh, ar) fall outside Playfair's and Inter's Latin coverage.
 * This script loads each page in each locale with a real Chrome and reports
 * anything that would show up as broken alignment:
 *
 *   overflow   — content wider than the viewport
 *   oob        — individual elements poking outside the viewport
 *   clipped    — text truncated by an ellipsis/overflow container
 *   navRows    — header nav wrapping onto a second line
 *   headerH    — header height drifting between locales
 *   btnH       — button heights drifting (breaks row alignment)
 *   fonts      — the family actually resolved for headings vs body
 *   baseline   — flex rows whose children are not vertically centred
 *
 * Run: node scripts/audit-locales.mjs [--base URL] [--width 1440] [--theme dark]
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const arg = (flag, fallback) => {
  const i = process.argv.indexOf(flag);
  return i > -1 ? process.argv[i + 1] : fallback;
};
const BASE = arg("--base", "http://localhost:3000");
/** The dark palette has to hold the same alignment as the light one. */
const THEME = arg("--theme", "light");
const LOCALES = ["en", "fr", "de", "zh", "ar", "es"];
const PAGES = [
  { path: "", name: "home" },
  { path: "/vehicles", name: "vehicles" },
  { path: "/rental", name: "rental" },
  // Big Toys has the longest labels on the site — six family chips and five
  // select placeholders, in every language — so it is the page most likely
  // to overflow when the language changes.
  { path: "/big-toys", name: "big-toys" },
  { path: "/about", name: "about" },
  { path: "/contact", name: "contact" },
];

const widthArg = process.argv.indexOf("--width");
const WIDTHS = widthArg > -1 ? [Number(process.argv[widthArg + 1])] : [1440, 768, 375];

function audit() {
  const de = document.documentElement;
  const vw = window.innerWidth;

  const visible = [...document.querySelectorAll("body *")].filter((el) => {
    const c = getComputedStyle(el);
    if (c.display === "none" || c.visibility === "hidden") return false;
    if (el.classList.contains("sr-only") || el.closest(".sr-only")) return false;
    if (el.closest(".splash")) return false;
    return el.getBoundingClientRect().width > 0;
  });

  const oob = visible
    .filter((el) => {
      const r = el.getBoundingClientRect();
      return r.right > vw + 1 || r.left < -1;
    })
    .slice(0, 5)
    .map((el) => ({
      cls: String(el.className).slice(0, 45),
      right: Math.round(el.getBoundingClientRect().right),
      text: (el.textContent || "").trim().slice(0, 35),
    }));

  const clipped = visible
    .filter((el) => {
      const c = getComputedStyle(el);
      const hides = c.overflowX === "hidden" || c.textOverflow === "ellipsis";
      return hides && el.scrollWidth > el.clientWidth + 2 && el.clientWidth > 0;
    })
    .slice(0, 6)
    .map((el) => ({
      cls: String(el.className).slice(0, 40),
      over: el.scrollWidth - el.clientWidth,
      text: (el.textContent || "").trim().slice(0, 40),
    }));

  const header = document.querySelector("header");
  const navLinks = [...document.querySelectorAll("header nav a")];
  const navRows = new Set(navLinks.map((a) => Math.round(a.getBoundingClientRect().top))).size;

  const font = (sel) => {
    const el = document.querySelector(sel);
    if (!el) return null;
    const c = getComputedStyle(el);
    return {
      family: c.fontFamily.split(",")[0].replace(/["']/g, ""),
      size: Math.round(parseFloat(c.fontSize)),
      lineHeight: Math.round(parseFloat(c.lineHeight)),
      style: c.fontStyle,
    };
  };

  const btnH = [...new Set(
    [...document.querySelectorAll(".btn")]
      .filter((b) => b.getBoundingClientRect().height > 0)
      .map((b) => Math.round(b.getBoundingClientRect().height)),
  )].sort((a, b) => a - b);

  // Buttons only need to match when they share a line. Two stacked buttons
  // with different label lengths are allowed to differ; two side by side
  // are not.
  const btnRowMismatch = [];
  for (const row of document.querySelectorAll("div,nav,form")) {
    const kids = [...row.children].filter(
      (k) => k.classList.contains("btn") && k.getBoundingClientRect().height > 0,
    );
    if (kids.length < 2 || getComputedStyle(row).flexDirection !== "row") continue;
    const byTop = {};
    for (const k of kids) {
      const r = k.getBoundingClientRect();
      (byTop[Math.round(r.top)] ||= []).push(Math.round(r.height));
    }
    for (const heights of Object.values(byTop)) {
      if (heights.length > 1 && new Set(heights).size > 1) {
        btnRowMismatch.push({ cls: String(row.className).slice(0, 40), heights });
      }
    }
  }

  // Flex rows that declare items-center but whose children are off-centre
  const baseline = [...document.querySelectorAll(".flex.items-center")]
    .filter((row) => {
      const cs = getComputedStyle(row);
      // Only real rows: a column flex stacks by design, and a wrapping row
      // legitimately puts children on different lines.
      if (cs.flexDirection !== "row") return false;
      if (cs.flexWrap === "wrap") return false;
      const kids = [...row.children].filter((k) => k.getBoundingClientRect().height > 0);
      if (kids.length < 2) return false;
      const mids = kids.map((k) => {
        const r = k.getBoundingClientRect();
        return r.top + r.height / 2;
      });
      return Math.max(...mids) - Math.min(...mids) > 2.5;
    })
    .slice(0, 4)
    .map((row) => ({
      cls: String(row.className).slice(0, 45),
      text: (row.textContent || "").trim().slice(0, 35),
    }));

  return {
    lang: de.lang,
    dir: de.dir,
    overflow: de.scrollWidth > vw,
    scrollWidth: de.scrollWidth,
    oob,
    clipped,
    headerH: header ? Math.round(header.getBoundingClientRect().height) : null,
    navRows,
    h1: font("h1"),
    body: font("main p"),
    btnH,
    btnRowMismatch,
    baseline,
  };
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--font-render-hinting=none"],
});

let problems = 0;
const summary = [];

for (const width of WIDTHS) {
  console.log(`\n${"=".repeat(74)}\n  VIEWPORT ${width}px\n${"=".repeat(74)}`);

  for (const page of PAGES) {
    const perLocale = {};

    for (const locale of LOCALES) {
      const tab = await browser.newPage();
      await tab.setViewport({ width, height: 900, deviceScaleFactor: 1 });
      if (THEME === "dark") {
        // The theme is applied by a blocking script reading localStorage, so it
        // has to be stored before the first document loads.
        await tab.evaluateOnNewDocument(() => {
          try {
            localStorage.setItem("am-theme", "dark");
          } catch {}
        });
      }
      await tab.goto(`${BASE}/${locale}${page.path}`, { waitUntil: "networkidle0", timeout: 60000 });
      // let fonts settle and the splash finish
      await tab.evaluateHandle("document.fonts.ready");
      await new Promise((r) => setTimeout(r, 1400));

      const result = await tab.evaluate(audit);
      perLocale[locale] = result;
      await tab.close();
    }

    // Report
    console.log(`\n  ── ${page.name} ${"─".repeat(60 - page.name.length)}`);
    const headerHeights = new Set(Object.values(perLocale).map((r) => r.headerH));

    for (const locale of LOCALES) {
      const r = perLocale[locale];
      const flags = [];
      if (r.overflow) flags.push(`OVERFLOW ${r.scrollWidth}px`);
      if (r.oob.length) flags.push(`${r.oob.length} out-of-bounds`);
      if (r.clipped.length) flags.push(`${r.clipped.length} clipped`);
      if (r.navRows > 1) flags.push(`nav ${r.navRows} rows`);
      if (r.baseline.length) flags.push(`${r.baseline.length} off-centre rows`);
      if (r.btnRowMismatch.length) flags.push(`${r.btnRowMismatch.length} uneven button row`);
      problems += flags.length;

      const status = flags.length ? `⚠  ${flags.join(" · ")}` : "ok";
      console.log(
        `  ${locale} ${r.dir}  hdr ${String(r.headerH).padStart(3)}  ` +
        `h1 ${String(r.h1?.family ?? "—").padEnd(17)} ${String(r.h1?.size ?? "").padStart(3)}/${String(r.h1?.lineHeight ?? "").padStart(3)}  ` +
        `btn [${r.btnH.join(",")}]  ${status}`,
      );

      for (const c of r.clipped) console.log(`        clipped −${c.over}px  "${c.text}"  .${c.cls}`);
      for (const o of r.oob) console.log(`        oob right=${o.right}  "${o.text}"  .${o.cls}`);
      for (const b of r.baseline) console.log(`        off-centre  "${b.text}"  .${b.cls}`);
      for (const b of r.btnRowMismatch) console.log(`        uneven buttons ${b.heights.join(" vs ")}px  .${b.cls}`);
    }

    if (headerHeights.size > 1) {
      console.log(`  ⚠  header height differs across locales: ${[...headerHeights].join(", ")}px`);
      problems++;
    }
    summary.push({ width, page: page.name, headerHeights: [...headerHeights] });
  }
}

await browser.close();
console.log(`\n${"=".repeat(74)}`);
console.log(problems === 0 ? "  No alignment problems found." : `  ${problems} issue(s) flagged above.`);
console.log("=".repeat(74));
