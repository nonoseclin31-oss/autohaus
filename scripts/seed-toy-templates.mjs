/**
 * Creates the Big Toys listing templates: the machines the workshop takes in
 * again and again, entered once.
 *
 * Figures are the manufacturers' published ones. Anything a maker does not
 * publish — a dry weight where only a kerb weight is given, a top speed a
 * maker refuses to quote — is left empty rather than guessed, because a
 * template is copied into a listing and a wrong figure travels with it.
 *
 * Photos are deliberately absent: a template describes a kind of machine.
 *
 *   node scripts/seed-toy-templates.mjs [--replace]
 */

import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import fs from "node:fs";

// Node has no WebSocket the driver can use out of the box, and the pooler
// refuses the upgrade from here. Queries go over plain HTTP instead, exactly
// as they do on Workers.
neonConfig.poolQueryViaFetch = true;

const LOCALES = ["en", "fr", "de", "zh", "ar", "es"];

/* ── Phrases the descriptions are built from ───────────────────────────── */

/**
 * Written in the nominal style — "workshop preparation", not "prepared" —
 * because French and Spanish would otherwise have to agree with the gender of
 * a motorcycle, a jet ski and a boat in the same sentence.
 */
const T = {
  en: {
    hp: "hp", seats: "seats", tank: "Fuel tank", dry: "Dry weight", top: "Top speed",
    engines: "engines", gearbox: { MANUAL: "manual gearbox", AUTOMATIC: "automatic", DCT: "dual-clutch gearbox", CVT: "CVT", DIRECT: "direct drive" },
    closing: "Workshop-prepared, papers in order, delivered anywhere in Europe.",
  },
  fr: {
    hp: "ch", seats: "places", tank: "Réservoir", dry: "Poids à sec", top: "Vitesse maximale",
    engines: "moteurs", gearbox: { MANUAL: "boîte mécanique", AUTOMATIC: "boîte automatique", DCT: "boîte à double embrayage", CVT: "variateur CVT", DIRECT: "prise directe" },
    closing: "Préparation à l'atelier, papiers en règle, livraison partout en Europe.",
  },
  de: {
    hp: "PS", seats: "Plätze", tank: "Tank", dry: "Trockengewicht", top: "Höchstgeschwindigkeit",
    engines: "Motoren", gearbox: { MANUAL: "Schaltgetriebe", AUTOMATIC: "Automatik", DCT: "Doppelkupplungsgetriebe", CVT: "CVT", DIRECT: "Direktantrieb" },
    closing: "Werkstattvorbereitung, Papiere in Ordnung, Lieferung europaweit.",
  },
  zh: {
    hp: "马力", seats: "座", tank: "油箱", dry: "干重", top: "最高时速",
    engines: "台发动机", gearbox: { MANUAL: "手动变速箱", AUTOMATIC: "自动变速箱", DCT: "双离合变速箱", CVT: "无级变速", DIRECT: "直接驱动" },
    closing: "车间整备完毕，手续齐全，可配送至欧洲各地。",
  },
  ar: {
    hp: "حصان", seats: "مقاعد", tank: "خزان الوقود", dry: "الوزن الجاف", top: "السرعة القصوى",
    engines: "محركات", gearbox: { MANUAL: "ناقل حركة يدوي", AUTOMATIC: "ناقل أوتوماتيكي", DCT: "ناقل بقابضين", CVT: "ناقل متغير", DIRECT: "دفع مباشر" },
    closing: "تجهيز في الورشة، أوراق نظامية، وتوصيل إلى أي مكان في أوروبا.",
  },
  es: {
    hp: "CV", seats: "plazas", tank: "Depósito", dry: "Peso en seco", top: "Velocidad máxima",
    engines: "motores", gearbox: { MANUAL: "caja manual", AUTOMATIC: "caja automática", DCT: "caja de doble embrague", CVT: "variador CVT", DIRECT: "transmisión directa" },
    closing: "Preparación en taller, papeles en regla, entrega en toda Europa.",
  },
};

/* ── The machines ──────────────────────────────────────────────────────── */

const TOYS = [
  /* ── Motorcycles ─────────────────────────────────────────────────── */
  { name: "2025 Ducati Panigale V4 S", kind: "MOTORCYCLE", brand: "Ducati", model: "Panigale V4", version: "S",
    year: 2025, category: "SPORT", cc: 1103, cylinders: 4, hp: 216, kw: 159, nm: 121,
    transmission: "MANUAL", dryWeight: 187, seats: 1, tank: 17, licence: "A",
    colour: "red", price: 33000 },

  { name: "2025 BMW M 1000 RR", kind: "MOTORCYCLE", brand: "BMW Motorrad", model: "M 1000 RR", version: null,
    year: 2025, category: "RACE", cc: 999, cylinders: 4, hp: 212, kw: 156, nm: 113, top: 314,
    transmission: "MANUAL", seats: 2, tank: 16.5, licence: "A",
    colour: "white", price: 37000 },

  { name: "2025 BMW R 1300 GS Adventure", kind: "MOTORCYCLE", brand: "BMW Motorrad", model: "R 1300 GS", version: "Adventure",
    year: 2025, category: "ADVENTURE", cc: 1300, cylinders: 2, hp: 145, kw: 107, nm: 149,
    transmission: "MANUAL", seats: 2, tank: 30, licence: "A",
    colour: "black", price: 26000 },

  { name: "2025 Triumph Rocket 3 Storm R", kind: "MOTORCYCLE", brand: "Triumph", model: "Rocket 3", version: "Storm R",
    year: 2025, category: "CRUISER", cc: 2458, cylinders: 3, hp: 182, kw: 134, nm: 225,
    transmission: "MANUAL", seats: 2, tank: 18, licence: "A",
    colour: "black", price: 26000 },

  /* ── Quads ───────────────────────────────────────────────────────── */
  { name: "2025 Can-Am Outlander MAX XT-P 1000R", kind: "QUAD", brand: "Can-Am", model: "Outlander MAX", version: "XT-P 1000R",
    year: 2025, category: "ADVENTURE", cc: 976, cylinders: 2, hp: 100, kw: 74,
    transmission: "CVT", seats: 2, tank: 20.5, licence: "B",
    colour: "black", price: 21000 },

  { name: "2025 Polaris Sportsman XP 1000 S", kind: "QUAD", brand: "Polaris", model: "Sportsman XP 1000", version: "S",
    year: 2025, category: "UTILITY", cc: 952, cylinders: 2, hp: 90, kw: 66,
    transmission: "CVT", seats: 1, tank: 20.8, licence: "B",
    colour: "blue", price: 18000 },

  /* ── Buggies ─────────────────────────────────────────────────────── */
  { name: "2025 Polaris RZR Pro R Factory", kind: "BUGGY", brand: "Polaris", model: "RZR Pro R", version: "Factory",
    year: 2025, category: "RACE", cc: 1997, cylinders: 4, hp: 225, kw: 168,
    transmission: "CVT", seats: 2, tank: 43.5, licence: "B",
    colour: "orange", price: 50000 },

  { name: "2025 Can-Am Maverick R MAX X rs", kind: "BUGGY", brand: "Can-Am", model: "Maverick R MAX", version: "X rs",
    year: 2025, category: "SPORT", cc: 999, cylinders: 3, hp: 240, kw: 176,
    transmission: "DCT", seats: 4, tank: 40, licence: "B",
    colour: "yellow", price: 48000 },

  /* ── Jet skis ────────────────────────────────────────────────────── */
  { name: "2025 Sea-Doo RXP-X 325", kind: "JETSKI", brand: "Sea-Doo", model: "RXP-X", version: "325",
    year: 2025, category: "RACE", cc: 1630, cylinders: 3, hp: 325, kw: 239,
    transmission: "DIRECT", dryWeight: 371, seats: 2, tank: 70, licence: "BOAT_COASTAL",
    colour: "red", price: 21000 },

  { name: "2025 Sea-Doo GTX Limited 325", kind: "JETSKI", brand: "Sea-Doo", model: "GTX Limited", version: "325",
    year: 2025, category: "LUXURY", cc: 1630, cylinders: 3, hp: 325, kw: 239,
    transmission: "DIRECT", seats: 3, tank: 70, licence: "BOAT_COASTAL",
    colour: "blue", price: 25000 },

  { name: "2025 Kawasaki Ultra 310LX-S", kind: "JETSKI", brand: "Kawasaki", model: "Ultra 310LX-S", version: null,
    year: 2025, category: "LUXURY", cc: 1498, cylinders: 4, hp: 310, kw: 228,
    transmission: "DIRECT", seats: 3, tank: 78, licence: "BOAT_COASTAL",
    colour: "black", price: 23000 },

  /* ── Boats ───────────────────────────────────────────────────────── */
  { name: "2025 Axopar 29 Sun Top", kind: "BOAT", brand: "Axopar", model: "29", version: "Sun Top",
    year: 2025, category: "WATERSPORT", cc: 4600, cylinders: 8, hp: 300, kw: 224, engineCount: 1,
    transmission: "DIRECT", seats: 8, lengthM: 9.25, beamM: 2.95, licence: "BOAT_COASTAL",
    colour: "grey", price: 150000 },

  { name: "2025 Brabus Shadow 900 XC", kind: "BOAT", brand: "Brabus Marine", model: "Shadow 900", version: "XC",
    year: 2025, category: "LUXURY", cc: 4600, cylinders: 8, hp: 900, kw: 662, engineCount: 2,
    transmission: "DIRECT", seats: 8, lengthM: 9.25, beamM: 2.95, licence: "BOAT_COASTAL",
    colour: "black", price: 320000 },

  /* ── Accessories ─────────────────────────────────────────────────── */
  // The family had no template at all. A trailer is the accessory that comes
  // back most often, and the only one whose figures are the same every time.
  { name: "Remorque double jet-ski", kind: "ACCESSORY", brand: "Respo", model: "Double jet-ski", version: "1500 kg",
    year: 2025, category: "UTILITY", licence: "NONE", colour: "silver", price: 4900,
    prose: {
      en: "Galvanised twin jet-ski trailer, 1500 kg gross weight, lit, with winch and two adjustable cradles. Towable on a car licence within the weights that licence allows.",
      fr: "Remorque galvanisée pour deux jet-skis, 1500 kg de poids total, éclairée, avec treuil et deux berceaux réglables. Tractable avec le permis B dans les limites de poids de ce permis.",
      de: "Verzinkter Anhänger für zwei Jetskis, 1500 kg zulässiges Gesamtgewicht, beleuchtet, mit Seilwinde und zwei verstellbaren Auflagen. Mit Führerschein B im Rahmen der zulässigen Gewichte zu ziehen.",
      zh: "镀锌双水上摩托拖车，总重 1500 公斤，配灯具、绞盘及两组可调托架。在 B 类驾照允许的重量范围内可牵引。",
      ar: "مقطورة مجلفنة لجهازَي جت سكي، بوزن إجمالي 1500 كغ، مزوّدة بإضاءة وونش وحاملَين قابلين للضبط. يمكن قطرها برخصة B ضمن الأوزان المسموح بها.",
      es: "Remolque galvanizado para dos motos acuáticas, 1500 kg de peso total, con luces, cabrestante y dos cunas regulables. Se puede remolcar con permiso B dentro de los pesos que ese permiso autoriza.",
    },
    headlines: {
      en: "Twin trailer · 1500 kg · winch",
      fr: "Remorque double · 1500 kg · treuil",
      de: "Doppelanhänger · 1500 kg · Seilwinde",
      zh: "双位拖车 · 1500 公斤 · 绞盘",
      ar: "مقطورة مزدوجة · 1500 كغ · ونش",
      es: "Remolque doble · 1500 kg · cabrestante",
    } },
];

/* ── Equipment by family ───────────────────────────────────────────────── */

const EQUIPMENT = {
  SPORT_BIKE: ["t_abs", "t_traction", "t_modes", "t_quickshifter", "t_launch", "t_brembo", "t_display", "t_carbon", "t_leds"],
  ROAD_BIKE: ["t_abs", "t_traction", "t_modes", "t_quickshifter", "t_cruise", "t_suspension", "t_display", "t_connect", "t_heatedgrips", "t_screen", "t_crashbars", "t_topcase", "t_leds"],
  QUAD: ["t_modes", "t_display", "t_winch", "t_towhitch", "t_leds"],
  BUGGY: ["t_modes", "t_suspension", "t_display", "t_leds"],
  JETSKI: ["t_modes", "t_display", "t_connect", "t_audio", "t_cover"],
  BOAT: ["t_gps", "t_audio", "t_sundeck", "t_fridge", "t_shower", "t_bowthruster", "t_cover", "t_antifouling", "t_leds"],
};

function equipmentFor(toy) {
  if (toy.kind === "MOTORCYCLE") {
    return EQUIPMENT[toy.category === "SPORT" || toy.category === "RACE" ? "SPORT_BIKE" : "ROAD_BIKE"];
  }
  return EQUIPMENT[toy.kind] ?? [];
}

/* ── Prose ─────────────────────────────────────────────────────────────── */

/** French, German and Spanish write decimals with a comma. */
const COMMA_DECIMAL = new Set(["fr", "de", "es"]);
const decimal = (value, loc) =>
  COMMA_DECIMAL.has(loc) ? String(value).replace(".", ",") : String(value);

const titleOf = (toy) => [toy.brand, toy.model, toy.version].filter(Boolean).join(" ");

function headline(toy, loc) {
  const t = T[loc];
  if (toy.kind === "ACCESSORY") return toy.headlines[loc];
  if (toy.kind === "BOAT") {
    const parts = [`${decimal(toy.lengthM, loc)} m`, `${toy.hp} ${t.hp}`];
    if (toy.engineCount > 1) parts.push(`${toy.engineCount} ${t.engines}`);
    return parts.join(" · ");
  }
  if (toy.kind === "JETSKI") {
    return [`${toy.cc} cm³`, `${toy.hp} ${t.hp}`, `${toy.seats} ${t.seats}`].join(" · ");
  }
  const parts = [`${toy.cc} cm³`, `${toy.hp} ${t.hp}`];
  if (toy.nm) parts.push(`${toy.nm} Nm`);
  return parts.join(" · ");
}

function description(toy, loc) {
  const t = T[loc];
  if (toy.kind === "ACCESSORY") return `${toy.prose[loc]} ${t.closing}`;

  const title = titleOf(toy);
  const lines = [];

  if (toy.kind === "BOAT") {
    const engines = toy.engineCount > 1 ? `${toy.engineCount} × ` : "";
    const perEngine = toy.engineCount > 1 ? Math.round(toy.hp / toy.engineCount) : toy.hp;
    lines.push(
      `${title} — ${decimal(toy.lengthM, loc)} m × ${decimal(toy.beamM, loc)} m, ${engines}${perEngine} ${t.hp}, ${toy.seats} ${t.seats}.`,
    );
  } else if (toy.kind === "JETSKI") {
    lines.push(`${title} — ${toy.cc} cm³, ${toy.hp} ${t.hp} (${toy.kw} kW), ${toy.seats} ${t.seats}.`);
    if (toy.tank) lines.push(`${t.tank} ${decimal(toy.tank, loc)} l.`);
  } else {
    const clauses = [`${toy.cc} cm³`, `${toy.hp} ${t.hp} (${toy.kw} kW)`];
    if (toy.nm) clauses.push(`${toy.nm} Nm`);
    clauses.push(t.gearbox[toy.transmission]);
    lines.push(`${title} — ${clauses.join(", ")}.`);
    if (toy.top) lines.push(`${t.top} ${toy.top} km/h.`);
    if (toy.dryWeight) lines.push(`${t.dry} ${decimal(toy.dryWeight, loc)} kg.`);
  }

  lines.push(t.closing);
  return lines.join(" ");
}

/* ── Payload ───────────────────────────────────────────────────────────── */

/** A rough monthly over 48 months, rounded to something quotable. */
const monthly = (price) => Math.round((price * 0.015) / 10) * 10;

function payloadFor(toy) {
  const p = {
    kind: toy.kind,
    brand: toy.brand,
    model: toy.model,
    year: String(toy.year),
    // A template describes a machine that has not been ridden yet; the
    // mileage, the engine hours and the registration date belong to one
    // machine and are left for the listing.
    condition: "NEW",
    status: "AVAILABLE",
    location: "52159 Roetgen",
    registered: "on",
    serviceHistory: "on",
    accidentFree: "on",
    vatDeductible: "on",
    negotiable: "on",
    warrantyMonths: "24",
    previousOwners: "0",
    equipment: equipmentFor(toy),
  };

  if (toy.version) p.version = toy.version;
  if (toy.category) p.category = toy.category;
  if (toy.licence) p.licence = toy.licence;
  if (toy.colour) p.colorExterior = toy.colour;

  // Everything an accessory has no answer for is simply absent, rather than
  // a column of empty engine fields inviting a guess.
  if (toy.kind !== "ACCESSORY") {
    p.engineType = "PETROL";
    p.strokes = "4";
    p.transmission = toy.transmission;
    if (toy.cc) p.displacement = String(toy.cc);
    if (toy.cylinders) p.cylinders = String(toy.cylinders);
    if (toy.hp) p.powerHp = String(toy.hp);
    if (toy.kw) p.powerKw = String(toy.kw);
    if (toy.nm) p.torqueNm = String(toy.nm);
    if (toy.top) p.topSpeed = String(toy.top);
    if (toy.dryWeight) p.dryWeight = String(toy.dryWeight);
    if (toy.seats) p.seats = String(toy.seats);
    if (toy.tank) p.fuelCapacity = String(toy.tank);
    if (toy.lengthM) p.lengthM = String(toy.lengthM);
    if (toy.beamM) p.beamM = String(toy.beamM);
    if (toy.engineCount) p.engineCount = String(toy.engineCount);
  }

  p.price = String(toy.price);
  p.priceNet = String(Math.round(toy.price / 1.19));
  p.financingMonthly = String(monthly(toy.price));

  for (const loc of LOCALES) {
    p[`headline_${loc}`] = headline(toy, loc);
    p[`description_${loc}`] = description(toy, loc);
  }
  return JSON.stringify(p);
}

/* ── Run ───────────────────────────────────────────────────────────────── */

const url = process.env.DATABASE_URL
  ?? fs.readFileSync(".env", "utf8").match(/DATABASE_URL="?([^"\n]+)/)[1];
const prisma = new PrismaClient({ adapter: new PrismaNeon({ connectionString: url }) });

const author = await prisma.user.findFirst({ where: { role: "ADMIN", active: true }, select: { id: true } });

const replace = process.argv.includes("--replace");
let created = 0, updated = 0, skipped = 0;
for (const toy of TOYS) {
  const data = {
    name: toy.name,
    kind: toy.kind,
    brand: toy.brand,
    model: toy.model,
    version: toy.version ?? null,
    payload: payloadFor(toy),
    createdById: author?.id ?? null,
  };
  const existing = await prisma.toyTemplate.findFirst({ where: { name: toy.name }, select: { id: true } });
  if (existing) {
    // A template that is already there may have been edited in the back
    // office since. Adding a machine to this list must not quietly undo
    // that, so rewriting one is opt-in.
    if (!replace) { skipped++; continue; }
    await prisma.toyTemplate.update({ where: { id: existing.id }, data });
    updated++;
  } else {
    await prisma.toyTemplate.create({ data });
    created++;
  }
}

console.log(`  modèles créés: ${created} · mis à jour: ${updated} · inchangés: ${skipped} · total: ${TOYS.length}`);
await prisma.$disconnect();
