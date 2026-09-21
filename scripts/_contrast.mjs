import puppeteer from "puppeteer-core";
const AXE = "https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox"] });
const combos = new Map();
for (const path of ["", "/vehicles", "/rental", "/about", "/contact", "/login"]) {
  const p = await b.newPage();
  await p.setViewport({ width: 1280, height: 900 });
  await p.goto(`https://autohausmotion.com/fr${path}`, { waitUntil: "networkidle2", timeout: 60000 });
  await p.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await new Promise(r => setTimeout(r, 2200));
  await p.evaluate(() => window.scrollTo(0, 0));
  await new Promise(r => setTimeout(r, 800));
  await p.addScriptTag({ url: AXE });
  const r = await p.evaluate(async () => await window.axe.run(document, { runOnly: { type: "rule", values: ["color-contrast"] } }));
  for (const v of r.violations) for (const n of v.nodes) {
    const d = n.any[0]?.data; if (!d) continue;
    const key = `${d.fgColor}|${d.bgColor}|${d.fontSize}`;
    const hit = combos.get(key) ?? { ...d, n: 0, pages: new Set(), sample: n.html.replace(/\s+/g," ").slice(0,100) };
    hit.n++; hit.pages.add(path || "/"); combos.set(key, hit);
  }
  await p.close();
}
await b.close();
for (const c of [...combos.values()].sort((a,b) => b.n - a.n)) {
  console.log(`\n${c.fgColor} sur ${c.bgColor} — ratio ${c.contrastRatio} (exigé ${c.expectedContrastRatio}) · ${c.fontSize}`);
  console.log(`  ${c.n} élément(s) · ${[...c.pages].join(", ")}`);
  console.log(`  ${c.sample}`);
}
