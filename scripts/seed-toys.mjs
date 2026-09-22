import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import { readFileSync } from "node:fs";

/**
 * Four starter listings for the Big Toys catalogue — one per family, so the
 * section opens with something real rather than an empty table.
 *
 * The figures are the manufacturers' own published numbers, checked against
 * their spec sheets; anything a maker does not publish (a top speed they will
 * not commit to, a torque figure they omit) is left empty rather than guessed.
 * The mileage, engine hours, owner counts and prices are the one invented
 * part: they describe a plausible example, not a machine in the yard.
 *
 * The photographs are freely licensed and credited in
 * public/samples/ATTRIBUTION.md; where the licence asks for it, the credit is
 * also the last line of the listing's own description.
 *
 *   node scripts/seed-toys.mjs             create/refresh them as drafts
 *   node scripts/seed-toys.mjs --publish   same, but published
 *   node scripts/seed-toys.mjs --remove    delete every AM-BT-* listing
 */

// Plain Node has no WebSocket the Neon driver can use, and the pooler refuses
// the upgrade from here.
neonConfig.poolQueryViaFetch = true;

const env = Object.fromEntries(
  readFileSync(new URL("../.env", import.meta.url), "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
    }),
);

const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: env.DATABASE_URL }) });

const PUBLISH = process.argv.includes("--publish");
const REMOVE = process.argv.includes("--remove");

const TOYS = [
  {
    reference: "AM-BT-0001",
    slug: "ducati-superleggera-v4-am-bt-0001",
    kind: "MOTORCYCLE",
    brand: "Ducati",
    model: "Superleggera V4",
    year: 2020,
    condition: "USED",
    category: "SPORT",
    engineType: "PETROL",
    displacement: 998,
    cylinders: 4,
    strokes: 4,
    powerHp: 224,
    powerKw: 165,
    torqueNm: 116,
    topSpeed: 299,
    transmission: "MANUAL",
    mileage: 1250,
    dryWeight: 152,
    seats: 1,
    fuelCapacity: 16,
    licence: "A",
    colorExterior: "red",
    previousOwners: 1,
    price: 118000,
    vatDeductible: false,
    image: "/samples/ducati-superleggera-v4.jpg",
    equipment: [
      "t_abs", "t_traction", "t_modes", "t_quickshifter", "t_launch",
      "t_brembo", "t_display", "t_carbon", "t_akrapovic", "t_leds",
    ],
    fr: {
      headline: "Une des 500. Châssis et carrosserie en carbone.",
      description:
        "Superleggera V4 de 2020, numérotée, 1 250 km depuis neuve.\nLe seul modèle de série au monde dont le cadre, le monocoque avant, le bras oscillant et les jantes sont en fibre de carbone : 152,2 kg à sec avec le kit racing, pour 224 chevaux — 234 avec l'échappement Akrapovič de course fourni.\nPremière main, carnet Ducati complet, non accidentée. Livrée avec sa trousse d'outils, sa housse et son certificat de numérotation.",
    },
    en: {
      headline: "One of 500. Carbon frame and carbon bodywork.",
      description:
        "2020 Superleggera V4, numbered, 1,250 km from new.\nThe only production motorcycle in the world with a carbon fibre frame, front subframe, swingarm and wheels: 152.2 kg dry with the racing kit, for 224 horsepower — 234 with the supplied Akrapovič racing exhaust.\nOne owner, full Ducati service history, accident-free. Supplied with its tool kit, cover and certificate of numbering.",
    },
  },

  {
    reference: "AM-BT-0002",
    slug: "yamaha-raptor-700r-am-bt-0002",
    kind: "QUAD",
    brand: "Yamaha",
    model: "Raptor 700R",
    version: "YFM700R",
    year: 2022,
    condition: "USED",
    category: "SPORT",
    engineType: "PETROL",
    displacement: 686,
    cylinders: 1,
    strokes: 4,
    powerHp: 45,
    powerKw: 33,
    transmission: "MANUAL",
    mileage: 3200,
    dryWeight: 191,
    seats: 1,
    fuelCapacity: 11,
    licence: "B",
    colorExterior: "blue",
    previousOwners: 1,
    price: 7900,
    vatDeductible: true,
    image: "/samples/yamaha-raptor-700r.jpg",
    equipment: ["t_crashbars"],
    fr: {
      headline: "Le quad sport de référence, en version route.",
      description:
        "Raptor 700R de 2022, 3 200 km, immatriculé et homologué route.\nMonocylindre 686 cm³ à injection, boîte 5 rapports avec marche arrière, châssis aluminium et double triangulation avant réglable.\nPare-chocs avant et repose-pieds larges d'origine. Révision faite, pneus à 80 %.\n\nPhoto : 4028mdk09, CC BY-SA 3.0, via Wikimedia Commons.",
    },
    en: {
      headline: "The benchmark sport quad, road-registered.",
      description:
        "2022 Raptor 700R, 3,200 km, registered and road-legal.\n686 cc fuel-injected single, five-speed gearbox with reverse, aluminium frame and adjustable double-wishbone front end.\nFactory front bumper and wide footpegs. Serviced, tyres at 80%.\n\nPhoto: 4028mdk09, CC BY-SA 3.0, via Wikimedia Commons.",
    },
  },

  {
    reference: "AM-BT-0003",
    slug: "sea-doo-spark-trixx-am-bt-0003",
    kind: "JETSKI",
    brand: "Sea-Doo",
    model: "Spark",
    version: "TRIXX for 3",
    year: 2023,
    condition: "USED",
    category: "WATERSPORT",
    engineType: "PETROL",
    displacement: 899,
    cylinders: 3,
    strokes: 4,
    powerHp: 90,
    powerKw: 66,
    transmission: "DIRECT",
    engineHours: 62,
    dryWeight: 203,
    seats: 3,
    lengthM: 3.05,
    beamM: 1.17,
    fuelCapacity: 30,
    licence: "BOAT_COASTAL",
    colorExterior: "green",
    previousOwners: 1,
    price: 10900,
    vatDeductible: true,
    trailerIncluded: true,
    image: "/samples/sea-doo-spark-trixx.jpg",
    equipment: ["t_modes", "t_trailer"],
    fr: {
      headline: "203 kg, 90 chevaux, et une remorque avec.",
      description:
        "Spark TRIXX trois places de 2023, 62 heures moteur, hivernage fait.\nRotax 900 ACE de 899 cm³, 90 chevaux, colonne de direction réglable et cale-pieds surélevés — la version conçue pour jouer, pas pour aller vite en ligne droite.\nVendu avec sa remorque immatriculée, prêt à mettre à l'eau.\n\nPhoto : Cjp24, CC BY-SA 4.0, via Wikimedia Commons.",
    },
    en: {
      headline: "203 kg, 90 horsepower, trailer included.",
      description:
        "2023 three-seat Spark TRIXX, 62 engine hours, winterised.\n899 cc Rotax 900 ACE, 90 horsepower, adjustable steering column and raised footwells — the version built to play rather than to go fast in a straight line.\nSold with its registered trailer, ready to launch.\n\nPhoto: Cjp24, CC BY-SA 4.0, via Wikimedia Commons.",
    },
  },

  {
    reference: "AM-BT-0004",
    slug: "quicksilver-activ-875-sundeck-am-bt-0004",
    kind: "BOAT",
    brand: "Quicksilver",
    model: "Activ 875",
    version: "Sundeck",
    year: 2021,
    condition: "USED",
    category: "LUXURY",
    engineType: "PETROL",
    displacement: 4600,
    cylinders: 8,
    strokes: 4,
    powerHp: 500,
    powerKw: 368,
    transmission: "DIRECT",
    engineCount: 2,
    engineHours: 180,
    dryWeight: 2462,
    seats: 12,
    lengthM: 8.74,
    beamM: 3.0,
    fuelCapacity: 450,
    licence: "BOAT_COASTAL",
    colorExterior: "white",
    previousOwners: 1,
    price: 165000,
    vatDeductible: true,
    negotiable: true,
    image: "/samples/quicksilver-activ-875.jpg",
    equipment: ["t_sundeck", "t_cabin", "t_gps", "t_audio", "t_shower"],
    fr: {
      headline: "Huit mètres soixante-quatorze, quatre couchages, deux V8.",
      description:
        "Activ 875 Sundeck de 2021, 180 heures moteur, entretien suivi.\nDeux Mercury V8 de 250 chevaux, soit la motorisation maximale admise par la coque. Cabine avec quatre couchages, plus grand bain de soleil de la catégorie, traceur de cartes, douchette de plage arrière.\n450 litres de carburant, 100 litres d'eau douce, homologuée catégorie B pour dix personnes et catégorie C pour douze.\n\nPhoto : Quicksilver Boats, CC BY-SA 4.0, via Wikimedia Commons.",
    },
    en: {
      headline: "Eight seventy-four, four berths, two V8s.",
      description:
        "2021 Activ 875 Sundeck, 180 engine hours, maintained on schedule.\nTwin 250-horsepower Mercury V8s — the maximum the hull is rated for. Cabin with four berths, the largest sundeck in its class, chartplotter, transom shower.\n450 litres of fuel, 100 litres of fresh water, CE category B for ten people and category C for twelve.\n\nPhoto: Quicksilver Boats, CC BY-SA 4.0, via Wikimedia Commons.",
    },
  },
];

if (REMOVE) {
  const rows = await prisma.toy.findMany({ where: { reference: { startsWith: "AM-BT-" } }, select: { id: true } });
  for (const row of rows) await prisma.toy.delete({ where: { id: row.id } });
  console.log(`supprimés: ${rows.length}`);
  await prisma.$disconnect();
  process.exit(0);
}

/**
 * Every optional column, reset to empty.
 *
 * Prisma's update only touches the keys it is given, so re-running this after
 * changing a listing would leave the fields the new definition drops still
 * holding the old values — a top speed from a machine that is no longer in
 * the list. Spreading this first makes each pass a full overwrite.
 */
const BLANK = {
  version: null, hullId: null, category: null,
  displacement: null, cylinders: null, strokes: null, powerKw: null,
  torqueNm: null, topSpeed: null, transmission: null, engineCount: 1,
  mileage: null, engineHours: null, dryWeight: null, seats: null,
  lengthM: null, beamM: null, fuelCapacity: null, rangeKm: null,
  trailerIncluded: false, licence: null, warrantyMonths: null,
  previousOwners: null, firstRegistration: null, colorExterior: null,
  priceNet: null, vatDeductible: false, oldPrice: null, negotiable: false,
  financingMonthly: null, videoUrl: null, featured: false, homeRank: null,
};

let created = 0;
let updated = 0;

for (const toy of TOYS) {
  const { fr, en, image, ...rest } = toy;
  const data = {
    ...BLANK,
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
    id = (await prisma.toy.create({ data })).id;
    created++;
  }

  // Rewritten rather than appended: re-running must not leave four copies of
  // the same photo behind.
  const stale = await prisma.toyImage.findMany({ where: { toyId: id }, select: { id: true } });
  for (const row of stale) await prisma.toyImage.delete({ where: { id: row.id } });
  await prisma.toyImage.create({
    data: {
      toyId: id,
      url: image,
      alt: [toy.brand, toy.model, toy.version].filter(Boolean).join(" "),
      position: 0,
      isCover: true,
    },
  });

  for (const [locale, text] of [["fr", fr], ["en", en]]) {
    await prisma.toyTranslation.upsert({
      where: { toyId_locale: { toyId: id, locale } },
      create: { toyId: id, locale, headline: text.headline, description: text.description },
      update: { headline: text.headline, description: text.description },
    });
  }
}

console.log(
  `créés: ${created} · mis à jour: ${updated} · publiés: ${PUBLISH} · total: ${await prisma.toy.count()}`,
);
await prisma.$disconnect();
