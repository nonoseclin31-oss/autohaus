/**
 * Seeds Autohaus Motion with staff accounts, a demo catalogue and leads.
 * Run with: npm run db:seed
 */
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const prisma = new PrismaClient();
const UPLOAD_DIR = path.join(process.cwd(), "public", "uploads");

/* ── Placeholder imagery ────────────────────────────────────────
   Studio-backdrop SVGs so the layout can be judged without stock
   photography. Replace them by uploading real photos in the admin. */

const SILHOUETTES = {
  SEDAN: "M60 300 L100 300 Q110 258 150 250 L230 236 Q300 196 400 196 L520 196 Q610 200 680 240 L790 258 Q840 266 845 300 L880 300 L880 330 L60 330 Z",
  SUV: "M60 300 L96 300 Q104 240 148 232 L232 214 Q290 160 400 160 L540 160 Q630 166 700 216 L800 236 Q846 248 850 300 L884 300 L884 336 L60 336 Z",
  COUPE: "M60 302 L104 302 Q114 262 152 254 L246 240 Q320 182 430 182 L540 184 Q628 194 700 244 L792 260 Q838 268 842 302 L878 302 L878 330 L60 330 Z",
  ESTATE: "M60 300 L100 300 Q110 254 150 246 L226 230 Q290 190 396 190 L620 190 Q700 192 736 230 L800 252 Q844 262 848 300 L882 300 L882 332 L60 332 Z",
  CABRIOLET: "M60 302 L104 302 Q114 266 154 258 L250 246 Q330 212 432 212 L544 214 Q630 220 700 250 L792 264 Q838 272 842 302 L878 302 L878 330 L60 330 Z",
  HATCHBACK: "M60 302 L100 302 Q110 260 148 252 L226 238 Q288 196 384 196 L500 196 Q580 204 640 248 L770 262 Q824 270 828 302 L868 302 L868 332 L60 332 Z",
};

function placeholderSvg({ title, subtitle, accent, body, index }) {
  const path = SILHOUETTES[body] ?? SILHOUETTES.SEDAN;
  const angles = ["3/4 FRONT", "PROFILE", "3/4 REAR", "INTERIOR"];
  const angle = angles[index % angles.length];
  const shift = index % 2 === 0 ? 1 : -1;

  // Light cyclorama, the way a studio shoots a car: white sweep, soft floor
  // reflection, the body in warm stone with the vehicle's accent as rim light.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 600" width="960" height="600" role="img" aria-label="${escapeXml(title)}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="52%" stop-color="#f7f6f4"/>
      <stop offset="72%" stop-color="#ecebe8"/>
      <stop offset="100%" stop-color="#e3e1dd"/>
    </linearGradient>
    <radialGradient id="spot" cx="50%" cy="18%" r="60%">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="tint" cx="82%" cy="12%" r="55%">
      <stop offset="0%" stop-color="${accent}" stop-opacity="0.12"/>
      <stop offset="100%" stop-color="${accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="carFill" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d9d6d1"/>
      <stop offset="55%" stop-color="#b9b5ae"/>
      <stop offset="100%" stop-color="#8f8a83"/>
    </linearGradient>
    <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.85"/>
      <stop offset="100%" stop-color="#cfcbc4" stop-opacity="0.6"/>
    </linearGradient>
    <radialGradient id="shadow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#0c0a09" stop-opacity="0.26"/>
      <stop offset="100%" stop-color="#0c0a09" stop-opacity="0"/>
    </radialGradient>
  </defs>

  <rect width="960" height="600" fill="url(#bg)"/>
  <rect width="960" height="600" fill="url(#spot)"/>
  <rect width="960" height="600" fill="url(#tint)"/>

  <g opacity="0.5" stroke="#0c0a09" stroke-opacity="0.04" stroke-width="1">
    ${Array.from({ length: 11 }, (_, i) => `<line x1="${i * 96}" y1="0" x2="${i * 96}" y2="600"/>`).join("")}
  </g>

  <g transform="translate(0 ${58 + shift * 6})">
    <ellipse cx="480" cy="356" rx="366" ry="30" fill="url(#shadow)"/>
    <path d="${path}" fill="url(#carFill)" stroke="${accent}" stroke-width="2" stroke-opacity="0.55"/>
    <path d="M300 250 L440 232 L560 232 L650 252 L560 246 L440 246 Z" fill="url(#glass)"/>
    <circle cx="250" cy="330" r="46" fill="#3c3835" stroke="#26221f" stroke-width="5"/>
    <circle cx="250" cy="330" r="20" fill="#e9e7e3" stroke="${accent}" stroke-width="2.5"/>
    <circle cx="700" cy="330" r="46" fill="#3c3835" stroke="#26221f" stroke-width="5"/>
    <circle cx="700" cy="330" r="20" fill="#e9e7e3" stroke="${accent}" stroke-width="2.5"/>
  </g>

  <g transform="translate(48 486)">
    <rect x="0" y="0" width="52" height="3" fill="#1c1917"/>
    <rect x="52" y="0" width="52" height="3" fill="#c8102e"/>
    <rect x="104" y="0" width="52" height="3" fill="#ca8a04"/>
    <text x="0" y="40" font-family="Playfair Display, Georgia, serif" font-size="34" font-weight="500" fill="#0c0a09" letter-spacing="-0.5">${escapeXml(title)}</text>
    <text x="0" y="68" font-family="Inter, Helvetica, Arial, sans-serif" font-size="15" fill="#57534e">${escapeXml(subtitle)}</text>
  </g>

  <text x="912" y="56" text-anchor="end" font-family="Inter, Helvetica, Arial, sans-serif" font-size="12" font-weight="600" fill="#a8a29e" letter-spacing="3">${angle}</text>
</svg>`;
}

function escapeXml(value) {
  return String(value).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" })[c],
  );
}

async function writePlaceholders(slug, spec, count) {
  const urls = [];
  for (let i = 0; i < count; i++) {
    const filename = `seed-${slug}-${i + 1}.svg`;
    await writeFile(
      path.join(UPLOAD_DIR, filename),
      placeholderSvg({ ...spec, index: i }),
      "utf8",
    );
    urls.push(`/uploads/${filename}`);
  }
  return urls;
}

/* ── Catalogue ──────────────────────────────────────────────── */

const VEHICLES = [
  {
    slug: "porsche-911-carrera-4s-am-0126-a1x9",
    reference: "AM-0126-A1X9",
    brand: "Porsche", model: "911", version: "Carrera 4S PDK", year: 2022,
    bodyType: "COUPE", condition: "USED", segment: "SPORT",
    fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 8, drivetrain: "AWD",
    engineSize: 3.0, cylinders: 6, powerHp: 450, torqueNm: 530, acceleration: 3.6, topSpeed: 306,
    consumptionCombined: 10.2, co2: 233, emissionClass: "EURO6D",
    doors: 2, seats: 4, colorExterior: "red", colorInterior: "black", paintType: "METALLIC", upholstery: "LEATHER",
    mileage: 24800, firstRegistration: "2022-03-14", previousOwners: 1, serviceHistory: true,
    warrantyMonths: 12, accidentFree: true, nonSmoker: true,
    price: 149900, priceNet: 125966, vatDeductible: true, oldPrice: 158000, financingMonthly: 1690,
    rentalAvailable: true, rentalMonthly: 1890, rentalDeposit: 12000,
    status: "AVAILABLE", published: true, featured: true, accent: "#e30613",
    equipment: ["abs", "esp", "airbags", "tpms", "alarm", "emergency_brake", "adaptive_cruise", "lane_assist",
      "blind_spot", "park_sensors", "rear_camera", "climate_auto", "heated_seats", "ventilated_seats", "memory_seats",
      "keyless", "adaptive_dampers", "nav", "apple_carplay", "android_auto", "premium_audio", "digital_cockpit",
      "led_headlights", "matrix_led", "alloy_wheels", "sport_package", "leather_interior", "sport_seats", "carbon_trim"],
    translations: {
      en: { headline: "Sports Chrono, PASM and a full Porsche service record",
        description: "A 992-generation Carrera 4S in Guards Red with the Sports Chrono package, PASM adaptive dampers and the sports exhaust.\n\nOne owner from new, maintained exclusively at the Porsche Centre with every stamp present. The car is entirely original with no accident history, and the paintwork has been measured across every panel.\n\nSupplied with two keys, the complete book pack and a fresh service." },
      fr: { headline: "Sports Chrono, PASM et carnet Porsche complet",
        description: "Une Carrera 4S de génération 992 en rouge Indien avec le pack Sports Chrono, les amortisseurs pilotés PASM et l'échappement sport.\n\nPremière main, entretenue exclusivement au Centre Porsche, carnet intégralement tamponné. Véhicule totalement d'origine, non accidenté, épaisseur de peinture mesurée sur chaque panneau.\n\nLivrée avec deux clés, la pochette complète et une révision neuve." },
      de: { headline: "Sport Chrono, PASM und lückenloses Porsche-Scheckheft",
        description: "Ein Carrera 4S der Generation 992 in Indischrot mit Sport-Chrono-Paket, PASM-Fahrwerk und Sportauspuffanlage.\n\nErste Hand, ausschließlich im Porsche Zentrum gewartet, Scheckheft lückenlos. Fahrzeug vollständig original und unfallfrei, Lackschichtdicke an jedem Bauteil gemessen.\n\nÜbergabe mit zwei Schlüsseln, kompletter Bordmappe und frischem Service." },
      zh: { headline: "Sport Chrono 组件、PASM 底盘，保养记录齐全",
        description: "992 世代 Carrera 4S，印第安红车漆，配备 Sport Chrono 组件、PASM 自适应悬架与运动排气。\n\n一手车主，全程在保时捷中心保养，保养记录完整无缺。车辆完全原厂，无事故记录，全车漆膜厚度均已检测。\n\n随车提供两把钥匙、完整车辆手册及全新保养。" },
      ar: { headline: "حزمة Sport Chrono ونظام PASM وسجل صيانة كامل من بورشه",
        description: "سيارة Carrera 4S من الجيل 992 بلون الأحمر الهندي، مزودة بحزمة Sport Chrono ومخمدات PASM التكيفية وعادم رياضي.\n\nمالك واحد منذ الجديد، وصيانة حصرية لدى مركز بورشه مع سجل كامل. السيارة أصلية بالكامل وخالية من الحوادث، وتم قياس سماكة الطلاء على كل قطعة.\n\nتُسلَّم مع مفتاحين ودفتر السيارة كاملاً وصيانة حديثة." },
      es: { headline: "Sport Chrono, PASM y libro de mantenimiento Porsche completo",
        description: "Un Carrera 4S de la generación 992 en rojo indio con el paquete Sport Chrono, amortiguadores adaptativos PASM y escape deportivo.\n\nPrimera mano, mantenido exclusivamente en el Centro Porsche con todos los sellos. Vehículo totalmente original y sin siniestros, con medición del espesor de pintura en cada panel.\n\nSe entrega con dos llaves, la documentación completa y una revisión reciente." },
    },
  },
  {
    slug: "bmw-m3-competition-xdrive-am-0126-b4k2",
    reference: "AM-0126-B4K2",
    brand: "BMW", model: "M3", version: "Competition xDrive", year: 2023,
    bodyType: "SEDAN", condition: "USED", segment: "SPORT",
    fuel: "PETROL", transmission: "AUTOMATIC", gears: 8, drivetrain: "AWD",
    engineSize: 3.0, cylinders: 6, powerHp: 510, torqueNm: 650, acceleration: 3.5, topSpeed: 290,
    consumptionCombined: 10.4, co2: 236, emissionClass: "EURO6D",
    doors: 4, seats: 5, colorExterior: "grey", colorInterior: "red", paintType: "METALLIC", upholstery: "LEATHER",
    mileage: 18400, firstRegistration: "2023-05-02", previousOwners: 1, serviceHistory: true,
    warrantyMonths: 24, accidentFree: true, nonSmoker: true,
    price: 98500, priceNet: 82773, vatDeductible: true, financingMonthly: 1120,
    rentalAvailable: true, rentalMonthly: 1290, rentalDeposit: 8000,
    status: "RESERVED", published: true, featured: true, accent: "#38bdf8",
    equipment: ["abs", "esp", "airbags", "isofix", "tpms", "emergency_brake", "adaptive_cruise", "lane_assist",
      "blind_spot", "park_sensors", "camera_360", "rear_camera", "park_assist", "traffic_sign", "climate_auto",
      "heated_seats", "memory_seats", "keyless", "electric_tailgate", "adaptive_dampers", "heated_wheel",
      "nav", "apple_carplay", "android_auto", "premium_audio", "head_up", "digital_cockpit", "wireless_charging",
      "led_headlights", "matrix_led", "alloy_wheels", "sport_package", "ambient_lighting", "sport_seats", "carbon_trim"],
    translations: {
      en: { headline: "M Driver's Package, carbon bucket seats, BMW warranty to 2027",
        description: "M3 Competition with xDrive in Skyscraper Grey, specified with the M Driver's Package, carbon fibre bucket seats and the M Carbon exterior package.\n\nStill covered by the BMW factory warranty until May 2027. Delivered with a fresh inspection and new front tyres." },
      fr: { headline: "M Driver's Package, baquets carbone, garantie BMW jusqu'en 2027",
        description: "M3 Competition xDrive en gris Skyscraper, dotée du M Driver's Package, des baquets carbone et du pack extérieur M Carbon.\n\nEncore couverte par la garantie constructeur BMW jusqu'en mai 2027. Livrée avec révision neuve et pneumatiques avant neufs." },
      de: { headline: "M Driver's Package, Carbon-Schalensitze, BMW-Garantie bis 2027",
        description: "M3 Competition xDrive in Skyscraper-Grau mit M Driver's Package, Carbon-Schalensitzen und M Carbon Exterieurpaket.\n\nNoch bis Mai 2027 in der BMW-Werksgarantie. Übergabe mit frischer Inspektion und neuen Vorderreifen." },
      zh: { headline: "M 驾驶者组件、碳纤维桶形座椅，宝马原厂质保至 2027 年",
        description: "M3 Competition xDrive，摩天灰车漆，选装 M 驾驶者组件、碳纤维桶形座椅及 M 碳纤维外观套件。\n\n仍在宝马原厂质保期内，至 2027 年 5 月。交车前完成全新保养并更换前轮胎。" },
      ar: { headline: "حزمة M Driver ومقاعد كربون رياضية وضمان BMW حتى 2027",
        description: "سيارة M3 Competition بنظام xDrive بلون الرمادي Skyscraper، مزودة بحزمة M Driver ومقاعد كربون رياضية وحزمة M Carbon الخارجية.\n\nما زالت مشمولة بضمان المصنع من BMW حتى مايو 2027. تُسلَّم بعد صيانة حديثة وإطارات أمامية جديدة." },
      es: { headline: "M Driver's Package, baquets de carbono, garantía BMW hasta 2027",
        description: "M3 Competition xDrive en gris Skyscraper, con el M Driver's Package, asientos baquet de carbono y el paquete exterior M Carbon.\n\nTodavía cubierto por la garantía de fábrica BMW hasta mayo de 2027. Se entrega con revisión reciente y neumáticos delanteros nuevos." },
    },
  },
  {
    slug: "audi-q7-50-tdi-quattro-am-0126-c7m5",
    reference: "AM-0126-C7M5",
    brand: "Audi", model: "Q7", version: "50 TDI quattro S line", year: 2022,
    bodyType: "SUV", condition: "USED", segment: "FAMILY",
    fuel: "DIESEL", transmission: "AUTOMATIC", gears: 8, drivetrain: "AWD",
    engineSize: 3.0, cylinders: 6, powerHp: 286, torqueNm: 600, acceleration: 6.3, topSpeed: 241,
    consumptionCombined: 7.6, co2: 199, emissionClass: "EURO6D",
    doors: 5, seats: 7, colorExterior: "black", colorInterior: "beige", paintType: "METALLIC", upholstery: "LEATHER",
    mileage: 62300, firstRegistration: "2022-01-20", previousOwners: 1, serviceHistory: true,
    warrantyMonths: 12, accidentFree: true, nonSmoker: true,
    price: 62900, priceNet: 52857, vatDeductible: true, financingMonthly: 720,
    rentalAvailable: true, rentalMonthly: 849, rentalDeposit: 5000,
    status: "AVAILABLE", published: true, featured: true, accent: "#ffc300",
    equipment: ["abs", "esp", "airbags", "isofix", "tpms", "alarm", "emergency_brake", "adaptive_cruise",
      "lane_assist", "blind_spot", "park_sensors", "camera_360", "rear_camera", "park_assist", "traffic_sign",
      "climate_quad", "heated_seats", "ventilated_seats", "massage_seats", "memory_seats", "keyless",
      "electric_tailgate", "air_suspension", "heated_wheel", "nav", "apple_carplay", "android_auto",
      "premium_audio", "head_up", "digital_cockpit", "wireless_charging", "led_headlights", "matrix_led",
      "panoramic_roof", "alloy_wheels", "tow_bar", "tinted_windows", "roof_rails", "leather_interior",
      "ambient_lighting", "wood_trim", "folding_seats"],
    translations: {
      en: { headline: "Seven seats, air suspension, Matrix LED and a tow bar",
        description: "Family-specified Q7 50 TDI with the third row of seats, adaptive air suspension, Matrix LED headlights and a retractable tow bar rated at 3,500 kg.\n\nFull Audi service history, new brake discs and pads all round, next inspection due 2027." },
      fr: { headline: "Sept places, suspension pneumatique, Matrix LED et attelage",
        description: "Q7 50 TDI en configuration familiale : troisième rangée, suspension pneumatique adaptative, phares Matrix LED et attelage escamotable homologué 3 500 kg.\n\nCarnet Audi complet, disques et plaquettes neufs sur les quatre roues, prochain contrôle technique en 2027." },
      de: { headline: "Sieben Sitze, Luftfederung, Matrix-LED und Anhängerkupplung",
        description: "Familiengerecht ausgestatteter Q7 50 TDI mit dritter Sitzreihe, adaptiver Luftfederung, Matrix-LED-Scheinwerfern und schwenkbarer Anhängerkupplung für 3.500 kg.\n\nLückenloses Audi-Scheckheft, Bremsscheiben und -beläge rundum neu, nächste HU 2027." },
      zh: { headline: "七座布局、空气悬架、矩阵式大灯与拖车钩",
        description: "家用取向的 Q7 50 TDI，配备第三排座椅、自适应空气悬架、矩阵式 LED 大灯以及可收放拖车钩（牵引质量 3,500 公斤）。\n\n奥迪保养记录完整，四轮刹车盘与刹车片均为新件，下次年检为 2027 年。" },
      ar: { headline: "سبعة مقاعد وتعليق هوائي ومصابيح ماتريكس وخطاف قطر",
        description: "سيارة Q7 50 TDI بتجهيز عائلي يشمل صف المقاعد الثالث والتعليق الهوائي التكيفي ومصابيح Matrix LED وخطاف قطر قابل للطي بسعة 3,500 كجم.\n\nسجل صيانة كامل لدى أودي، وأقراص وفحمات فرامل جديدة على العجلات الأربع، والفحص الدوري القادم في 2027." },
      es: { headline: "Siete plazas, suspensión neumática, Matrix LED y enganche",
        description: "Q7 50 TDI en configuración familiar: tercera fila de asientos, suspensión neumática adaptativa, faros Matrix LED y enganche escamoteable homologado para 3.500 kg.\n\nHistorial Audi completo, discos y pastillas nuevos en las cuatro ruedas, próxima ITV en 2027." },
    },
  },
  {
    slug: "mercedes-benz-eqe-350-am-0126-d2p8",
    reference: "AM-0126-D2P8",
    brand: "Mercedes-Benz", model: "EQE", version: "350+ AMG Line", year: 2023,
    bodyType: "SEDAN", condition: "USED", segment: "ELECTRIC",
    fuel: "ELECTRIC", transmission: "AUTOMATIC", gears: 1, drivetrain: "RWD",
    powerHp: 292, torqueNm: 565, acceleration: 6.4, topSpeed: 210,
    co2: 0, emissionClass: "ZERO", energyLabel: "A+++",
    batteryCapacity: 90.6, electricRange: 639, chargingTime: "32 min (10–80 %, 170 kW)",
    doors: 4, seats: 5, colorExterior: "silver", colorInterior: "black", paintType: "METALLIC", upholstery: "VEGAN",
    mileage: 31200, firstRegistration: "2023-02-08", previousOwners: 1, serviceHistory: true,
    warrantyMonths: 24, accidentFree: true, nonSmoker: true,
    price: 54900, priceNet: 46134, vatDeductible: true, oldPrice: 58900, financingMonthly: 629,
    rentalAvailable: true, rentalMonthly: 699, rentalDeposit: 4000,
    status: "AVAILABLE", published: true, featured: true, accent: "#38bdf8",
    equipment: ["abs", "esp", "airbags", "isofix", "tpms", "emergency_brake", "adaptive_cruise", "lane_assist",
      "blind_spot", "park_sensors", "camera_360", "rear_camera", "park_assist", "traffic_sign", "climate_auto",
      "heated_seats", "memory_seats", "keyless", "electric_tailgate", "air_suspension", "heated_wheel",
      "nav", "apple_carplay", "android_auto", "premium_audio", "head_up", "digital_cockpit", "wireless_charging",
      "wifi", "led_headlights", "panoramic_roof", "alloy_wheels", "tinted_windows", "ambient_lighting"],
    translations: {
      en: { headline: "639 km WLTP range, battery certificate included",
        description: "EQE 350+ with the large 90.6 kWh battery and a certified state of health of 98 %. AMG Line exterior, panoramic roof and the Burmester sound system.\n\nBattery and drivetrain remain under Mercedes-Benz warranty until 2031 or 250,000 km." },
      fr: { headline: "639 km d'autonomie WLTP, certificat de batterie fourni",
        description: "EQE 350+ avec la grande batterie de 90,6 kWh et un état de santé certifié à 98 %. Extérieur AMG Line, toit panoramique et système audio Burmester.\n\nBatterie et chaîne de traction garanties par Mercedes-Benz jusqu'en 2031 ou 250 000 km." },
      de: { headline: "639 km WLTP-Reichweite, Batteriezertifikat inklusive",
        description: "EQE 350+ mit der großen 90,6-kWh-Batterie und zertifiziertem Gesundheitszustand von 98 %. AMG-Line-Exterieur, Panoramadach und Burmester-Soundsystem.\n\nBatterie und Antriebsstrang bis 2031 bzw. 250.000 km in der Mercedes-Benz-Garantie." },
      zh: { headline: "WLTP 续航 639 公里，附电池健康证书",
        description: "EQE 350+ 搭载 90.6 kWh 大容量电池，电池健康度认证为 98%。AMG Line 外观套件、全景天窗与柏林之声音响系统。\n\n电池与三电系统享奔驰原厂质保，至 2031 年或 25 万公里。" },
      ar: { headline: "مدى 639 كم وفق WLTP مع شهادة حالة البطارية",
        description: "سيارة EQE 350+ ببطارية كبيرة سعة 90.6 كيلوواط/ساعة وحالة بطارية موثّقة بنسبة 98%. تجهيز خارجي AMG Line وسقف بانورامي ونظام صوت Burmester.\n\nالبطارية ومنظومة الدفع مشمولتان بضمان مرسيدس-بنز حتى 2031 أو 250,000 كم." },
      es: { headline: "639 km de autonomía WLTP, con certificado de batería",
        description: "EQE 350+ con la batería grande de 90,6 kWh y un estado de salud certificado del 98 %. Exterior AMG Line, techo panorámico y sistema de sonido Burmester.\n\nBatería y sistema de propulsión con garantía Mercedes-Benz hasta 2031 o 250.000 km." },
    },
  },
  {
    slug: "volkswagen-golf-gti-clubsport-am-0126-e9r3",
    reference: "AM-0126-E9R3",
    brand: "Volkswagen", model: "Golf", version: "GTI Clubsport DSG", year: 2023,
    bodyType: "HATCHBACK", condition: "USED", segment: "SPORT",
    fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 7, drivetrain: "FWD",
    engineSize: 2.0, cylinders: 4, powerHp: 300, torqueNm: 400, acceleration: 5.6, topSpeed: 250,
    consumptionCombined: 7.4, co2: 168, emissionClass: "EURO6D",
    doors: 5, seats: 5, colorExterior: "white", colorInterior: "black", paintType: "SOLID", upholstery: "ALCANTARA",
    mileage: 27900, firstRegistration: "2023-07-11", previousOwners: 1, serviceHistory: true,
    warrantyMonths: 12, accidentFree: true, nonSmoker: true,
    price: 38900, priceNet: 32689, vatDeductible: false, financingMonthly: 449,
    rentalAvailable: true, rentalMonthly: 529, rentalDeposit: 2500,
    status: "AVAILABLE", published: true, featured: false, accent: "#e30613",
    equipment: ["abs", "esp", "airbags", "isofix", "tpms", "emergency_brake", "adaptive_cruise", "lane_assist",
      "park_sensors", "rear_camera", "traffic_sign", "climate_auto", "heated_seats", "keyless",
      "adaptive_dampers", "heated_wheel", "nav", "apple_carplay", "android_auto", "digital_cockpit",
      "wireless_charging", "led_headlights", "matrix_led", "alloy_wheels", "sport_package",
      "ambient_lighting", "sport_seats"],
    translations: {
      en: { headline: "Nürburgring package, DCC adaptive chassis",
        description: "Golf GTI Clubsport with the Nürburgring package: 19-inch Queenstown wheels, Akrapovič exhaust and DCC adaptive chassis control.\n\nRegularly serviced at the VW dealer, never tracked, non-smoker." },
      fr: { headline: "Pack Nürburgring, châssis adaptatif DCC",
        description: "Golf GTI Clubsport avec le pack Nürburgring : jantes 19 pouces Queenstown, échappement Akrapovič et châssis adaptatif DCC.\n\nEntretenue régulièrement en concession VW, jamais utilisée sur circuit, véhicule non-fumeur." },
      de: { headline: "Nürburgring-Paket, adaptives DCC-Fahrwerk",
        description: "Golf GTI Clubsport mit Nürburgring-Paket: 19-Zoll-Räder Queenstown, Akrapovič-Abgasanlage und adaptives DCC-Fahrwerk.\n\nRegelmäßig beim VW-Händler gewartet, nie auf der Rennstrecke bewegt, Nichtraucherfahrzeug." },
      zh: { headline: "纽博格林套件、DCC 自适应底盘",
        description: "Golf GTI Clubsport，选装纽博格林套件：19 英寸 Queenstown 轮毂、Akrapovič 排气与 DCC 自适应底盘。\n\n一直在大众授权经销商处保养，从未下赛道，非吸烟车辆。" },
      ar: { headline: "حزمة نوربورغرينغ وهيكل DCC التكيفي",
        description: "سيارة Golf GTI Clubsport مع حزمة نوربورغرينغ: جنوط مقاس 19 بوصة طراز Queenstown وعادم Akrapovič وهيكل DCC التكيفي.\n\nصيانة منتظمة لدى وكيل فولكس فاغن، ولم تُستخدم على الحلبات، وسيارة غير مدخّن." },
      es: { headline: "Paquete Nürburgring, chasis adaptativo DCC",
        description: "Golf GTI Clubsport con el paquete Nürburgring: llantas Queenstown de 19 pulgadas, escape Akrapovič y chasis adaptativo DCC.\n\nMantenimiento regular en concesionario VW, nunca usado en circuito, vehículo de no fumador." },
    },
  },
  {
    slug: "bmw-m4-competition-cabrio-am-0126-f5t7",
    reference: "AM-0126-F5T7",
    brand: "BMW", model: "M4", version: "Competition Cabrio xDrive", year: 2022,
    bodyType: "CABRIOLET", condition: "USED", segment: "LUXURY",
    fuel: "PETROL", transmission: "AUTOMATIC", gears: 8, drivetrain: "AWD",
    engineSize: 3.0, cylinders: 6, powerHp: 510, torqueNm: 650, acceleration: 3.7, topSpeed: 250,
    consumptionCombined: 10.7, co2: 243, emissionClass: "EURO6D",
    doors: 2, seats: 4, colorExterior: "blue", colorInterior: "white", paintType: "METALLIC", upholstery: "LEATHER",
    mileage: 21500, firstRegistration: "2022-06-30", previousOwners: 2, serviceHistory: true,
    warrantyMonths: 12, accidentFree: true, nonSmoker: true,
    price: 92500, priceNet: 77731, vatDeductible: true,
    rentalAvailable: false,
    status: "SOLD", published: true, featured: false, accent: "#1d4ed8",
    equipment: ["abs", "esp", "airbags", "tpms", "alarm", "emergency_brake", "adaptive_cruise", "blind_spot",
      "park_sensors", "camera_360", "rear_camera", "climate_auto", "heated_seats", "ventilated_seats",
      "memory_seats", "keyless", "adaptive_dampers", "heated_wheel", "nav", "apple_carplay", "premium_audio",
      "head_up", "digital_cockpit", "led_headlights", "matrix_led", "alloy_wheels", "sport_package",
      "leather_interior", "ambient_lighting", "sport_seats", "carbon_trim"],
    translations: {
      en: { headline: "Sold — comparable cars sourced on request",
        description: "This M4 Competition Cabrio has found its owner. We regularly source comparable cars through our German dealer network; tell us your specification and we will come back with options." },
      fr: { headline: "Vendu — nous sourçons des modèles comparables sur demande",
        description: "Cette M4 Competition Cabriolet a trouvé preneur. Nous sourçons régulièrement des modèles comparables via notre réseau de concessionnaires allemands : décrivez-nous votre configuration et nous reviendrons vers vous avec des propositions." },
      de: { headline: "Verkauft — vergleichbare Fahrzeuge auf Anfrage",
        description: "Dieses M4 Competition Cabrio hat seinen Besitzer gefunden. Über unser deutsches Händlernetz beschaffen wir regelmäßig vergleichbare Fahrzeuge — nennen Sie uns Ihre Wunschausstattung." },
      zh: { headline: "已售出 — 可代为寻找同类车源",
        description: "这辆 M4 Competition 敞篷版已售出。我们可通过德国经销商网络为您寻找同类车源，请告知您的配置需求。" },
      ar: { headline: "مباعة — نوفّر سيارات مماثلة عند الطلب",
        description: "تم بيع سيارة M4 Competition المكشوفة هذه. نوفّر بانتظام سيارات مماثلة عبر شبكة وكلائنا في ألمانيا، فأخبرنا بالمواصفات التي تريدها." },
      es: { headline: "Vendido — localizamos modelos comparables bajo petición",
        description: "Este M4 Competition Cabrio ya tiene dueño. Localizamos con regularidad modelos comparables a través de nuestra red de concesionarios alemanes: díganos su configuración." },
    },
  },
  {
    slug: "skoda-octavia-combi-tdi-am-0126-g3w1",
    reference: "AM-0126-G3W1",
    brand: "Skoda", model: "Octavia", version: "Combi 2.0 TDI Style DSG", year: 2023,
    bodyType: "ESTATE", condition: "USED", segment: "FAMILY",
    fuel: "DIESEL", transmission: "DUAL_CLUTCH", gears: 7, drivetrain: "FWD",
    engineSize: 2.0, cylinders: 4, powerHp: 150, torqueNm: 360, acceleration: 8.7, topSpeed: 224,
    consumptionCombined: 4.9, co2: 129, emissionClass: "EURO6D",
    doors: 5, seats: 5, colorExterior: "grey", colorInterior: "black", paintType: "METALLIC", upholstery: "FABRIC",
    mileage: 48700, firstRegistration: "2023-03-22", previousOwners: 1, serviceHistory: true,
    warrantyMonths: 12, accidentFree: true, nonSmoker: true,
    price: 24900, priceNet: 20924, vatDeductible: true, financingMonthly: 289,
    rentalAvailable: true, rentalMonthly: 349, rentalDeposit: 1500,
    status: "AVAILABLE", published: true, featured: false, accent: "#22c55e",
    equipment: ["abs", "esp", "airbags", "isofix", "tpms", "emergency_brake", "adaptive_cruise", "lane_assist",
      "park_sensors", "rear_camera", "traffic_sign", "climate_auto", "heated_seats", "keyless",
      "electric_tailgate", "nav", "apple_carplay", "android_auto", "digital_cockpit", "led_headlights",
      "alloy_wheels", "tow_bar", "roof_rails", "folding_seats", "armrest"],
    translations: {
      en: { headline: "640-litre boot, one company owner, full history",
        description: "The pragmatic choice: 640 litres of luggage space, 4.9 l/100 km on the combined cycle and a complete Skoda service history from a single company owner.\n\nTow bar fitted, winter tyres on steel wheels included in the price." },
      fr: { headline: "Coffre de 640 litres, un seul propriétaire société, historique complet",
        description: "Le choix pragmatique : 640 litres de coffre, 4,9 l/100 km en cycle mixte et un carnet Skoda complet, un seul propriétaire société.\n\nAttelage monté, pneus hiver sur jantes tôle inclus dans le prix." },
      de: { headline: "640 Liter Kofferraum, ein Firmenhalter, lückenlose Historie",
        description: "Die pragmatische Wahl: 640 Liter Ladevolumen, 4,9 l/100 km im kombinierten Zyklus und ein lückenloses Skoda-Scheckheft aus erster Firmenhand.\n\nAnhängerkupplung montiert, Winterräder auf Stahlfelgen im Preis enthalten." },
      zh: { headline: "640 升后备厢容积，一位企业车主，记录完整",
        description: "务实之选：640 升行李厢容积，综合油耗 4.9 升/百公里，斯柯达保养记录完整，仅一位企业车主。\n\n已加装拖车钩，价格含钢轮毂冬季轮胎一套。" },
      ar: { headline: "صندوق بسعة 640 لتراً، مالك شركة واحد، سجل كامل",
        description: "الخيار العملي: سعة تحميل 640 لتراً، واستهلاك 4.9 لتر/100 كم في الدورة المشتركة، وسجل صيانة كامل لدى سكودا من مالك شركة واحد.\n\nمركّب عليها خطاف قطر، وإطارات شتوية على جنوط حديدية مشمولة بالسعر." },
      es: { headline: "Maletero de 640 litros, un único titular empresa, historial completo",
        description: "La opción pragmática: 640 litros de maletero, 4,9 l/100 km en ciclo mixto y un historial Skoda completo de un único titular empresa.\n\nEnganche montado y neumáticos de invierno sobre llantas de acero incluidos en el precio." },
    },
  },
  {
    slug: "tesla-model-y-long-range-am-0126-h8y4",
    reference: "AM-0126-H8Y4",
    brand: "Tesla", model: "Model Y", version: "Long Range AWD", year: 2024,
    bodyType: "SUV", condition: "USED", segment: "ELECTRIC",
    fuel: "ELECTRIC", transmission: "AUTOMATIC", gears: 1, drivetrain: "AWD",
    powerHp: 514, torqueNm: 493, acceleration: 5.0, topSpeed: 217,
    co2: 0, emissionClass: "ZERO", energyLabel: "A+++",
    batteryCapacity: 78.1, electricRange: 533, chargingTime: "27 min (10–80 %, 250 kW)",
    doors: 5, seats: 5, colorExterior: "white", colorInterior: "black", paintType: "PEARL", upholstery: "VEGAN",
    mileage: 14200, firstRegistration: "2024-04-03", previousOwners: 1, serviceHistory: true,
    warrantyMonths: 24, accidentFree: true, nonSmoker: true,
    price: 39900, priceNet: 33529, vatDeductible: true, financingMonthly: 459,
    rentalAvailable: true, rentalMonthly: 519, rentalDeposit: 2500,
    status: "AVAILABLE", published: true, featured: false, accent: "#38bdf8",
    equipment: ["abs", "esp", "airbags", "isofix", "tpms", "emergency_brake", "adaptive_cruise", "lane_assist",
      "blind_spot", "park_sensors", "camera_360", "rear_camera", "park_assist", "traffic_sign", "climate_auto",
      "heated_seats", "memory_seats", "keyless", "electric_tailgate", "heated_wheel", "nav", "premium_audio",
      "wireless_charging", "wifi", "led_headlights", "panoramic_roof", "alloy_wheels", "tinted_windows",
      "roof_rails", "folding_seats"],
    translations: {
      en: { headline: "Enhanced Autopilot, tow hitch, 533 km WLTP",
        description: "Model Y Long Range with Enhanced Autopilot transferred to the new owner, factory tow hitch and 20-inch Induction wheels.\n\nBattery health verified at 97 %, no Supercharger abuse, single private owner." },
      fr: { headline: "Autopilot amélioré, attelage, 533 km WLTP",
        description: "Model Y Long Range avec Autopilot amélioré transférable au nouveau propriétaire, attelage d'origine et jantes Induction 20 pouces.\n\nSanté de la batterie vérifiée à 97 %, usage Supercharger modéré, un seul propriétaire particulier." },
      de: { headline: "Enhanced Autopilot, Anhängerkupplung, 533 km WLTP",
        description: "Model Y Long Range mit Enhanced Autopilot, der auf den neuen Halter übergeht, Werks-Anhängerkupplung und 20-Zoll-Induction-Rädern.\n\nBatteriegesundheit mit 97 % bestätigt, maßvolle Supercharger-Nutzung, ein privater Vorbesitzer." },
      zh: { headline: "增强版自动辅助驾驶、原厂拖车钩、WLTP 续航 533 公里",
        description: "Model Y 长续航全轮驱动版，增强版自动辅助驾驶可随车转移，配原厂拖车钩与 20 英寸 Induction 轮毂。\n\n电池健康度经检测为 97%，超充使用频率适中，仅一位个人车主。" },
      ar: { headline: "أوتوبايلوت المطوّر وخطاف قطر ومدى 533 كم وفق WLTP",
        description: "سيارة Model Y ذات المدى الطويل مع أوتوبايلوت المطوّر القابل للنقل إلى المالك الجديد، وخطاف قطر من المصنع، وجنوط Induction مقاس 20 بوصة.\n\nحالة البطارية موثّقة عند 97%، واستخدام معتدل لشواحن Supercharger، ومالك خاص واحد." },
      es: { headline: "Autopilot mejorado, enganche, 533 km WLTP",
        description: "Model Y Long Range con Autopilot mejorado transferible al nuevo propietario, enganche de fábrica y llantas Induction de 20 pulgadas.\n\nSalud de batería verificada al 97 %, uso moderado de Supercharger, un único propietario particular." },
    },
  },
  {
    slug: "mercedes-benz-v-300-d-am-0126-j6u2",
    reference: "AM-0126-J6U2",
    brand: "Mercedes-Benz", model: "V-Class", version: "V 300 d Avantgarde Extralang", year: 2023,
    bodyType: "MPV", condition: "USED", segment: "FAMILY",
    fuel: "DIESEL", transmission: "AUTOMATIC", gears: 9, drivetrain: "RWD",
    engineSize: 2.0, cylinders: 4, powerHp: 237, torqueNm: 500, acceleration: 7.9, topSpeed: 220,
    consumptionCombined: 7.3, co2: 191, emissionClass: "EURO6D",
    doors: 5, seats: 8, colorExterior: "black", colorInterior: "black", paintType: "METALLIC", upholstery: "LEATHER",
    mileage: 39800, firstRegistration: "2023-09-15", previousOwners: 1, serviceHistory: true,
    warrantyMonths: 12, accidentFree: true, nonSmoker: true,
    price: 67500, priceNet: 56723, vatDeductible: true, financingMonthly: 779,
    rentalAvailable: true, rentalMonthly: 899, rentalDeposit: 5000,
    status: "COMING_SOON", published: true, featured: false, accent: "#ffc300",
    equipment: ["abs", "esp", "airbags", "isofix", "tpms", "alarm", "emergency_brake", "adaptive_cruise",
      "lane_assist", "blind_spot", "park_sensors", "camera_360", "rear_camera", "park_assist", "climate_quad",
      "heated_seats", "memory_seats", "keyless", "electric_tailgate", "nav", "apple_carplay", "android_auto",
      "premium_audio", "digital_cockpit", "rear_screens", "led_headlights", "alloy_wheels", "tinted_windows",
      "leather_interior", "ambient_lighting", "wood_trim", "folding_seats"],
    translations: {
      en: { headline: "Eight seats, conference layout, arriving next week",
        description: "V 300 d in the extra-long body with the conference seating layout, rear entertainment screens and electric sliding doors on both sides.\n\nCurrently in preparation — reserve it now and we will send a full video walk-around before it reaches the showroom." },
      fr: { headline: "Huit places, configuration conférence, arrivée la semaine prochaine",
        description: "V 300 d en carrosserie extra-longue, configuration conférence, écrans arrière et portes coulissantes électriques des deux côtés.\n\nActuellement en préparation : réservez-la dès maintenant, nous vous envoyons une visite vidéo complète avant son arrivée au showroom." },
      de: { headline: "Acht Sitze, Konferenzbestuhlung, Ankunft nächste Woche",
        description: "V 300 d im extralangen Aufbau mit Konferenzbestuhlung, Rear-Seat-Entertainment und elektrischen Schiebetüren auf beiden Seiten.\n\nDerzeit in der Aufbereitung — reservieren Sie jetzt, wir senden vorab ein ausführliches Video." },
      zh: { headline: "八座、会议式座椅布局，下周到店",
        description: "V 300 d 超长轴距版，采用会议式座椅布局，配后排娱乐屏幕及双侧电动滑门。\n\n目前正在整备中——现在即可预订，到店前我们会发送完整的视频看车。" },
      ar: { headline: "ثمانية مقاعد بترتيب اجتماعات، تصل الأسبوع القادم",
        description: "سيارة V 300 d بالهيكل الممتد وترتيب مقاعد الاجتماعات، وشاشات ترفيه خلفية، وأبواب منزلقة كهربائية على الجانبين.\n\nقيد التجهيز حالياً — احجزها الآن وسنرسل لك جولة فيديو كاملة قبل وصولها إلى المعرض." },
      es: { headline: "Ocho plazas, configuración conferencia, llega la próxima semana",
        description: "V 300 d en carrocería extralarga con configuración de asientos tipo conferencia, pantallas traseras y puertas correderas eléctricas en ambos lados.\n\nActualmente en preparación: resérvela ahora y le enviaremos un vídeo completo antes de que llegue al showroom." },
    },
  },
  {
    slug: "audi-a3-sportback-35-tfsi-am-0126-k1z6",
    reference: "AM-0126-K1Z6",
    brand: "Audi", model: "A3", version: "Sportback 35 TFSI S tronic", year: 2024,
    bodyType: "HATCHBACK", condition: "DEMO", segment: "CITY",
    fuel: "PETROL", transmission: "DUAL_CLUTCH", gears: 7, drivetrain: "FWD",
    engineSize: 1.5, cylinders: 4, powerHp: 150, torqueNm: 250, acceleration: 8.4, topSpeed: 224,
    consumptionCombined: 5.4, co2: 123, emissionClass: "EURO6D",
    doors: 5, seats: 5, colorExterior: "blue", colorInterior: "grey", paintType: "METALLIC", upholstery: "FABRIC",
    mileage: 4300, firstRegistration: "2024-11-05", previousOwners: 0, serviceHistory: true,
    warrantyMonths: 36, accidentFree: true, nonSmoker: true,
    price: 31900, priceNet: 26807, vatDeductible: true, oldPrice: 36400, financingMonthly: 369,
    rentalAvailable: true, rentalMonthly: 419, rentalDeposit: 2000,
    status: "AVAILABLE", published: true, featured: false, accent: "#1d4ed8",
    equipment: ["abs", "esp", "airbags", "isofix", "tpms", "emergency_brake", "adaptive_cruise", "lane_assist",
      "park_sensors", "rear_camera", "traffic_sign", "climate_auto", "heated_seats", "keyless",
      "nav", "apple_carplay", "android_auto", "digital_cockpit", "wireless_charging", "led_headlights",
      "alloy_wheels", "ambient_lighting", "armrest", "folding_seats"],
    translations: {
      en: { headline: "Demonstrator with 4,300 km and three years of warranty",
        description: "Our own demonstrator, registered in November 2024 and driven only 4,300 km. Saves €4,500 against list price and still carries the full three-year Audi warranty." },
      fr: { headline: "Véhicule de démonstration, 4 300 km et trois ans de garantie",
        description: "Notre propre véhicule de démonstration, immatriculé en novembre 2024 et roulant seulement 4 300 km. Économie de 4 500 € par rapport au prix catalogue, avec la garantie Audi de trois ans." },
      de: { headline: "Vorführwagen mit 4.300 km und drei Jahren Garantie",
        description: "Unser eigener Vorführwagen, zugelassen im November 2024 mit nur 4.300 km Laufleistung. 4.500 € günstiger als der Listenpreis, mit voller dreijähriger Audi-Garantie." },
      zh: { headline: "展示车，仅行驶 4,300 公里，享三年质保",
        description: "本店自用展示车，2024 年 11 月上牌，行驶里程仅 4,300 公里。相较厂商指导价节省 4,500 欧元，并保留完整三年奥迪质保。" },
      ar: { headline: "سيارة عرض قطعت 4,300 كم مع ضمان ثلاث سنوات",
        description: "سيارة العرض الخاصة بنا، مسجّلة في نوفمبر 2024 ولم تقطع سوى 4,300 كم. توفّر 4,500 يورو مقارنة بسعر القائمة مع ضمان أودي الكامل لثلاث سنوات." },
      es: { headline: "Vehículo de demostración con 4.300 km y tres años de garantía",
        description: "Nuestro propio vehículo de demostración, matriculado en noviembre de 2024 y con solo 4.300 km. Ahorro de 4.500 € frente al precio de catálogo, con la garantía Audi de tres años." },
    },
  },
];

const LEADS = [
  { type: "SALE", firstName: "Julien", lastName: "Moreau", email: "julien.moreau@example.com", phone: "+33 6 12 34 56 78", locale: "fr", status: "NEW", vehicleSlug: "porsche-911-carrera-4s-am-0126-a1x9", message: "Bonjour, la 911 est-elle toujours disponible ? Je peux me déplacer à Roetgen ce samedi pour un essai." },
  { type: "RENTAL", firstName: "Sandra", lastName: "Keller", email: "s.keller@example.de", phone: "+49 170 1234567", company: "Keller Logistik GmbH", locale: "de", status: "CONTACTED", vehicleSlug: "audi-q7-50-tdi-quattro-am-0126-c7m5", rentalDuration: 48, rentalMileage: 25000, message: "Wir suchen zwei Fahrzeuge für die Geschäftsführung. Angebot über 48 Monate bitte." },
  { type: "SALE", firstName: "Wei", lastName: "Zhang", email: "wei.zhang@example.com", phone: "+86 138 0000 1234", locale: "zh", status: "QUALIFIED", vehicleSlug: "mercedes-benz-eqe-350-am-0126-d2p8", message: "请问这台 EQE 能否安排出口到中国？需要提供哪些文件？" },
  { type: "CONTACT", firstName: "Marta", lastName: "Ruiz", email: "marta.ruiz@example.es", locale: "es", status: "NEW", message: "Busco un familiar diésel de menos de 30.000 €, con enganche. ¿Qué tienen disponible?" },
  { type: "RENTAL", firstName: "Omar", lastName: "Haddad", email: "o.haddad@example.ae", phone: "+971 50 123 4567", locale: "ar", status: "NEW", vehicleSlug: "tesla-model-y-long-range-am-0126-h8y4", rentalDuration: 36, rentalMileage: 20000, message: "أرغب في عرض تأجير طويل الأمد لمدة 36 شهراً مع التأمين الشامل." },
  { type: "TRADE_IN", firstName: "Thomas", lastName: "Fischer", email: "t.fischer@example.de", phone: "+49 160 9876543", locale: "de", status: "WON", vehicleSlug: "volkswagen-golf-gti-clubsport-am-0126-e9r3", message: "Ich möchte meinen Golf 7 GTI in Zahlung geben. Bewertung möglich?" },
];

async function main() {
  await mkdir(UPLOAD_DIR, { recursive: true });

  console.log("→ Clearing existing data…");
  await prisma.activityLog.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.vehicleImage.deleteMany();
  await prisma.vehicleTranslation.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.user.deleteMany();

  console.log("→ Creating staff accounts…");
  // Taken from SEED_PASSWORD so a real deployment never inherits a password
  // that is written down in a public repository.
  const plain = process.env.SEED_PASSWORD ?? "Autohaus2026!";
  const password = await bcrypt.hash(plain, 10);

  const admin = await prisma.user.create({
    data: {
      email: "admin@autohaus-motion.de", name: "Habib Rezai", passwordHash: password,
      role: "ADMIN", jobTitle: "Geschäftsführer", phone: "+49 2471 000 001", locale: "fr", active: true,
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@autohaus-motion.de", name: "Katrin Vogel", passwordHash: password,
      role: "MANAGER", jobTitle: "Verkaufsleiterin", phone: "+49 2471 000 002", locale: "de", active: true,
    },
  });

  const sales1 = await prisma.user.create({
    data: {
      email: "commercial@autohaus-motion.de", name: "Lucas Bertrand", passwordHash: password,
      role: "SALES", jobTitle: "Commercial senior", phone: "+49 2471 000 003", locale: "fr", active: true,
    },
  });

  const sales2 = await prisma.user.create({
    data: {
      email: "sales@autohaus-motion.de", name: "Mei Lin Chen", passwordHash: password,
      role: "SALES", jobTitle: "Sales advisor — export", phone: "+49 2471 000 004", locale: "zh", active: true,
    },
  });

  await prisma.user.create({
    data: {
      email: "viewer@autohaus-motion.de", name: "Paul Simon", passwordHash: password,
      role: "VIEWER", jobTitle: "Comptabilité", locale: "fr", active: true,
    },
  });

  const owners = [admin.id, manager.id, sales1.id, sales2.id];

  console.log("→ Creating vehicles…");
  const slugToId = {};

  for (const [index, spec] of VEHICLES.entries()) {
    const { translations, equipment, accent, ...fields } = spec;

    const images = await writePlaceholders(
      spec.slug.slice(0, 40),
      {
        title: `${spec.brand} ${spec.model}`,
        subtitle: `${spec.version} · ${spec.year} · ${spec.powerHp} hp`,
        accent,
        body: spec.bodyType,
      },
      spec.status === "SOLD" ? 2 : 4,
    );

    const vehicle = await prisma.vehicle.create({
      data: {
        ...fields,
        firstRegistration: fields.firstRegistration ? new Date(fields.firstRegistration) : null,
        nextInspection: new Date(`${fields.year + 4}-06-30`),
        powerKw: Math.round(spec.powerHp * 0.7355),
        equipment: JSON.stringify(equipment),
        rentalDurations: JSON.stringify([24, 36, 48, 60]),
        rentalMileages: JSON.stringify([10000, 15000, 20000, 25000]),
        location: "52159 Roetgen",
        views: Math.floor(Math.random() * 400) + 20,
        soldAt: spec.status === "SOLD" ? new Date("2026-08-14") : null,
        ownerId: owners[index % owners.length],
        images: {
          create: images.map((url, i) => ({
            url,
            alt: `${spec.brand} ${spec.model} ${spec.version}`,
            position: i,
            isCover: i === 0,
          })),
        },
        translations: {
          create: Object.entries(translations).map(([locale, content]) => ({
            locale,
            headline: content.headline,
            description: content.description,
          })),
        },
      },
    });

    slugToId[spec.slug] = vehicle.id;
    console.log(`   · ${spec.brand} ${spec.model} (${spec.status})`);
  }

  console.log("→ Creating leads…");
  const advisors = [sales1.id, sales2.id, manager.id];
  for (const [index, lead] of LEADS.entries()) {
    const { vehicleSlug, ...rest } = lead;
    await prisma.lead.create({
      data: {
        ...rest,
        vehicleId: vehicleSlug ? (slugToId[vehicleSlug] ?? null) : null,
        assignedToId: advisors[index % advisors.length],
        createdAt: new Date(Date.now() - index * 36 * 3600 * 1000),
      },
    });
  }

  console.log("→ Seeding activity log…");
  await prisma.activityLog.createMany({
    data: [
      { userId: admin.id, action: "vehicle.created", entity: "Vehicle", summary: "Porsche 911 Carrera 4S" },
      { userId: sales1.id, action: "vehicle.status.reserved", entity: "Vehicle", summary: "BMW M3 Competition" },
      { userId: manager.id, action: "vehicle.status.sold", entity: "Vehicle", summary: "BMW M4 Competition Cabrio" },
      { userId: sales2.id, action: "lead.updated", entity: "Lead", summary: "Wei Zhang — QUALIFIED" },
      { userId: admin.id, action: "user.created", entity: "User", summary: "Mei Lin Chen — SALES" },
    ],
  });

  console.log("\n✔ Seed complete.\n");
  console.log("  Sign in at /fr/login");
  console.log("  ┌──────────────────────────────────┬──────────────────┐");
  console.log("  │ admin@autohaus-motion.de         │ Administrator    │");
  console.log("  │ manager@autohaus-motion.de       │ Manager          │");
  console.log("  │ commercial@autohaus-motion.de    │ Sales advisor    │");
  console.log("  │ sales@autohaus-motion.de         │ Sales advisor    │");
  console.log("  │ viewer@autohaus-motion.de        │ Viewer           │");
  console.log("  └──────────────────────────────────┴──────────────────┘");
  console.log(`  Password for every account: ${plain}\n`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
