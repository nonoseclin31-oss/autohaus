import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

/**
 * Four starter listings for the Big Toys catalogue — one per family, so the
 * back office opens with something to look at and edit rather than a blank
 * table. They are created as drafts: the figures are manufacturer headline
 * numbers, not a checked stock sheet, and none of them has photos yet.
 *
 *   node scripts/seed-toys.mjs             create/refresh them as drafts
 *   node scripts/seed-toys.mjs --publish   same, but published
 *   node scripts/seed-toys.mjs --remove    delete every AM-BT-* listing
 */

// Plain Node has no WebSocket the Neon driver can use, and the pooler refuses
// the upgrade from here.
neonConfig.poolQueryViaFetch = true;

const env = Object.fromEntries(
  readFileSync("/Users/habib/expert/autohaus-motion/.env", "utf8")
    .split("\n").filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => { const i = l.indexOf("="); return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")]; }),
);

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }) });

const PUBLISH = process.argv.includes("--publish");
const REMOVE = process.argv.includes("--remove");

const TOYS = [
  {
    reference: "AM-BT-0001", slug: "ducati-panigale-v4-s-am-bt-0001",
    kind: "MOTORCYCLE", brand: "Ducati", model: "Panigale V4", version: "S",
    year: 2025, condition: "USED", category: "SPORT",
    engineType: "PETROL", displacement: 1103, cylinders: 4, strokes: 4,
    powerHp: 216, powerKw: 159, torqueNm: 121, topSpeed: 299,
    transmission: "MANUAL", mileage: 2400, dryWeight: 187, seats: 2,
    fuelCapacity: 17, licence: "A", colorExterior: "red",
    price: 32900, financingMonthly: 429, vatDeductible: false,
    equipment: ["t_abs", "t_traction", "t_modes", "t_quickshifter", "t_suspension", "t_launch", "t_brembo", "t_display", "t_carbon", "t_akrapovic"],
    fr: { headline: "L'arme de piste homologuée route.",
          description: "Panigale V4 S de 2025, 2 400 km, entretien Ducati à jour.\nSuspension Öhlins semi-active, échappement Akrapovič, habillage carbone.\nPremière main, non accidentée, facture d'origine." },
    en: { headline: "A track weapon with a number plate.",
          description: "2025 Panigale V4 S, 2,400 km, Ducati service up to date.\nÖhlins semi-active suspension, Akrapovič exhaust, carbon bodywork.\nOne owner, accident-free, original invoice." },
  },
  {
    reference: "AM-BT-0002", slug: "can-am-renegade-x-xc-1000r-am-bt-0002",
    kind: "QUAD", brand: "Can-Am", model: "Renegade X xc", version: "1000R",
    year: 2024, condition: "USED", category: "ADVENTURE",
    engineType: "PETROL", displacement: 976, cylinders: 2, strokes: 4,
    powerHp: 91, powerKw: 67, torqueNm: 83, topSpeed: 110,
    transmission: "CVT", mileage: 1150, dryWeight: 337, seats: 1,
    fuelCapacity: 20.5, licence: "B", colorExterior: "black",
    trailerIncluded: true,
    price: 16400, vatDeductible: true,
    equipment: ["t_modes", "t_display", "t_crashbars", "t_leds", "t_winch", "t_trailer", "t_towhitch"],
    fr: { headline: "Le quad sport qui passe partout.",
          description: "Renegade X xc 1000R de 2024, 1 150 km, treuil et protections d'origine.\nLivré avec sa remorque immatriculée.\nRévision faite, pneus neufs." },
    en: { headline: "The sport quad that goes anywhere.",
          description: "2024 Renegade X xc 1000R, 1,150 km, factory winch and guards.\nSupplied with its registered trailer.\nServiced, new tyres." },
  },
  {
    reference: "AM-BT-0003", slug: "sea-doo-rxp-x-325-am-bt-0003",
    kind: "JETSKI", brand: "Sea-Doo", model: "RXP-X", version: "325 Rotax",
    year: 2025, condition: "USED", category: "WATERSPORT",
    engineType: "PETROL", displacement: 1630, cylinders: 3, strokes: 4,
    powerHp: 325, powerKw: 239, topSpeed: 60,
    transmission: "DIRECT", engineHours: 34, dryWeight: 377, seats: 2,
    fuelCapacity: 70, licence: "BOAT_COASTAL", colorExterior: "blue",
    trailerIncluded: true,
    price: 23900, vatDeductible: true,
    equipment: ["t_modes", "t_display", "t_connect", "t_audio", "t_cover", "t_trailer"],
    fr: { headline: "325 chevaux, 34 heures moteur.",
          description: "RXP-X 325 de 2025, 34 heures moteur, hivernage fait.\nSystème audio, housse sur mesure, remorque incluse.\nPrêt à mettre à l'eau." },
    en: { headline: "325 horsepower, 34 engine hours.",
          description: "2025 RXP-X 325, 34 engine hours, winterised.\nAudio system, fitted cover, trailer included.\nReady to launch." },
  },
  {
    reference: "AM-BT-0004", slug: "axopar-25-cross-top-am-bt-0004",
    kind: "BOAT", brand: "Axopar", model: "25", version: "Cross Top",
    year: 2024, condition: "USED", category: "LUXURY",
    engineType: "PETROL", displacement: 4600, cylinders: 8, strokes: 4,
    powerHp: 300, powerKw: 221, topSpeed: 40,
    transmission: "DIRECT", engineCount: 1, engineHours: 120,
    dryWeight: 2100, seats: 8, lengthM: 7.62, beamM: 2.45,
    fuelCapacity: 200, rangeKm: 400, licence: "BOAT_COASTAL", colorExterior: "grey",
    price: 168000, vatDeductible: true, negotiable: true,
    equipment: ["t_gps", "t_audio", "t_sundeck", "t_cabin", "t_fridge", "t_shower", "t_antifouling", "t_cover"],
    fr: { headline: "Sept mètres soixante, une cabine, 40 nœuds.",
          description: "Axopar 25 Cross Top de 2024, 120 heures moteur.\nMercury V8 300 ch, traceur de cartes, cabine avec couchages, douchette arrière.\nAntifouling refait, place de port transférable sur demande." },
    en: { headline: "Seven-sixty, a cabin, and forty knots.",
          description: "2024 Axopar 25 Cross Top, 120 engine hours.\nMercury V8 300 hp, chartplotter, cabin with berths, transom shower.\nAntifouling redone, berth transferable on request." },
  },
];

if (REMOVE) {
  const { count } = await prisma.toy.deleteMany({ where: { reference: { startsWith: "AM-BT-" } } });
  console.log(`supprimés: ${count}`);
  await prisma.$disconnect();
  process.exit(0);
}

let created = 0, updated = 0;
for (const toy of TOYS) {
  const { fr, en, ...rest } = toy;
  const data = {
    ...rest,
    equipment: JSON.stringify(rest.equipment ?? []),
    published: PUBLISH,
    status: "AVAILABLE",
    location: "52159 Roetgen",
    accidentFree: true,
    registered: true,
    serviceHistory: true,
  };

  const existing = await prisma.toy.findUnique({ where: { reference: toy.reference }, select: { id: true } });
  let id;
  if (existing) {
    await prisma.toy.update({ where: { id: existing.id }, data });
    id = existing.id;
    updated++;
  } else {
    const row = await prisma.toy.create({ data });
    id = row.id;
    created++;
  }

  for (const [locale, text] of [["fr", fr], ["en", en]]) {
    await prisma.toyTranslation.upsert({
      where: { toyId_locale: { toyId: id, locale } },
      create: { toyId: id, locale, headline: text.headline, description: text.description },
      update: { headline: text.headline, description: text.description },
    });
  }
}

console.log(`créés: ${created} · mis à jour: ${updated} · publiés: ${PUBLISH} · total: ${await prisma.toy.count()}`);
await prisma.$disconnect();
