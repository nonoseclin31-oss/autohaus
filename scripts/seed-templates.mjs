/**
 * Creates the listing templates for the performance models the showroom sells.
 *
 * Figures are the manufacturers' published ones, WLTP combined where the car
 * sold in Europe. They are a starting point, not a quote: a template is
 * copied into a listing and the car in front of you is what gets edited.
 *
 * Photos are deliberately absent — a template describes a kind of car.
 *
 *   node scripts/seed-templates.mjs [--replace]
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

const T = {
  en: {
    layout: { F6T: "twin-turbo flat-six", F6: "naturally aspirated flat-six", V12: "naturally aspirated V12", V12T: "twin-turbo V12", EV: "electric drivetrain", V8T: "twin-turbo V8", V8: "V8", V6T: "twin-turbo V6", I6: "turbocharged straight-six", I5: "five-cylinder turbo", V8SC: "supercharged V8", I4T: "turbocharged four-cylinder" },
    drive: { AWD: "all-wheel drive", RWD: "rear-wheel drive" },
    gearbox: { DUAL_CLUTCH: "dual-clutch gearbox", AUTOMATIC: "automatic gearbox" },
    hp: "hp", sec: "s", to100: "0–100 km/h in", top: "top speed",
    phev: "Plug-in hybrid: it runs on electricity alone for short journeys and recharges from a wall box.",
    mhev: "A 48-volt system smooths the stop-start and recovers energy under braking.",
    thybrid: "Performance hybrid: it never plugs in — the battery is charged by the engine and by braking, and exists to fill the turbos.",
    ev: "Fully electric: {b} kWh battery, {r} km of WLTP range.",
    closing: "Inspected and certified to German standards, delivered anywhere in the world.",
  },
  fr: {
    layout: { F6T: "flat-six biturbo", F6: "flat-six atmosphérique", V12: "V12 atmosphérique", V12T: "V12 biturbo", EV: "chaîne de traction électrique", V8T: "V8 biturbo", V8: "V8", V6T: "V6 biturbo", I6: "six cylindres en ligne turbo", I5: "cinq cylindres turbo", V8SC: "V8 à compresseur", I4T: "quatre cylindres turbo" },
    drive: { AWD: "transmission intégrale", RWD: "propulsion" },
    gearbox: { DUAL_CLUTCH: "boîte à double embrayage", AUTOMATIC: "boîte automatique" },
    hp: "ch", sec: "s", to100: "0–100 km/h en", top: "vitesse maximale",
    phev: "Hybride rechargeable : elle roule en tout électrique sur les trajets courts et se recharge sur une borne.",
    mhev: "Un réseau 48 volts adoucit le stop-and-start et récupère l'énergie au freinage.",
    thybrid: "Hybride de performance : elle ne se branche pas — la batterie se recharge en roulant et au freinage, et sert à supprimer le temps de réponse des turbos.",
    ev: "100 % électrique : batterie de {b} kWh, {r} km d'autonomie WLTP.",
    closing: "Contrôlée et certifiée selon les standards allemands, livrée partout dans le monde.",
  },
  de: {
    layout: { F6T: "Sechszylinder-Boxer mit Biturbo", F6: "Sechszylinder-Boxer-Saugmotor", V12: "V12-Saugmotor", V12T: "V12-Biturbo", EV: "Elektroantrieb", V8T: "V8-Biturbo", V8: "V8", V6T: "V6-Biturbo", I6: "Reihensechszylinder mit Turbo", I5: "Fünfzylinder-Turbo", V8SC: "V8-Kompressor", I4T: "Vierzylinder-Turbo" },
    drive: { AWD: "Allradantrieb", RWD: "Hinterradantrieb" },
    gearbox: { DUAL_CLUTCH: "Doppelkupplungsgetriebe", AUTOMATIC: "Automatikgetriebe" },
    hp: "PS", sec: "s", to100: "0–100 km/h in", top: "Höchstgeschwindigkeit",
    phev: "Plug-in-Hybrid: rein elektrisch auf kurzen Strecken, Aufladung an der Wallbox.",
    mhev: "Ein 48-Volt-System glättet die Start-Stopp-Automatik und rekuperiert beim Bremsen.",
    thybrid: "Performance-Hybrid: kein Stecker — die Batterie lädt im Fahren und beim Bremsen und dient dazu, das Turboloch zu schließen.",
    ev: "Vollelektrisch: {b} kWh Batterie, {r} km WLTP-Reichweite.",
    closing: "Nach deutschen Standards geprüft und zertifiziert, Lieferung weltweit.",
  },
  zh: {
    layout: { F6T: "双涡轮增压水平对置六缸", F6: "自然吸气水平对置六缸", V12: "自然吸气 V12", V12T: "双涡轮增压 V12", EV: "纯电动驱动", V8T: "双涡轮增压 V8", V8: "V8", V6T: "双涡轮增压 V6", I6: "涡轮增压直列六缸", I5: "涡轮增压五缸", V8SC: "机械增压 V8", I4T: "涡轮增压四缸" },
    drive: { AWD: "四轮驱动", RWD: "后轮驱动" },
    gearbox: { DUAL_CLUTCH: "双离合变速箱", AUTOMATIC: "自动变速箱" },
    hp: "马力", sec: "秒", to100: "0–100 公里/小时加速", top: "最高时速",
    phev: "插电式混合动力：短途可纯电行驶，可通过充电桩充电。",
    mhev: "48 伏系统让启停更平顺，并在制动时回收能量。",
    thybrid: "性能混合动力：无需插电——电池在行驶与制动中充电，用于消除涡轮迟滞。",
    ev: "纯电动：{b} 千瓦时电池，WLTP 续航 {r} 公里。",
    closing: "按德国标准检测认证，配送至全球。",
  },
  ar: {
    layout: { F6T: "ستة أسطوانات مسطّحة بشاحنين توربو", F6: "ستة أسطوانات مسطّحة بسحب طبيعي", V12: "محرك V12 بسحب طبيعي", V12T: "محرك V12 بشاحنين توربو", EV: "مجموعة نقل حركة كهربائية", V8T: "V8 بشاحنين توربو", V8: "V8", V6T: "V6 بشاحنين توربو", I6: "ستة أسطوانات على التوالي بتوربو", I5: "خمس أسطوانات بتوربو", V8SC: "V8 بشاحن ميكانيكي", I4T: "أربع أسطوانات بتوربو" },
    drive: { AWD: "دفع رباعي", RWD: "دفع خلفي" },
    gearbox: { DUAL_CLUTCH: "ناقل حركة بقابضين", AUTOMATIC: "ناقل حركة أوتوماتيكي" },
    hp: "حصان", sec: "ثانية", to100: "من 0 إلى 100 كم/س في", top: "السرعة القصوى",
    phev: "هجينة قابلة للشحن: تسير كهربائيًا بالكامل في المشاوير القصيرة وتُشحن من محطة منزلية.",
    mhev: "نظام 48 فولت يجعل التشغيل والإيقاف أكثر سلاسة ويستعيد الطاقة عند الفرملة.",
    thybrid: "هجينة أداء: لا تُشحن بالكهرباء — تُشحن البطارية أثناء القيادة وعند الفرملة، ووظيفتها إلغاء تأخّر التوربو.",
    ev: "كهربائية بالكامل: بطارية {b} كيلوواط·ساعة، ومدى {r} كم وفق WLTP.",
    closing: "مفحوصة ومعتمدة وفق المعايير الألمانية، مع التوصيل إلى أنحاء العالم.",
  },
  es: {
    layout: { F6T: "bóxer de seis cilindros biturbo", F6: "bóxer de seis cilindros atmosférico", V12: "V12 atmosférico", V12T: "V12 biturbo", EV: "propulsión eléctrica", V8T: "V8 biturbo", V8: "V8", V6T: "V6 biturbo", I6: "seis cilindros en línea turbo", I5: "cinco cilindros turbo", V8SC: "V8 sobrealimentado por compresor", I4T: "cuatro cilindros turbo" },
    drive: { AWD: "tracción total", RWD: "propulsión trasera" },
    gearbox: { DUAL_CLUTCH: "caja de doble embrague", AUTOMATIC: "caja automática" },
    hp: "CV", sec: "s", to100: "0–100 km/h en", top: "velocidad máxima",
    phev: "Híbrido enchufable: circula en eléctrico puro en trayectos cortos y se recarga en un punto de carga.",
    mhev: "Un sistema de 48 voltios suaviza el arranque-parada y recupera energía al frenar.",
    thybrid: "Híbrido de prestaciones: no se enchufa — la batería se carga al rodar y al frenar, y sirve para eliminar el retardo de los turbos.",
    ev: "100 % eléctrico: batería de {b} kWh y {r} km de autonomía WLTP.",
    closing: "Revisado y certificado según estándares alemanes, con entrega en todo el mundo.",
  },
};

/* ── The cars ──────────────────────────────────────────────────────────── */
// layout/hybrid drive the prose; everything else is written to the form fields.

const CARS = [
  // ── Audi ────────────────────────────────────────────────────────────
  { name: "2026 Audi SQ7", brand: "Audi", model: "SQ7", version: "TFSI quattro tiptronic", year: 2026,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 507, kw: 373, nm: 770, acc: 4.1, top: 250,
    cons: 12.5, urban: 15.9, highway: 10.6, co2: 284, doors: 5, seats: 7, mhev: true },

  { name: "2026 Audi SQ5", brand: "Audi", model: "SQ5", version: "TFSI quattro S tronic", year: 2026,
    body: "SUV", segment: "SPORT", layout: "V6T", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 7,
    drivetrain: "AWD", engine: 3.0, cylinders: 6, hp: 367, kw: 270, nm: 550, acc: 4.5, top: 250,
    cons: 9.1, urban: 11.4, highway: 7.8, co2: 206, doors: 5, seats: 5, mhev: true },

  { name: "2026 Audi RS3", brand: "Audi", model: "RS3", version: "Sportback TFSI quattro S tronic", year: 2026,
    body: "HATCHBACK", segment: "SPORT", layout: "I5", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 7,
    drivetrain: "AWD", engine: 2.5, cylinders: 5, hp: 400, kw: 294, nm: 500, acc: 3.8, top: 250,
    cons: 9.6, urban: 12.2, highway: 8.1, co2: 218, doors: 5, seats: 5 },

  { name: "2026 Audi RS6", brand: "Audi", model: "RS6", version: "Avant performance TFSI quattro", year: 2026,
    body: "ESTATE", segment: "SPORT", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 630, kw: 463, nm: 850, acc: 3.4, top: 280,
    cons: 12.5, urban: 16.1, highway: 10.4, co2: 284, doors: 5, seats: 5, mhev: true },

  { name: "2026 Audi RSQ8", brand: "Audi", model: "RSQ8", version: "performance TFSI quattro", year: 2026,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 640, kw: 471, nm: 850, acc: 3.6, top: 305,
    cons: 13.0, urban: 16.8, highway: 10.8, co2: 295, doors: 5, seats: 5, mhev: true },

  { name: "2026 Audi RS5", brand: "Audi", model: "RS5", version: "TFSI quattro tiptronic", year: 2026,
    body: "COUPE", segment: "SPORT", layout: "V6T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 2.9, cylinders: 6, hp: 450, kw: 331, nm: 600, acc: 3.9, top: 250,
    cons: 9.5, urban: 12.1, highway: 8.0, co2: 217, doors: 2, seats: 4 },

  // ── Ferrari ─────────────────────────────────────────────────────────
  { name: "2025 Ferrari Purosangue", brand: "Ferrari", model: "Purosangue", version: "V12", year: 2025,
    body: "SUV", segment: "LUXURY", layout: "V12", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 6.5, cylinders: 12, hp: 725, kw: 533, nm: 716, acc: 3.3, top: 310,
    cons: 17.3, urban: 24.3, highway: 13.4, co2: 393, doors: 5, seats: 4 },

  { name: "2025 Ferrari 12Cilindri", brand: "Ferrari", model: "12Cilindri", version: "6.5 V12", year: 2025,
    body: "COUPE", segment: "SPORT", layout: "V12", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "RWD", engine: 6.5, cylinders: 12, hp: 830, kw: 610, nm: 678, acc: 2.9, top: 340,
    cons: 14.5, urban: 20.8, highway: 11.1, co2: 330, doors: 2, seats: 2 },

  { name: "Ferrari SF90 Stradale", brand: "Ferrari", model: "SF90", version: "Stradale", year: 2023,
    body: "COUPE", segment: "SPORT", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 1000, kw: 735, nm: 800, acc: 2.5, top: 340,
    cons: 6.1, co2: 154, battery: 7.9, range: 25, charge: "2 h 30 (2,2 kW)", doors: 2, seats: 2, phev: true },

  { name: "Ferrari 812 Superfast", brand: "Ferrari", model: "812", version: "Superfast", year: 2022,
    body: "COUPE", segment: "SPORT", layout: "V12", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 7,
    drivetrain: "RWD", engine: 6.5, cylinders: 12, hp: 800, kw: 588, nm: 718, acc: 2.9, top: 340,
    cons: 15.5, urban: 22.4, highway: 11.6, co2: 366, doors: 2, seats: 2 },

  { name: "2025 Ferrari 296 GTB", brand: "Ferrari", model: "296", version: "GTB", year: 2025,
    body: "COUPE", segment: "SPORT", layout: "V6T", fuel: "PLUGIN_HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "RWD", engine: 3.0, cylinders: 6, hp: 830, kw: 610, nm: 740, acc: 2.9, top: 330,
    cons: 6.4, co2: 149, battery: 7.45, range: 25, charge: "1 h 45 (7,4 kW)", doors: 2, seats: 2, phev: true },

  // ── BMW ─────────────────────────────────────────────────────────────
  { name: "2026 BMW X3 M50", brand: "BMW", model: "X3", version: "M50 xDrive", year: 2026,
    body: "SUV", segment: "SPORT", layout: "I6", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 3.0, cylinders: 6, hp: 398, kw: 293, nm: 580, acc: 4.6, top: 250,
    cons: 8.7, urban: 10.9, highway: 7.4, co2: 198, doors: 5, seats: 5, mhev: true },

  { name: "2026 BMW X5 M Competition", brand: "BMW", model: "X5", version: "M Competition", year: 2026,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.4, cylinders: 8, hp: 625, kw: 460, nm: 750, acc: 3.8, top: 290,
    cons: 12.5, urban: 16.3, highway: 10.3, co2: 284, doors: 5, seats: 5, mhev: true },

  { name: "2026 BMW M5", brand: "BMW", model: "M5", version: "xDrive", year: 2026,
    body: "SEDAN", segment: "SPORT", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.4, cylinders: 8, hp: 727, kw: 535, nm: 1000, acc: 3.5, top: 305,
    cons: 1.7, co2: 39, battery: 18.6, range: 67, charge: "3 h 15 (7,4 kW)", doors: 4, seats: 5, phev: true },

  { name: "2026 BMW M3 Competition", brand: "BMW", model: "M3", version: "Competition xDrive", year: 2026,
    body: "SEDAN", segment: "SPORT", layout: "I6", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 3.0, cylinders: 6, hp: 530, kw: 390, nm: 650, acc: 3.5, top: 290,
    cons: 10.1, urban: 13.2, highway: 8.3, co2: 230, doors: 4, seats: 5 },

  { name: "2026 BMW M4 Competition", brand: "BMW", model: "M4", version: "Competition xDrive", year: 2026,
    body: "COUPE", segment: "SPORT", layout: "I6", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 3.0, cylinders: 6, hp: 530, kw: 390, nm: 650, acc: 3.5, top: 290,
    cons: 10.2, urban: 13.4, highway: 8.4, co2: 232, doors: 2, seats: 4 },

  { name: "2026 BMW M2", brand: "BMW", model: "M2", version: "Coupé", year: 2026,
    body: "COUPE", segment: "SPORT", layout: "I6", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "RWD", engine: 3.0, cylinders: 6, hp: 480, kw: 353, nm: 600, acc: 4.2, top: 285,
    cons: 9.8, urban: 12.9, highway: 8.0, co2: 223, doors: 2, seats: 4 },

  { name: "2026 BMW X6 M Competition", brand: "BMW", model: "X6", version: "M Competition", year: 2026,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.4, cylinders: 8, hp: 625, kw: 460, nm: 750, acc: 3.8, top: 290,
    cons: 12.6, urban: 16.4, highway: 10.4, co2: 286, doors: 5, seats: 5, mhev: true },

  // Production of the X4 ended in November 2025, so this one is a used car
  // by definition — the template says so rather than pretending otherwise.
  { name: "2025 BMW X4 M Competition", brand: "BMW", model: "X4", version: "M Competition", year: 2025,
    body: "SUV", segment: "SPORT", layout: "I6", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 3.0, cylinders: 6, hp: 510, kw: 375, nm: 650, acc: 4.1, top: 280,
    cons: 10.7, urban: 14.0, highway: 8.8, co2: 243, doors: 5, seats: 5, condition: "USED" },

  // ── Porsche ─────────────────────────────────────────────────────────
  // The 992.2 generation. Turbo S and Targa 4 GTS are T-Hybrids: a 1.9 kWh
  // battery that never plugs in, there to spin the turbos rather than to
  // drive on — so they are hybrids, not plug-ins, and carry no electric range.
  { name: "2026 Porsche 911 Carrera 4S", brand: "Porsche", model: "911", version: "Carrera 4S", year: 2026,
    body: "COUPE", segment: "SPORT", layout: "F6T", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 3.0, cylinders: 6, hp: 480, kw: 353, nm: 530, acc: 3.3, top: 308,
    cons: 10.9, urban: 14.2, highway: 9.1, co2: 247, doors: 2, seats: 4 },

  { name: "2026 Porsche 911 Turbo S", brand: "Porsche", model: "911", version: "Turbo S T-Hybrid", year: 2026,
    body: "COUPE", segment: "SPORT", layout: "F6T", fuel: "HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 3.6, cylinders: 6, hp: 711, kw: 523, nm: 800, acc: 2.5, top: 322,
    cons: 11.5, urban: 14.8, highway: 9.6, co2: 261, battery: 1.9, doors: 2, seats: 4, thybrid: true },

  { name: "2026 Porsche 911 Targa 4 GTS", brand: "Porsche", model: "911", version: "Targa 4 GTS T-Hybrid", year: 2026,
    body: "CABRIOLET", segment: "SPORT", layout: "F6T", fuel: "HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 3.6, cylinders: 6, hp: 541, kw: 398, nm: 610, acc: 3.2, top: 312,
    cons: 10.7, urban: 13.9, highway: 8.9, co2: 243, battery: 1.9, doors: 2, seats: 4, thybrid: true },

  { name: "2026 Porsche 911 Targa 4S", brand: "Porsche", model: "911", version: "Targa 4S", year: 2026,
    body: "CABRIOLET", segment: "SPORT", layout: "F6T", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 3.0, cylinders: 6, hp: 480, kw: 353, nm: 530, acc: 3.6, top: 304,
    cons: 11.1, urban: 14.5, highway: 9.3, co2: 251, doors: 2, seats: 4 },

  // The GT cars keep the seven-speed PDK and, in Europe, leave the factory
  // as two-seaters.
  { name: "2026 Porsche 911 GT3", brand: "Porsche", model: "911", version: "GT3", year: 2026,
    body: "COUPE", segment: "SPORT", layout: "F6", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 7,
    drivetrain: "RWD", engine: 4.0, cylinders: 6, hp: 510, kw: 375, nm: 450, acc: 3.4, top: 311,
    cons: 13.8, urban: 19.6, highway: 10.8, co2: 312, doors: 2, seats: 2 },

  { name: "2026 Porsche 911 GT3 RS", brand: "Porsche", model: "911", version: "GT3 RS", year: 2026,
    body: "COUPE", segment: "SPORT", layout: "F6", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 7,
    drivetrain: "RWD", engine: 4.0, cylinders: 6, hp: 525, kw: 386, nm: 465, acc: 3.2, top: 296,
    cons: 13.4, urban: 19.1, highway: 10.5, co2: 305, doors: 2, seats: 2 },

  // Production of every 718 ended in October 2025, and this was the first and
  // last combustion GT4 RS — so the template says 2025, used, collector.
  { name: "2025 Porsche 718 Cayman GT4 RS", brand: "Porsche", model: "718 Cayman", version: "GT4 RS", year: 2025,
    body: "COUPE", segment: "COLLECTOR", layout: "F6", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 7,
    drivetrain: "RWD", engine: 4.0, cylinders: 6, hp: 500, kw: 368, nm: 450, acc: 3.4, top: 315,
    cons: 13.0, urban: 18.5, highway: 10.2, co2: 295, doors: 2, seats: 2, condition: "USED" },

  // ── Lamborghini ─────────────────────────────────────────────────────
  { name: "2026 Lamborghini Revuelto", brand: "Lamborghini", model: "Revuelto", version: "HPEV", year: 2026,
    body: "COUPE", segment: "SPORT", layout: "V12", fuel: "PLUGIN_HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 6.5, cylinders: 12, hp: 1015, kw: 747, nm: 725, acc: 2.5, top: 350,
    cons: 11.9, co2: 276, battery: 3.8, range: 10, charge: "30 min (7 kW)", doors: 2, seats: 2, phev: true },

  { name: "2026 Lamborghini Urus Performante", brand: "Lamborghini", model: "Urus", version: "Performante", year: 2026,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 666, kw: 490, nm: 850, acc: 3.3, top: 306,
    cons: 14.1, urban: 18.9, highway: 11.4, co2: 320, doors: 5, seats: 5 },

  { name: "2026 Lamborghini Urus SE", brand: "Lamborghini", model: "Urus", version: "SE", year: 2026,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 800, kw: 588, nm: 950, acc: 3.4, top: 312,
    cons: 3.8, co2: 86, battery: 25.9, range: 60, charge: "2 h 30 (7,4 kW)", doors: 5, seats: 5, phev: true },

  { name: "2026 Lamborghini Temerario", brand: "Lamborghini", model: "Temerario", version: "HPEV", year: 2026,
    body: "COUPE", segment: "SPORT", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 920, kw: 677, nm: 730, acc: 2.7, top: 343,
    cons: 11.0, co2: 250, battery: 3.8, range: 10, charge: "30 min (7 kW)", doors: 2, seats: 2, phev: true },

  // ── Land Rover ──────────────────────────────────────────────────────
  // The 4.4 twin-turbo V8 is BMW-built and mild-hybrid; the 5.0 supercharged
  // is Jaguar Land Rover's own and is not, which is why only one of the two
  // Defenders carries the 48-volt line in its description.
  { name: "2026 Land Rover Range Rover SV", brand: "Land Rover", model: "Range Rover", version: "SV P615", year: 2026,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.4, cylinders: 8, hp: 615, kw: 452, nm: 750, acc: 4.6, top: 261,
    cons: 13.0, urban: 17.4, highway: 10.8, co2: 294, doors: 5, seats: 5, mhev: true },

  { name: "2026 Land Rover Range Rover Sport SV", brand: "Land Rover", model: "Range Rover Sport", version: "SV P635", year: 2026,
    body: "SUV", segment: "SPORT", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.4, cylinders: 8, hp: 635, kw: 467, nm: 750, acc: 3.7, top: 290,
    cons: 11.7, urban: 15.6, highway: 9.7, co2: 271, doors: 5, seats: 5, mhev: true },

  { name: "2026 Land Rover Defender Octa", brand: "Land Rover", model: "Defender 110", version: "Octa P635", year: 2026,
    body: "SUV", segment: "OFFROAD", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.4, cylinders: 8, hp: 635, kw: 467, nm: 750, acc: 4.0, top: 250,
    cons: 14.5, urban: 19.3, highway: 11.8, co2: 330, doors: 5, seats: 5, mhev: true },

  { name: "2026 Land Rover Defender V8", brand: "Land Rover", model: "Defender 110", version: "V8 P525", year: 2026,
    body: "SUV", segment: "OFFROAD", layout: "V8SC", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 5.0, cylinders: 8, hp: 525, kw: 386, nm: 625, acc: 5.2, top: 240,
    cons: 14.8, urban: 19.8, highway: 12.0, co2: 335, doors: 5, seats: 5 },

  // ── Mercedes-AMG ────────────────────────────────────────────────────
  { name: "2026 Mercedes-AMG G 63", brand: "Mercedes-Benz", model: "G 63", version: "AMG 4MATIC+", year: 2026,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 9,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 585, kw: 430, nm: 850, acc: 4.3, top: 220,
    cons: 14.7, urban: 19.6, highway: 11.9, co2: 336, doors: 5, seats: 5, mhev: true },

  { name: "2026 Mercedes-AMG S 63 E Performance", brand: "Mercedes-Benz", model: "S 63", version: "AMG E Performance 4MATIC+", year: 2026,
    body: "SEDAN", segment: "LUXURY", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "AUTOMATIC", gears: 9,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 802, kw: 590, nm: 1430, acc: 3.3, top: 290,
    cons: 4.4, co2: 100, battery: 13.1, range: 33, charge: "2 h (3,7 kW)", doors: 4, seats: 5, phev: true },

  { name: "2026 Mercedes-AMG C 63 S E Performance", brand: "Mercedes-Benz", model: "C 63", version: "AMG S E Performance 4MATIC+", year: 2026,
    body: "SEDAN", segment: "SPORT", layout: "I4T", fuel: "PLUGIN_HYBRID", transmission: "AUTOMATIC", gears: 9,
    drivetrain: "AWD", engine: 2.0, cylinders: 4, hp: 680, kw: 500, nm: 1020, acc: 3.4, top: 280,
    cons: 6.9, co2: 156, battery: 6.1, range: 13, charge: "30 min (3,7 kW)", doors: 4, seats: 5, phev: true },

  // The W214 E-Class has no 63 yet — its range tops out at the E 53. So this
  // template is the last one built, the W213, and says used rather than
  // describing a car nobody can order.
  { name: "2023 Mercedes-AMG E 63 S", brand: "Mercedes-Benz", model: "E 63", version: "AMG S 4MATIC+", year: 2023,
    body: "SEDAN", segment: "SPORT", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 9,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 612, kw: 450, nm: 850, acc: 3.4, top: 300,
    cons: 12.0, urban: 16.0, highway: 9.7, co2: 272, doors: 4, seats: 5, condition: "USED" },

  { name: "2026 Mercedes-AMG A 45 S", brand: "Mercedes-Benz", model: "A 45", version: "AMG S 4MATIC+", year: 2026,
    body: "HATCHBACK", segment: "SPORT", layout: "I4T", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 2.0, cylinders: 4, hp: 421, kw: 310, nm: 500, acc: 3.9, top: 270,
    cons: 8.5, urban: 10.8, highway: 7.2, co2: 194, doors: 5, seats: 5 },
  // ── Aston Martin ────────────────────────────────────────────────────
  { name: "2025 Aston Martin Vanquish", brand: "Aston Martin", model: "Vanquish", version: "V12 Coupé", year: 2025,
    body: "COUPE", segment: "SPORT", layout: "V12T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "RWD", engine: 5.2, cylinders: 12, hp: 835, kw: 614, nm: 1000, acc: 3.3, top: 345,
    doors: 2, seats: 2 },

  { name: "2025 Aston Martin DB12", brand: "Aston Martin", model: "DB12", version: "Coupé", year: 2025,
    body: "COUPE", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "RWD", engine: 4.0, cylinders: 8, hp: 680, kw: 500, nm: 800, acc: 3.6, top: 325,
    cons: 12.2, co2: 276, doors: 2, seats: 4 },

  { name: "2025 Aston Martin DBX707", brand: "Aston Martin", model: "DBX", version: "707", year: 2025,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 9,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 707, kw: 520, nm: 900, acc: 3.3, top: 310,
    cons: 14.2, co2: 323, doors: 5, seats: 5 },

  // ── Bentley ─────────────────────────────────────────────────────────
  // The Speed models all run the Ultra Performance Hybrid: a V8 and an
  // electric motor in the gearbox, charged from a wall box like any plug-in.
  { name: "2025 Bentley Continental GT Speed", brand: "Bentley", model: "Continental GT", version: "Speed", year: 2025,
    body: "COUPE", segment: "LUXURY", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 782, kw: 575, nm: 1000, acc: 3.2, top: 335,
    doors: 2, seats: 4, phev: true, battery: 25.9, range: 81, charge: "11 kW AC" },

  { name: "2025 Bentley Flying Spur Speed", brand: "Bentley", model: "Flying Spur", version: "Speed", year: 2025,
    body: "SEDAN", segment: "LUXURY", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 782, kw: 575, nm: 1000, acc: 3.5, top: 285,
    doors: 4, seats: 4, phev: true, battery: 25.9, range: 76, charge: "11 kW AC" },

  { name: "2025 Bentley Bentayga Speed", brand: "Bentley", model: "Bentayga", version: "Speed", year: 2025,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 650, kw: 478, nm: 850, acc: 3.4, top: 310,
    doors: 5, seats: 5 },

  // ── McLaren ─────────────────────────────────────────────────────────
  { name: "2025 McLaren 750S", brand: "McLaren", model: "750S", version: "Coupé", year: 2025,
    body: "COUPE", segment: "SPORT", layout: "V8T", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 7,
    drivetrain: "RWD", engine: 4.0, cylinders: 8, hp: 750, kw: 552, nm: 800, acc: 2.8, top: 332,
    doors: 2, seats: 2 },

  { name: "2025 McLaren Artura Spider", brand: "McLaren", model: "Artura", version: "Spider", year: 2025,
    body: "CABRIOLET", segment: "SPORT", layout: "V6T", fuel: "PLUGIN_HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "RWD", engine: 3.0, cylinders: 6, hp: 700, kw: 515, nm: 720, acc: 3.0, top: 330,
    doors: 2, seats: 2, phev: true, battery: 7.4, range: 33 },

  // ── Maserati ────────────────────────────────────────────────────────
  { name: "2025 Maserati MC20 Cielo", brand: "Maserati", model: "MC20", version: "Cielo", year: 2025,
    body: "CABRIOLET", segment: "SPORT", layout: "V6T", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "RWD", engine: 3.0, cylinders: 6, hp: 630, kw: 463, nm: 730, acc: 3.0, top: 320,
    doors: 2, seats: 2 },

  { name: "2025 Maserati GranTurismo Trofeo", brand: "Maserati", model: "GranTurismo", version: "Trofeo", year: 2025,
    body: "COUPE", segment: "LUXURY", layout: "V6T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 3.0, cylinders: 6, hp: 550, kw: 405, nm: 650, acc: 3.5, top: 320,
    doors: 2, seats: 4 },

  // ── Porsche, beyond the 911 ─────────────────────────────────────────
  { name: "2025 Porsche Taycan Turbo GT", brand: "Porsche", model: "Taycan", version: "Turbo GT", year: 2025,
    body: "SEDAN", segment: "ELECTRIC", layout: "EV", fuel: "ELECTRIC", transmission: "AUTOMATIC", gears: 2,
    drivetrain: "AWD", hp: 1108, kw: 815, nm: 1340, acc: 2.2, top: 305,
    doors: 4, seats: 4, battery: 97, range: 555, charge: "320 kW DC" },

  { name: "2025 Porsche Panamera Turbo S E-Hybrid", brand: "Porsche", model: "Panamera", version: "Turbo S E-Hybrid", year: 2025,
    body: "SEDAN", segment: "LUXURY", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 782, kw: 575, nm: 1000, acc: 3.2, top: 325,
    doors: 4, seats: 4, phev: true, battery: 25.9, range: 91, charge: "11 kW AC" },

  { name: "2025 Porsche Cayenne Turbo E-Hybrid", brand: "Porsche", model: "Cayenne", version: "Turbo E-Hybrid", year: 2025,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 739, kw: 544, nm: 950, acc: 3.7, top: 295,
    doors: 5, seats: 5, phev: true, battery: 25.9, range: 74, charge: "11 kW AC" },

  { name: "2025 Porsche Macan Turbo", brand: "Porsche", model: "Macan", version: "Turbo", year: 2025,
    body: "SUV", segment: "ELECTRIC", layout: "EV", fuel: "ELECTRIC", transmission: "AUTOMATIC",
    drivetrain: "AWD", hp: 639, kw: 470, nm: 1130, acc: 3.3, top: 260,
    doors: 5, seats: 5, battery: 100, range: 591, charge: "270 kW DC" },

  // ── Mercedes-Benz, the two ends of the range ────────────────────────
  { name: "2025 Mercedes-AMG GT 63", brand: "Mercedes-Benz", model: "AMG GT 63", version: "4MATIC+ Coupé", year: 2025,
    body: "COUPE", segment: "SPORT", layout: "V8T", fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 9,
    drivetrain: "AWD", engine: 4.0, cylinders: 8, hp: 585, kw: 430, nm: 800, acc: 3.2, top: 315,
    doors: 2, seats: 4 },

  { name: "2025 Mercedes-Maybach S 680", brand: "Mercedes-Benz", model: "S 680", version: "Maybach 4MATIC", year: 2025,
    body: "SEDAN", segment: "LUXURY", layout: "V12T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 9,
    drivetrain: "AWD", engine: 6.0, cylinders: 12, hp: 612, kw: 450, nm: 900, acc: 4.5, top: 250,
    doors: 4, seats: 4 },

  // ── BMW, above the M cars ───────────────────────────────────────────
  { name: "2025 BMW XM Label", brand: "BMW", model: "XM", version: "Label", year: 2025,
    body: "SUV", segment: "LUXURY", layout: "V8T", fuel: "PLUGIN_HYBRID", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 4.4, cylinders: 8, hp: 748, kw: 550, nm: 1000, acc: 3.8, top: 290,
    doors: 5, seats: 5, phev: true, battery: 25.7, range: 74, charge: "7.4 kW AC" },

  { name: "2025 BMW i7 M70 xDrive", brand: "BMW", model: "i7", version: "M70 xDrive", year: 2025,
    body: "SEDAN", segment: "ELECTRIC", layout: "EV", fuel: "ELECTRIC", transmission: "AUTOMATIC",
    drivetrain: "AWD", hp: 660, kw: 485, nm: 1100, acc: 3.7, top: 250,
    doors: 4, seats: 5, battery: 101.7, range: 560, charge: "195 kW DC" },

  // ── Audi ────────────────────────────────────────────────────────────
  { name: "2025 Audi RS e-tron GT performance", brand: "Audi", model: "RS e-tron GT", version: "performance", year: 2025,
    body: "SEDAN", segment: "ELECTRIC", layout: "EV", fuel: "ELECTRIC", transmission: "AUTOMATIC", gears: 2,
    drivetrain: "AWD", hp: 925, kw: 680, nm: 1027, acc: 2.5, top: 250,
    doors: 4, seats: 4, battery: 105, range: 598, charge: "320 kW DC" },

  // ── Ferrari ─────────────────────────────────────────────────────────
  { name: "2025 Ferrari 296 Speciale", brand: "Ferrari", model: "296", version: "Speciale", year: 2025,
    body: "COUPE", segment: "SPORT", layout: "V6T", fuel: "PLUGIN_HYBRID", transmission: "DUAL_CLUTCH", gears: 8,
    drivetrain: "RWD", engine: 3.0, cylinders: 6, hp: 880, kw: 647, nm: 740, acc: 2.8, top: 330,
    doors: 2, seats: 2, phev: true, battery: 7.45, range: 25 },

  // ── Rolls-Royce ─────────────────────────────────────────────────────
  { name: "2025 Rolls-Royce Cullinan Series II Black Badge", brand: "Rolls-Royce", model: "Cullinan", version: "Series II Black Badge", year: 2025,
    body: "SUV", segment: "LUXURY", layout: "V12T", fuel: "PETROL", transmission: "AUTOMATIC", gears: 8,
    drivetrain: "AWD", engine: 6.75, cylinders: 12, hp: 600, kw: 441, nm: 900, acc: 4.9, top: 250,
    doors: 5, seats: 5 },

  { name: "2025 Rolls-Royce Spectre", brand: "Rolls-Royce", model: "Spectre", version: null, year: 2025,
    body: "COUPE", segment: "ELECTRIC", layout: "EV", fuel: "ELECTRIC", transmission: "AUTOMATIC",
    drivetrain: "AWD", hp: 585, kw: 430, nm: 900, acc: 4.5, top: 250,
    doors: 2, seats: 4, battery: 102, range: 520, charge: "195 kW DC" },
];


/* ── Indicative pricing and colours ────────────────────────────────────── */

/**
 * German list prices, VAT included, rounded. A template carries a starting
 * figure so the pricing section is not blank; the advisor replaces it with
 * what this particular car is actually being sold for.
 */
const PRICE = {
  "2026 Audi SQ7": 116000, "2026 Audi SQ5": 84000, "2026 Audi RS3": 72000,
  "2026 Audi RS6": 145000, "2026 Audi RSQ8": 172000, "2026 Audi RS5": 98000,
  "2025 Ferrari Purosangue": 420000, "2025 Ferrari 12Cilindri": 415000,
  "Ferrari SF90 Stradale": 480000, "Ferrari 812 Superfast": 350000,
  "2025 Ferrari 296 GTB": 330000,
  "2026 BMW X3 M50": 78000, "2026 BMW X5 M Competition": 165000, "2026 BMW M5": 148000,
  "2026 BMW M3 Competition": 108000, "2026 BMW M4 Competition": 115000, "2026 BMW M2": 79000,
  "2026 BMW X6 M Competition": 172000, "2025 BMW X4 M Competition": 118000,
  "2026 Porsche 911 Carrera 4S": 150000,
  "2026 Porsche 911 Turbo S": 275000,
  "2026 Porsche 911 Targa 4 GTS": 200000,
  "2026 Porsche 911 Targa 4S": 165000,
  "2026 Porsche 911 GT3": 200000,
  "2026 Porsche 911 GT3 RS": 260000,
  "2025 Porsche 718 Cayman GT4 RS": 165000,
  "2026 Lamborghini Revuelto": 560000, "2026 Lamborghini Urus Performante": 295000,
  "2026 Lamborghini Urus SE": 305000, "2026 Lamborghini Temerario": 330000,
  "2026 Land Rover Range Rover SV": 235000, "2026 Land Rover Range Rover Sport SV": 195000,
  "2026 Land Rover Defender Octa": 175000, "2026 Land Rover Defender V8": 138000,
  "2026 Mercedes-AMG G 63": 212000, "2026 Mercedes-AMG S 63 E Performance": 228000,
  "2026 Mercedes-AMG C 63 S E Performance": 118000, "2023 Mercedes-AMG E 63 S": 95000,
  "2026 Mercedes-AMG A 45 S": 73000,
  "2025 Aston Martin Vanquish": 400000, "2025 Aston Martin DB12": 260000,
  "2025 Aston Martin DBX707": 250000,
  "2025 Bentley Continental GT Speed": 300000, "2025 Bentley Flying Spur Speed": 300000,
  "2025 Bentley Bentayga Speed": 280000,
  "2025 McLaren 750S": 330000, "2025 McLaren Artura Spider": 300000,
  "2025 Maserati MC20 Cielo": 280000, "2025 Maserati GranTurismo Trofeo": 200000,
  "2025 Porsche Taycan Turbo GT": 240000, "2025 Porsche Panamera Turbo S E-Hybrid": 230000,
  "2025 Porsche Cayenne Turbo E-Hybrid": 190000, "2025 Porsche Macan Turbo": 120000,
  "2025 Mercedes-AMG GT 63": 210000, "2025 Mercedes-Maybach S 680": 280000,
  "2025 BMW XM Label": 210000, "2025 BMW i7 M70 xDrive": 190000,
  "2025 Audi RS e-tron GT performance": 170000,
  "2025 Ferrari 296 Speciale": 460000,
  "2025 Rolls-Royce Cullinan Series II Black Badge": 480000, "2025 Rolls-Royce Spectre": 480000,
};

/** A colour each marque is actually associated with, inside for contrast. */
const COLOURS = {
  Audi: ["grey", "black"],
  BMW: ["black", "black"],
  Ferrari: ["red", "black"],
  Lamborghini: ["yellow", "black"],
  "Land Rover": ["green", "beige"],
  "Mercedes-Benz": ["silver", "black"],
  Porsche: ["white", "black"],
  "Aston Martin": ["green", "black"],
  Bentley: ["blue", "beige"],
  McLaren: ["orange", "black"],
  Maserati: ["blue", "red"],
  "Rolls-Royce": ["black", "beige"],
};

/* ── Equipment by kind of car ──────────────────────────────────────────── */

const BASE = ["abs", "esp", "airbags", "tpms", "alarm", "emergency_brake", "climate_auto",
  "heated_seats", "keyless", "nav", "apple_carplay", "android_auto", "premium_audio",
  "digital_cockpit", "led_headlights", "alloy_wheels", "sport_seats", "leather_interior",
  "ambient_lighting", "rear_camera", "park_sensors", "adaptive_dampers"];

const SUV_EXTRA = ["isofix", "adaptive_cruise", "lane_assist", "blind_spot", "camera_360",
  "electric_tailgate", "air_suspension", "panoramic_roof", "roof_rails", "climate_quad",
  "ventilated_seats", "memory_seats", "head_up", "matrix_led", "wireless_charging", "folding_seats", "armrest"];

const SPORT_EXTRA = ["carbon_trim", "sport_package", "head_up", "matrix_led", "wireless_charging"];

function equipmentFor(car) {
  const set = new Set(BASE);
  for (const key of car.body === "SUV" || car.body === "ESTATE" ? SUV_EXTRA : SPORT_EXTRA) set.add(key);
  if (car.body === "HATCHBACK" || car.body === "SEDAN") {
    for (const key of ["isofix", "adaptive_cruise", "lane_assist", "blind_spot", "head_up", "folding_seats", "armrest"]) set.add(key);
  }
  return [...set];
}

/* ── Prose ─────────────────────────────────────────────────────────────── */

function headline(car, loc) {
  const t = T[loc];
  return `${t.layout[car.layout]} · ${car.hp} ${t.hp} · ${t.drive[car.drivetrain]}`;
}

/** French, German and Spanish write decimals with a comma. */
const COMMA_DECIMAL = new Set(["fr", "de", "es"]);
const decimal = (value, loc) =>
  COMMA_DECIMAL.has(loc) ? String(value).replace(".", ",") : String(value);

function description(car, loc) {
  const t = T[loc];
  const title = `${car.brand} ${car.model}${car.version ? " " + car.version : ""}`;

  // An electric car has no displacement to quote and no gearbox worth
  // naming, so its opening sentence is built from what it does have.
  const opening = car.layout === "EV"
    ? `${title} — ${t.layout.EV}, ${car.hp} ${t.hp} (${car.kw} kW), ${car.nm} Nm, ${t.drive[car.drivetrain]}.`
    : `${title} — ${t.layout[car.layout]} ${decimal(car.engine.toFixed(1), loc)} l, ${car.hp} ${t.hp} (${car.kw} kW), ${car.nm} Nm, ${t.drive[car.drivetrain]}, ${t.gearbox[car.transmission]}.`;

  const lines = [
    opening,
    `${t.to100} ${decimal(car.acc.toFixed(1), loc)} ${t.sec}, ${t.top} ${car.top} km/h.`,
  ];
  if (car.layout === "EV" && car.battery && car.range) {
    lines.push(t.ev.replace("{b}", decimal(car.battery, loc)).replace("{r}", String(car.range)));
  } else if (car.phev) lines.push(t.phev);
  else if (car.thybrid) lines.push(t.thybrid);
  else if (car.mhev) lines.push(t.mhev);
  lines.push(t.closing);
  return lines.join(" ");
}

/* ── Payload ───────────────────────────────────────────────────────────── */

/**
 * Rental is offered on the cars a company actually leases — the SUVs, the
 * estate and the saloons. A 296 GTB is bought, not leased on a 48-month
 * contract, so those templates leave the rental section alone rather than
 * carrying a figure nobody would quote.
 */
const RENTABLE = new Set(["SUV", "ESTATE", "SEDAN", "HATCHBACK"]);

/** A rough monthly on 48 months / 15.000 km, rounded to something quotable. */
const monthly = (price) => Math.round((price * 0.011) / 10) * 10;

function payloadFor(car) {
  const p = {
    brand: car.brand, model: car.model, version: car.version, year: String(car.year),
    bodyType: car.body, condition: car.condition ?? "NEW", segment: car.segment,
    fuel: car.fuel, transmission: car.transmission,
    drivetrain: car.drivetrain,
    powerHp: String(car.hp), powerKw: String(car.kw), torqueNm: String(car.nm),
    acceleration: String(car.acc), topSpeed: String(car.top),
    energyLabel: car.fuel === "ELECTRIC" ? "A" : car.phev ? "B" : "G",
    doors: String(car.doors), seats: String(car.seats),
    status: "AVAILABLE", vatDeductible: "on",
    equipment: equipmentFor(car),
  };

  // Written only when the car has one. A figure a maker does not publish —
  // the litres of an electric car, the fuel consumption of a model whose
  // WLTP sheet is not out — is left empty for the advisor to fill from the
  // car's own papers, rather than guessed here.
  if (car.gears) p.gears = String(car.gears);
  if (car.engine) p.engineSize = String(car.engine);
  if (car.cylinders) p.cylinders = String(car.cylinders);
  if (car.cons) p.consumptionCombined = String(car.cons);
  if (car.co2 !== undefined) p.co2 = String(car.co2);
  if (car.fuel !== "ELECTRIC") p.emissionClass = "EURO6D";
  // ── Body & interior ──
  const [outside, inside] = COLOURS[car.brand] ?? ["grey", "black"];
  p.colorExterior = outside;
  p.colorInterior = inside;
  p.paintType = car.paintType ?? "METALLIC";
  p.upholstery = car.upholstery ?? "LEATHER";

  // ── History & condition ──
  // A template describes a new car unless it says otherwise, so the history
  // reads as one: no previous keeper, full service record, manufacturer
  // warranty. A used example gets edited when the listing is made.
  p.previousOwners = car.condition === "USED" ? "1" : "0";
  p.serviceHistory = "on";
  p.accidentFree = "on";
  p.nonSmoker = "on";
  p.warrantyMonths = String(car.warranty ?? 24);

  // ── Pricing ──
  // Indicative German list prices, VAT included: a starting point for the
  // advisor to replace with what this particular car is being sold for.
  const price = PRICE[car.name];
  p.price = String(price);
  p.priceNet = String(Math.round(price / 1.19));
  p.negotiable = "on";
  p.financingMonthly = String(monthly(price));

  // ── Long-term rental ──
  if (RENTABLE.has(car.body)) {
    p.rentalAvailable = "on";
    p.rentalMonthly = String(monthly(price));
    p.rentalDeposit = String(Math.round((price * 0.15) / 500) * 500);
    p.rentalFirstPayment = String(Math.round((price * 0.1) / 500) * 500);
    p.rentalDurations = ["36", "48", "60"];
    p.rentalMileages = ["10000", "15000", "20000"];
  }

  if (car.urban) p.consumptionUrban = String(car.urban);
  if (car.highway) p.consumptionHighway = String(car.highway);
  if (car.battery) p.batteryCapacity = String(car.battery);
  if (car.range) p.electricRange = String(car.range);
  if (car.charge) p.chargingTime = car.charge;

  for (const loc of LOCALES) {
    p[`headline_${loc}`] = headline(car, loc);
    p[`description_${loc}`] = description(car, loc);
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
for (const car of CARS) {
  const data = {
    name: car.name,
    brand: car.brand,
    model: car.model,
    version: car.version ?? null,
    payload: payloadFor(car),
    createdById: author?.id ?? null,
  };
  const existing = await prisma.vehicleTemplate.findFirst({ where: { name: car.name }, select: { id: true } });
  if (existing) {
    // A template that is already there may have been edited in the back
    // office since. Adding a car to this list must not quietly undo that, so
    // rewriting one is opt-in.
    if (!replace) { skipped++; continue; }
    await prisma.vehicleTemplate.update({ where: { id: existing.id }, data });
    updated++;
  } else {
    await prisma.vehicleTemplate.create({ data });
    created++;
  }
}

console.log(`  modèles créés: ${created} · mis à jour: ${updated} · inchangés: ${skipped} · total: ${CARS.length}`);
await prisma.$disconnect();
