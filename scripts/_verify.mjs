import puppeteer from "puppeteer-core";
const b = await puppeteer.launch({ executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", headless: "new", args: ["--no-sandbox"] });

// 1. Focus visible au clavier (vrai Tab, donc :focus-visible s'applique)
const p = await b.newPage();
await p.setViewport({ width: 1280, height: 900 });
await p.goto("https://autohausmotion.com/fr", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));
const focus = [];
for (let i = 0; i < 22; i++) {
  await p.keyboard.press("Tab");
  const info = await p.evaluate(() => {
    const el = document.activeElement;
    if (!el || el === document.body) return null;
    const s = getComputedStyle(el);
    const ring = (s.outlineStyle !== "none" && parseFloat(s.outlineWidth) > 0) || s.boxShadow !== "none";
    return { tag: el.tagName.toLowerCase(), nom: (el.getAttribute("aria-label") || el.textContent || "").trim().slice(0,32),
             outline: `${s.outlineStyle} ${s.outlineWidth} ${s.outlineColor}`, boxShadow: s.boxShadow.slice(0,40), ring };
  });
  if (info) focus.push(info);
}
console.log("=== Parcours clavier (22 tabulations) ===");
const sansAnneau = focus.filter(f => !f.ring);
console.log(`  éléments atteints: ${focus.length} | sans indicateur visible: ${sansAnneau.length}`);
for (const f of sansAnneau.slice(0,8)) console.log(`   ✗ ${f.tag} "${f.nom}" outline=${f.outline}`);
if (focus[0]) console.log(`  premier élément tabulé: ${focus[0].tag} "${focus[0].nom}" (anneau: ${focus[0].ring})`);
await p.close();

// 2. Taille réelle de la cible cliquable des filtres
const p2 = await b.newPage();
await p2.setViewport({ width: 1280, height: 900 });
await p2.goto("https://autohausmotion.com/fr/vehicles", { waitUntil: "networkidle2", timeout: 60000 });
await new Promise(r => setTimeout(r, 1500));
const cb = await p2.evaluate(() => {
  const out = [];
  for (const input of document.querySelectorAll('input[type=checkbox]')) {
    const label = input.closest("label");
    const r = (label ?? input).getBoundingClientRect();
    out.push({ aUnLabel: !!label, nom: label?.textContent.trim().slice(0,28) ?? "(sans)",
               cible: `${Math.round(r.width)}×${Math.round(r.height)}` });
  }
  return out;
});
console.log("\n=== Cases à cocher des filtres ===");
for (const c of cb) console.log(`  ${c.cible}px  label:${c.aUnLabel}  "${c.nom}"`);

// 3. Cible de la carte véhicule
const card = await p2.evaluate(() => {
  const a = [...document.querySelectorAll("a")].find(x => /Porsche|Mercedes|Audi/.test(x.textContent));
  if (!a) return null;
  const r = a.getBoundingClientRect();
  const parentLink = a.closest("article")?.querySelector("a");
  const pr = parentLink?.getBoundingClientRect();
  return { lienTitre: `${Math.round(r.width)}×${Math.round(r.height)}`,
           premierLienDeLaCarte: pr ? `${Math.round(pr.width)}×${Math.round(pr.height)}` : null };
});
console.log("\n=== Carte véhicule ===", JSON.stringify(card));
await b.close();
