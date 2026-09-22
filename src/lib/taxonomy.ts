// Vehicle taxonomy with labels in all 6 supported locales.
// Compact tuple format: [key, en, fr, de, zh, ar, es]

export const LOCALES = ["en", "fr", "de", "zh", "ar", "es"] as const;
export type Locale = (typeof LOCALES)[number];
export const RTL_LOCALES: Locale[] = ["ar"];

type Tuple = readonly [string, string, string, string, string, string, string];
export type LabelSet = Record<string, Record<Locale, string>>;

function build(rows: readonly Tuple[]): LabelSet {
  const out: LabelSet = {};
  for (const [key, en, fr, de, zh, ar, es] of rows) {
    out[key] = { en, fr, de, zh, ar, es };
  }
  return out;
}

export function label(set: LabelSet, key: string | null | undefined, locale: Locale): string {
  if (!key) return "—";
  return set[key]?.[locale] ?? key;
}

export function optionsFor(set: LabelSet, locale: Locale) {
  return Object.keys(set).map((value) => ({ value, label: set[value][locale] }));
}

/* ─────────────────────────── Body type ─────────────────────────── */
export const BODY_TYPES = build([
  ["SEDAN", "Sedan", "Berline", "Limousine", "轿车", "سيدان", "Sedán"],
  ["SUV", "SUV", "SUV", "SUV", "运动型多用途车", "دفع رباعي", "SUV"],
  ["COUPE", "Coupé", "Coupé", "Coupé", "双门轿跑", "كوبيه", "Cupé"],
  ["CABRIOLET", "Convertible", "Cabriolet", "Cabrio", "敞篷车", "مكشوفة", "Descapotable"],
  ["ESTATE", "Estate", "Break", "Kombi", "旅行车", "ستيشن", "Familiar"],
  ["HATCHBACK", "Hatchback", "Citadine", "Kleinwagen", "掀背车", "هاتشباك", "Utilitario"],
  ["MPV", "MPV", "Monospace", "Van", "多用途车", "ميني فان", "Monovolumen"],
  ["PICKUP", "Pickup", "Pick-up", "Pick-up", "皮卡", "بيك أب", "Pickup"],
  ["VAN", "Van", "Utilitaire", "Transporter", "厢式货车", "فان", "Furgoneta"],
]);

/* ─────────────────────────── Condition ─────────────────────────── */
export const CONDITIONS = build([
  ["NEW", "New", "Neuf", "Neuwagen", "全新", "جديدة", "Nuevo"],
  ["USED", "Used", "Occasion", "Gebrauchtwagen", "二手", "مستعملة", "Usado"],
  ["DEMO", "Demonstrator", "Véhicule de démonstration", "Vorführwagen", "展示车", "سيارة عرض", "Demostración"],
  ["CLASSIC", "Classic", "Collection", "Oldtimer", "经典车", "كلاسيكية", "Clásico"],
]);

/* ─────────────────────────── Segment ───────────────────────────── */
export const SEGMENTS = build([
  ["SPORT", "Sport", "Sport", "Sport", "运动", "رياضية", "Deportivo"],
  ["LUXURY", "Luxury", "Luxe", "Luxus", "豪华", "فاخرة", "Lujo"],
  ["FAMILY", "Family", "Familiale", "Familie", "家用", "عائلية", "Familiar"],
  ["CITY", "City", "Citadine", "Stadt", "城市", "مدينة", "Ciudad"],
  ["ELECTRIC", "Electric", "Électrique", "Elektro", "电动", "كهربائية", "Eléctrico"],
  ["OFFROAD", "Off-road", "Tout-terrain", "Geländewagen", "越野", "طرق وعرة", "Todoterreno"],
  ["COLLECTOR", "Collector", "Collection", "Sammler", "收藏", "مقتنيات", "Coleccionista"],
]);

/* ─────────────────────────── Fuel ──────────────────────────────── */
export const FUELS = build([
  ["PETROL", "Petrol", "Essence", "Benzin", "汽油", "بنزين", "Gasolina"],
  ["DIESEL", "Diesel", "Diesel", "Diesel", "柴油", "ديزل", "Diésel"],
  ["HYBRID", "Hybrid", "Hybride", "Hybrid", "混合动力", "هجينة", "Híbrido"],
  ["PLUGIN_HYBRID", "Plug-in hybrid", "Hybride rechargeable", "Plug-in-Hybrid", "插电混动", "هجينة قابلة للشحن", "Híbrido enchufable"],
  ["ELECTRIC", "Electric", "Électrique", "Elektro", "纯电动", "كهربائية", "Eléctrico"],
  ["LPG", "LPG", "GPL", "Autogas", "液化石油气", "غاز البترول", "GLP"],
  ["CNG", "CNG", "GNV", "Erdgas", "天然气", "غاز طبيعي", "GNC"],
]);

/* ─────────────────────── Transmission ──────────────────────────── */
export const TRANSMISSIONS = build([
  ["MANUAL", "Manual", "Manuelle", "Schaltgetriebe", "手动", "يدوي", "Manual"],
  ["AUTOMATIC", "Automatic", "Automatique", "Automatik", "自动", "أوتوماتيكي", "Automático"],
  ["DUAL_CLUTCH", "Dual clutch", "Double embrayage", "Doppelkupplung", "双离合", "قابض مزدوج", "Doble embrague"],
  ["CVT", "CVT", "CVT", "CVT", "无级变速", "ناقل متغير", "CVT"],
]);

/* ─────────────────────── Drivetrain ────────────────────────────── */
export const DRIVETRAINS = build([
  ["FWD", "Front-wheel drive", "Traction avant", "Frontantrieb", "前轮驱动", "دفع أمامي", "Tracción delantera"],
  ["RWD", "Rear-wheel drive", "Propulsion", "Heckantrieb", "后轮驱动", "دفع خلفي", "Tracción trasera"],
  ["AWD", "All-wheel drive", "Transmission intégrale", "Allradantrieb", "全轮驱动", "دفع رباعي", "Tracción total"],
  ["FOUR_WD", "4x4", "4x4", "4x4", "四驱", "٤×٤", "4x4"],
]);

/* ─────────────────────── Paint & upholstery ────────────────────── */
export const PAINT_TYPES = build([
  ["SOLID", "Solid", "Opaque", "Uni", "纯色", "سادة", "Sólido"],
  ["METALLIC", "Metallic", "Métallisée", "Metallic", "金属漆", "معدني", "Metalizado"],
  ["PEARL", "Pearl effect", "Nacrée", "Perleffekt", "珠光漆", "لؤلؤي", "Perlado"],
  ["MATTE", "Matte", "Mate", "Matt", "哑光", "مطفي", "Mate"],
]);

export const UPHOLSTERY = build([
  ["LEATHER", "Leather", "Cuir", "Leder", "真皮", "جلد", "Cuero"],
  ["ALCANTARA", "Alcantara", "Alcantara", "Alcantara", "翻毛皮", "ألكانتارا", "Alcántara"],
  ["FABRIC", "Fabric", "Tissu", "Stoff", "织物", "قماش", "Tela"],
  ["VEGAN", "Vegan leather", "Cuir végan", "Kunstleder", "仿皮", "جلد نباتي", "Cuero vegano"],
]);

export const EMISSION_CLASSES = build([
  ["EURO6", "Euro 6", "Euro 6", "Euro 6", "欧6", "يورو 6", "Euro 6"],
  ["EURO6D", "Euro 6d", "Euro 6d", "Euro 6d", "欧6d", "يورو 6d", "Euro 6d"],
  ["EURO5", "Euro 5", "Euro 5", "Euro 5", "欧5", "يورو 5", "Euro 5"],
  ["ZERO", "Zero emission", "Zéro émission", "Emissionsfrei", "零排放", "انبعاث صفري", "Cero emisiones"],
]);

/* ─────────────────────── Listing status ────────────────────────── */
export const VEHICLE_STATUS = build([
  ["AVAILABLE", "Available", "Disponible", "Verfügbar", "在售", "متاحة", "Disponible"],
  ["RESERVED", "Sale in progress", "En cours de vente", "Verkauf läuft", "洽谈中", "قيد البيع", "Venta en curso"],
  ["SOLD", "Sold", "Vendu", "Verkauft", "已售出", "مباعة", "Vendido"],
  ["COMING_SOON", "Coming soon", "Bientôt disponible", "Demnächst", "即将上市", "قريباً", "Próximamente"],
]);

/* ─────────────────────────── Roles ─────────────────────────────── */
export const ROLES = build([
  ["ADMIN", "Administrator", "Administrateur", "Administrator", "管理员", "مدير النظام", "Administrador"],
  ["MANAGER", "Manager", "Responsable", "Manager", "经理", "مدير", "Responsable"],
  ["SALES", "Sales advisor", "Commercial", "Verkaufsberater", "销售顾问", "مستشار مبيعات", "Comercial"],
  ["VIEWER", "Viewer", "Lecture seule", "Betrachter", "只读", "قارئ", "Solo lectura"],
]);

/* ─────────────────────────── Leads ─────────────────────────────── */
export const LEAD_TYPES = build([
  ["SALE", "Purchase enquiry", "Demande d'achat", "Kaufanfrage", "购车咨询", "طلب شراء", "Consulta de compra"],
  ["RENTAL", "Long-term rental", "Location longue durée", "Langzeitmiete", "长租咨询", "تأجير طويل الأمد", "Alquiler a largo plazo"],
  ["CONTACT", "General contact", "Contact général", "Allgemeine Anfrage", "一般咨询", "استفسار عام", "Contacto general"],
  ["TRADE_IN", "Trade-in", "Reprise", "Inzahlungnahme", "置换", "استبدال", "Entrega a cuenta"],
]);

export const LEAD_STATUS = build([
  ["NEW", "New", "Nouveau", "Neu", "新建", "جديد", "Nuevo"],
  ["CONTACTED", "Contacted", "Contacté", "Kontaktiert", "已联系", "تم التواصل", "Contactado"],
  ["QUALIFIED", "Qualified", "Qualifié", "Qualifiziert", "已确认", "مؤهل", "Cualificado"],
  ["WON", "Won", "Gagné", "Gewonnen", "成交", "مكتمل", "Ganado"],
  ["LOST", "Lost", "Perdu", "Verloren", "流失", "مفقود", "Perdido"],
]);

/* ─────────────────────── Equipment catalogue ───────────────────── */
export const EQUIPMENT_GROUPS = build([
  ["SAFETY", "Safety", "Sécurité", "Sicherheit", "安全", "السلامة", "Seguridad"],
  ["ASSISTANCE", "Driver assistance", "Aides à la conduite", "Assistenzsysteme", "驾驶辅助", "أنظمة المساعدة", "Asistencia"],
  ["COMFORT", "Comfort", "Confort", "Komfort", "舒适", "الراحة", "Confort"],
  ["MULTIMEDIA", "Multimedia", "Multimédia", "Multimedia", "多媒体", "الوسائط", "Multimedia"],
  ["EXTERIOR", "Exterior", "Extérieur", "Exterieur", "外观", "الخارج", "Exterior"],
  ["INTERIOR", "Interior", "Intérieur", "Interieur", "内饰", "الداخل", "Interior"],
]);

const EQUIPMENT_ROWS: readonly (readonly [string, string, string, string, string, string, string, string])[] = [
  // [key, group, en, fr, de, zh, ar, es]
  ["abs", "SAFETY", "ABS", "ABS", "ABS", "防抱死系统", "نظام ABS", "ABS"],
  ["esp", "SAFETY", "ESP stability control", "ESP contrôle de stabilité", "ESP", "车身稳定系统", "نظام الثبات ESP", "Control de estabilidad ESP"],
  ["airbags", "SAFETY", "Full airbag package", "Pack airbags complet", "Airbag-Paket", "全套安全气囊", "حزمة وسائد هوائية", "Pack completo de airbags"],
  ["isofix", "SAFETY", "Isofix anchors", "Fixations Isofix", "Isofix", "儿童座椅接口", "تثبيت Isofix", "Anclajes Isofix"],
  ["tpms", "SAFETY", "Tyre pressure monitoring", "Contrôle pression pneus", "Reifendruckkontrolle", "胎压监测", "مراقبة ضغط الإطارات", "Control de presión"],
  ["alarm", "SAFETY", "Alarm system", "Système d'alarme", "Alarmanlage", "防盗报警", "نظام إنذار", "Alarma"],
  ["emergency_brake", "SAFETY", "Autonomous emergency braking", "Freinage d'urgence autonome", "Notbremsassistent", "自动紧急制动", "فرملة طوارئ", "Frenada de emergencia"],

  ["adaptive_cruise", "ASSISTANCE", "Adaptive cruise control", "Régulateur adaptatif", "Adaptiver Tempomat", "自适应巡航", "مثبت سرعة تكيفي", "Control de crucero adaptativo"],
  ["lane_assist", "ASSISTANCE", "Lane keeping assist", "Maintien de voie", "Spurhalteassistent", "车道保持", "مساعد المسار", "Asistente de carril"],
  ["blind_spot", "ASSISTANCE", "Blind spot monitor", "Détection angle mort", "Totwinkelassistent", "盲点监测", "مراقبة النقطة العمياء", "Ángulo muerto"],
  ["park_sensors", "ASSISTANCE", "Parking sensors", "Radars de recul", "Einparkhilfe", "驻车雷达", "حساسات ركن", "Sensores de aparcamiento"],
  ["camera_360", "ASSISTANCE", "360° camera", "Caméra 360°", "360°-Kamera", "360度全景影像", "كاميرا 360", "Cámara 360°"],
  ["rear_camera", "ASSISTANCE", "Rear view camera", "Caméra de recul", "Rückfahrkamera", "倒车影像", "كاميرا خلفية", "Cámara trasera"],
  ["park_assist", "ASSISTANCE", "Automatic parking", "Stationnement automatique", "Parkassistent", "自动泊车", "ركن تلقائي", "Aparcamiento automático"],
  ["traffic_sign", "ASSISTANCE", "Traffic sign recognition", "Reconnaissance panneaux", "Verkehrszeichenerkennung", "交通标志识别", "قراءة الإشارات", "Reconocimiento de señales"],
  ["night_vision", "ASSISTANCE", "Night vision", "Vision nocturne", "Nachtsichtassistent", "夜视系统", "رؤية ليلية", "Visión nocturna"],

  ["climate_auto", "COMFORT", "Automatic climate control", "Climatisation automatique", "Klimaautomatik", "自动空调", "مكيف أوتوماتيكي", "Climatizador automático"],
  ["climate_quad", "COMFORT", "4-zone climate", "Climatisation 4 zones", "4-Zonen-Klima", "四区空调", "تكييف 4 مناطق", "Clima 4 zonas"],
  ["heated_seats", "COMFORT", "Heated seats", "Sièges chauffants", "Sitzheizung", "座椅加热", "مقاعد مدفأة", "Asientos calefactados"],
  ["ventilated_seats", "COMFORT", "Ventilated seats", "Sièges ventilés", "Sitzbelüftung", "座椅通风", "مقاعد مهواة", "Asientos ventilados"],
  ["massage_seats", "COMFORT", "Massage seats", "Sièges massants", "Massagesitze", "座椅按摩", "مقاعد مساج", "Asientos con masaje"],
  ["memory_seats", "COMFORT", "Memory seats", "Sièges à mémoire", "Sitzmemory", "座椅记忆", "ذاكرة المقاعد", "Asientos con memoria"],
  ["keyless", "COMFORT", "Keyless entry & go", "Accès et démarrage sans clé", "Keyless Go", "无钥匙进入启动", "دخول بدون مفتاح", "Acceso y arranque sin llave"],
  ["electric_tailgate", "COMFORT", "Electric tailgate", "Hayon électrique", "Elektrische Heckklappe", "电动尾门", "باب خلفي كهربائي", "Portón eléctrico"],
  ["air_suspension", "COMFORT", "Air suspension", "Suspension pneumatique", "Luftfederung", "空气悬架", "تعليق هوائي", "Suspensión neumática"],
  ["adaptive_dampers", "COMFORT", "Adaptive dampers", "Amortisseurs pilotés", "Adaptives Fahrwerk", "自适应减震", "مخمدات تكيفية", "Amortiguadores adaptativos"],
  ["heated_wheel", "COMFORT", "Heated steering wheel", "Volant chauffant", "Lenkradheizung", "方向盘加热", "مقود مدفأ", "Volante calefactado"],

  ["nav", "MULTIMEDIA", "Navigation system", "Système de navigation", "Navigationssystem", "导航系统", "نظام ملاحة", "Navegador"],
  ["apple_carplay", "MULTIMEDIA", "Apple CarPlay", "Apple CarPlay", "Apple CarPlay", "Apple CarPlay", "Apple CarPlay", "Apple CarPlay"],
  ["android_auto", "MULTIMEDIA", "Android Auto", "Android Auto", "Android Auto", "Android Auto", "Android Auto", "Android Auto"],
  ["premium_audio", "MULTIMEDIA", "Premium sound system", "Système audio premium", "Premium-Soundsystem", "高级音响", "نظام صوت فاخر", "Sonido premium"],
  ["head_up", "MULTIMEDIA", "Head-up display", "Affichage tête haute", "Head-up-Display", "抬头显示", "شاشة أمامية", "Head-up display"],
  ["digital_cockpit", "MULTIMEDIA", "Digital cockpit", "Combiné numérique", "Digitales Cockpit", "全液晶仪表", "لوحة رقمية", "Cuadro digital"],
  ["wireless_charging", "MULTIMEDIA", "Wireless charging", "Recharge sans fil", "Induktives Laden", "无线充电", "شحن لاسلكي", "Carga inalámbrica"],
  ["rear_screens", "MULTIMEDIA", "Rear entertainment", "Écrans arrière", "Rear-Seat-Entertainment", "后排娱乐", "شاشات خلفية", "Pantallas traseras"],
  ["wifi", "MULTIMEDIA", "Onboard Wi-Fi", "Wi-Fi embarqué", "WLAN-Hotspot", "车载Wi-Fi", "واي فاي", "Wi-Fi a bordo"],

  ["led_headlights", "EXTERIOR", "LED headlights", "Phares LED", "LED-Scheinwerfer", "LED大灯", "مصابيح LED", "Faros LED"],
  ["matrix_led", "EXTERIOR", "Matrix LED", "Matrix LED", "Matrix-LED", "矩阵式大灯", "مصابيح ماتريكس", "Matrix LED"],
  ["panoramic_roof", "EXTERIOR", "Panoramic roof", "Toit panoramique", "Panoramadach", "全景天窗", "سقف بانورامي", "Techo panorámico"],
  ["sunroof", "EXTERIOR", "Sunroof", "Toit ouvrant", "Schiebedach", "天窗", "فتحة سقف", "Techo solar"],
  ["alloy_wheels", "EXTERIOR", "Alloy wheels", "Jantes alliage", "Leichtmetallfelgen", "铝合金轮毂", "جنوط ألمنيوم", "Llantas de aleación"],
  ["tow_bar", "EXTERIOR", "Tow bar", "Attelage", "Anhängerkupplung", "拖车钩", "خطاف قطر", "Enganche de remolque"],
  ["tinted_windows", "EXTERIOR", "Privacy glass", "Vitres surteintées", "Privacy-Verglasung", "隐私玻璃", "زجاج معتم", "Cristales tintados"],
  ["sport_package", "EXTERIOR", "Sport package", "Pack sport", "Sportpaket", "运动套件", "حزمة رياضية", "Paquete deportivo"],
  ["roof_rails", "EXTERIOR", "Roof rails", "Barres de toit", "Dachreling", "行李架", "قضبان سقف", "Barras de techo"],

  ["leather_interior", "INTERIOR", "Full leather interior", "Intérieur cuir intégral", "Volllederausstattung", "全真皮内饰", "فرش جلد كامل", "Interior de cuero"],
  ["ambient_lighting", "INTERIOR", "Ambient lighting", "Éclairage d'ambiance", "Ambientebeleuchtung", "氛围灯", "إضاءة محيطية", "Iluminación ambiental"],
  ["sport_seats", "INTERIOR", "Sport seats", "Sièges sport", "Sportsitze", "运动座椅", "مقاعد رياضية", "Asientos deportivos"],
  ["carbon_trim", "INTERIOR", "Carbon fibre trim", "Inserts carbone", "Carbon-Interieur", "碳纤维饰板", "ألياف كربون", "Detalles de carbono"],
  ["wood_trim", "INTERIOR", "Wood trim", "Inserts bois", "Holzinterieur", "木纹饰板", "تطعيم خشبي", "Detalles de madera"],
  ["armrest", "INTERIOR", "Centre armrest", "Accoudoir central", "Mittelarmlehne", "中央扶手", "مسند ذراع", "Reposabrazos central"],
  ["folding_seats", "INTERIOR", "Folding rear seats", "Banquette rabattable", "Umklappbare Rücksitze", "后排座椅折叠", "مقاعد قابلة للطي", "Asientos abatibles"],
];

export const EQUIPMENT: Record<string, { group: string; labels: Record<Locale, string> }> = {};
for (const [key, group, en, fr, de, zh, ar, es] of EQUIPMENT_ROWS) {
  EQUIPMENT[key] = { group, labels: { en, fr, de, zh, ar, es } };
}

export function equipmentLabel(key: string, locale: Locale): string {
  return EQUIPMENT[key]?.labels[locale] ?? key;
}

export function equipmentByGroup(): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const key of Object.keys(EQUIPMENT)) {
    const g = EQUIPMENT[key].group;
    (groups[g] ||= []).push(key);
  }
  return groups;
}

export const BRANDS = [
  "Alfa Romeo", "Alpine", "Aston Martin", "Audi", "Bentley", "BMW", "BYD", "Citroën",
  "Cupra", "DS", "Ferrari", "Fiat", "Ford", "Honda", "Hyundai", "Jaguar", "Kia",
  "Lamborghini", "Land Rover", "Lexus", "Maserati", "Mazda", "McLaren", "Mercedes-Benz",
  "Mini", "Nissan", "Opel", "Peugeot", "Polestar", "Porsche", "Renault", "SEAT",
  "Skoda", "Tesla", "Toyota", "Volkswagen", "Volvo",
];

export const COLORS = build([
  ["black", "Black", "Noir", "Schwarz", "黑色", "أسود", "Negro"],
  ["white", "White", "Blanc", "Weiß", "白色", "أبيض", "Blanco"],
  ["grey", "Grey", "Gris", "Grau", "灰色", "رمادي", "Gris"],
  ["silver", "Silver", "Argent", "Silber", "银色", "فضي", "Plata"],
  ["blue", "Blue", "Bleu", "Blau", "蓝色", "أزرق", "Azul"],
  ["red", "Red", "Rouge", "Rot", "红色", "أحمر", "Rojo"],
  ["green", "Green", "Vert", "Grün", "绿色", "أخضر", "Verde"],
  ["yellow", "Yellow", "Jaune", "Gelb", "黄色", "أصفر", "Amarillo"],
  ["orange", "Orange", "Orange", "Orange", "橙色", "برتقالي", "Naranja"],
  ["brown", "Brown", "Marron", "Braun", "棕色", "بني", "Marrón"],
  ["beige", "Beige", "Beige", "Beige", "米色", "بيج", "Beige"],
  ["gold", "Gold", "Or", "Gold", "金色", "ذهبي", "Oro"],
]);

export const COLOR_HEX: Record<string, string> = {
  black: "#101114", white: "#F5F5F5", grey: "#6B7280", silver: "#C0C5CC",
  blue: "#1D4ED8", red: "#DC2626", green: "#15803D", yellow: "#EAB308",
  orange: "#EA580C", brown: "#78350F", beige: "#D6C7A8", gold: "#B08D3F",
};

/* ═══════════════════════════════════════════════════════════════
   Big Toys — motorcycles, quads, jet skis and boats.

   Its own vocabulary rather than the car one: a jet ski has no body
   type and no gearbox, a boat is measured in metres and knots, and a
   motorcycle is gated by a licence category no car buyer ever sees.
   ═══════════════════════════════════════════════════════════════ */

export const TOY_KINDS = build([
  ["MOTORCYCLE", "Motorcycle", "Moto", "Motorrad", "摩托车", "دراجة نارية", "Motocicleta"],
  ["QUAD", "Quad / ATV", "Quad", "Quad / ATV", "四轮越野车", "دراجة رباعية", "Quad / ATV"],
  ["BUGGY", "Buggy", "Buggy", "Buggy", "沙滩车", "عربة بَغي", "Buggy"],
  ["JETSKI", "Jet ski", "Jet-ski", "Jetski", "水上摩托", "جت سكي", "Moto acuática"],
  ["BOAT", "Boat", "Bateau", "Boot", "游艇", "قارب", "Embarcación"],
  ["ACCESSORY", "Accessories", "Accessoires", "Zubehör", "配件", "إكسسوارات", "Accesorios"],
]);

/**
 * Three worlds, not two.
 *
 * Land and water decide which figure says how used a machine is — kilometres
 * for what rolls, engine hours for what floats. Accessories are neither: a
 * helmet has no engine, no licence category and no mileage, so the whole
 * powertrain half of the listing is dropped for them rather than left as a
 * column of empty fields inviting a guess.
 */
export const WATER_KINDS: readonly string[] = ["JETSKI", "BOAT"];
export const ACCESSORY_KIND = "ACCESSORY";

export function isWaterToy(kind: string | null | undefined): boolean {
  return !!kind && WATER_KINDS.includes(kind);
}

export function isAccessory(kind: string | null | undefined): boolean {
  return kind === ACCESSORY_KIND;
}

/** Everything with an engine — which is everything except the accessories. */
export function isMotorised(kind: string | null | undefined): boolean {
  return !!kind && !isAccessory(kind);
}

export const TOY_CATEGORIES = build([
  ["SPORT", "Sport", "Sportive", "Sport", "运动型", "رياضية", "Deportiva"],
  ["TOURING", "Touring", "Routière", "Tourer", "旅行型", "سياحية", "Turismo"],
  ["CRUISER", "Cruiser", "Custom", "Cruiser", "巡航型", "كروزر", "Custom"],
  ["ADVENTURE", "Adventure", "Trail", "Adventure", "探险型", "مغامرة", "Trail"],
  ["UTILITY", "Utility", "Utilitaire", "Nutzfahrzeug", "实用型", "عملية", "Utilitario"],
  ["RACE", "Racing", "Compétition", "Racing", "竞赛型", "سباق", "Competición"],
  ["LUXURY", "Luxury", "Luxe", "Luxus", "豪华型", "فاخرة", "Lujo"],
  ["WATERSPORT", "Watersports", "Sports nautiques", "Wassersport", "水上运动", "رياضات مائية", "Deportes náuticos"],
]);

export const TOY_ENGINES = build([
  ["PETROL", "Petrol", "Essence", "Benzin", "汽油", "بنزين", "Gasolina"],
  ["DIESEL", "Diesel", "Diesel", "Diesel", "柴油", "ديزل", "Diésel"],
  ["ELECTRIC", "Electric", "Électrique", "Elektro", "纯电动", "كهربائية", "Eléctrico"],
  ["HYBRID", "Hybrid", "Hybride", "Hybrid", "混合动力", "هجينة", "Híbrido"],
]);

export const TOY_TRANSMISSIONS = build([
  ["MANUAL", "Manual", "Manuelle", "Schaltgetriebe", "手动", "يدوي", "Manual"],
  ["AUTOMATIC", "Automatic", "Automatique", "Automatik", "自动", "أوتوماتيكي", "Automático"],
  ["DCT", "Dual clutch", "Double embrayage", "Doppelkupplung", "双离合", "قابض مزدوج", "Doble embrague"],
  ["CVT", "CVT", "CVT", "CVT", "无级变速", "ناقل متغير", "CVT"],
  // Jet skis and most outboards drive the impeller or propeller straight off
  // the crankshaft; there is no gearbox to name.
  ["DIRECT", "Direct drive", "Prise directe", "Direktantrieb", "直接驱动", "دفع مباشر", "Transmisión directa"],
]);

/** What the buyer must hold to legally use it. */
export const TOY_LICENCES = build([
  ["A1", "A1 licence (125 cm³)", "Permis A1 (125 cm³)", "Führerschein A1 (125 cm³)", "A1 驾照（125 cc）", "رخصة A1 (125 سم³)", "Permiso A1 (125 cm³)"],
  ["A2", "A2 licence (35 kW)", "Permis A2 (35 kW)", "Führerschein A2 (35 kW)", "A2 驾照（35 千瓦）", "رخصة A2 (35 كيلوواط)", "Permiso A2 (35 kW)"],
  ["A", "Full A licence", "Permis A", "Führerschein A", "A 驾照", "رخصة A", "Permiso A"],
  ["B", "Car licence (B)", "Permis B (voiture)", "Führerschein B", "B 驾照（汽车）", "رخصة B (سيارة)", "Permiso B (coche)"],
  ["BOAT_INLAND", "Inland waters licence", "Permis fluvial", "Sportbootführerschein Binnen", "内河驾照", "رخصة المياه الداخلية", "Licencia de navegación interior"],
  ["BOAT_COASTAL", "Coastal licence", "Permis côtier", "Sportbootführerschein See", "近海驾照", "رخصة ساحلية", "Licencia costera"],
  ["NONE", "No licence required", "Aucun permis requis", "Führerscheinfrei", "无需驾照", "لا تتطلب رخصة", "Sin permiso"],
]);

/** Makes that actually exist in these four worlds — none of them sell cars. */
export const TOY_BRANDS = [
  "Aprilia", "Arctic Cat", "Axopar", "BMW Motorrad", "Bombardier", "Brabus Marine",
  "BRP", "CFMOTO", "Ducati", "Fantic", "Frauscher", "Harley-Davidson", "Honda",
  "Husqvarna", "Indian", "Jeanneau", "Kawasaki", "KTM", "Can-Am", "MV Agusta",
  "Polaris", "Quicksilver", "Riva", "Royal Enfield", "Sea-Doo", "Segway Powersports",
  "Sunseeker", "Suzuki", "Triumph", "Vespa", "Yamaha", "Zero Motorcycles",
];

/* ─────────────────── Big Toys equipment ────────────────────────
   A short, honest list. A motorcycle option sheet is nothing like a
   car's, and padding this with car entries would hand the advisor
   tick boxes that make no sense on a jet ski.                     */

export const TOY_EQUIPMENT_GROUPS = build([
  ["RIDING", "Riding & electronics", "Pilotage & électronique", "Fahrdynamik & Elektronik", "驾控与电子", "القيادة والإلكترونيات", "Pilotaje y electrónica"],
  ["ONBOARD", "On board", "À bord", "An Bord", "船上配置", "على المتن", "A bordo"],
  ["PROTECTION", "Protection & finish", "Protection & finition", "Schutz & Ausstattung", "防护与外观", "الحماية والتشطيب", "Protección y acabado"],
  ["TRANSPORT", "Transport & storage", "Transport & rangement", "Transport & Lagerung", "运输与存放", "النقل والتخزين", "Transporte y almacenaje"],
]);

const TOY_EQUIPMENT_ROWS: readonly (readonly [string, string, string, string, string, string, string, string])[] = [
  // [key, group, en, fr, de, zh, ar, es]
  ["t_abs", "RIDING", "Cornering ABS", "ABS en courbe", "Kurven-ABS", "弯道防抱死", "ABS في المنعطفات", "ABS en curva"],
  ["t_traction", "RIDING", "Traction control", "Contrôle de traction", "Traktionskontrolle", "牵引力控制", "التحكم بالجر", "Control de tracción"],
  ["t_modes", "RIDING", "Riding modes", "Modes de conduite", "Fahrmodi", "驾驶模式", "أوضاع القيادة", "Modos de conducción"],
  ["t_quickshifter", "RIDING", "Quickshifter", "Shifter", "Schaltassistent", "快速换挡", "مبدل سريع", "Cambio rápido"],
  ["t_cruise", "RIDING", "Cruise control", "Régulateur de vitesse", "Tempomat", "定速巡航", "مثبت السرعة", "Control de crucero"],
  ["t_suspension", "RIDING", "Semi-active suspension", "Suspension semi-active", "Semiaktives Fahrwerk", "半主动悬挂", "تعليق شبه نشط", "Suspensión semiactiva"],
  ["t_launch", "RIDING", "Launch control", "Launch control", "Launch Control", "弹射起步", "التحكم بالانطلاق", "Launch control"],
  ["t_brembo", "RIDING", "Brembo brakes", "Freins Brembo", "Brembo-Bremsen", "Brembo 制动", "مكابح بريمبو", "Frenos Brembo"],

  ["t_gps", "ONBOARD", "GPS chartplotter", "GPS / traceur de cartes", "GPS-Kartenplotter", "GPS 海图仪", "نظام ملاحة GPS", "GPS / plóter"],
  ["t_display", "ONBOARD", "TFT colour display", "Écran TFT couleur", "TFT-Farbdisplay", "TFT 彩色仪表", "شاشة TFT ملونة", "Pantalla TFT a color"],
  ["t_audio", "ONBOARD", "Audio system", "Système audio", "Audiosystem", "音响系统", "نظام صوتي", "Sistema de audio"],
  ["t_connect", "ONBOARD", "Smartphone connectivity", "Connectivité smartphone", "Smartphone-Anbindung", "手机互联", "ربط الهاتف", "Conectividad smartphone"],
  ["t_heatedgrips", "ONBOARD", "Heated grips", "Poignées chauffantes", "Heizgriffe", "加热手把", "مقابض مدفأة", "Puños calefactables"],
  ["t_sundeck", "ONBOARD", "Sun deck", "Bain de soleil", "Sonnendeck", "日光浴甲板", "سطح للتشمس", "Solárium"],
  ["t_cabin", "ONBOARD", "Cabin with berths", "Cabine avec couchages", "Kabine mit Kojen", "带铺位客舱", "مقصورة بأسرّة", "Camarote con literas"],
  ["t_fridge", "ONBOARD", "Fridge / icebox", "Réfrigérateur / glacière", "Kühlbox", "冰箱／冰柜", "ثلاجة", "Nevera"],
  ["t_shower", "ONBOARD", "Transom shower", "Douchette de plage arrière", "Heckdusche", "尾部淋浴", "دش خلفي", "Ducha de popa"],
  ["t_bowthruster", "ONBOARD", "Bow thruster", "Propulseur d'étrave", "Bugstrahlruder", "船首侧推", "دافع أمامي", "Hélice de proa"],

  ["t_carbon", "PROTECTION", "Carbon fibre parts", "Pièces carbone", "Carbonteile", "碳纤维部件", "أجزاء كربون", "Piezas de carbono"],
  ["t_akrapovic", "PROTECTION", "Akrapovič exhaust", "Échappement Akrapovič", "Akrapovič-Auspuff", "Akrapovič 排气", "عادم أكرابوفيتش", "Escape Akrapovič"],
  ["t_crashbars", "PROTECTION", "Crash bars / sliders", "Pare-carters / sliders", "Sturzbügel", "防摔杠", "قضبان حماية", "Defensas / sliders"],
  ["t_screen", "PROTECTION", "Adjustable screen", "Bulle réglable", "Verstellbare Scheibe", "可调风挡", "حاجب قابل للتعديل", "Cúpula regulable"],
  ["t_antifouling", "PROTECTION", "Antifouling applied", "Antifouling appliqué", "Antifouling aufgetragen", "已涂防污漆", "طلاء مضاد للنمو", "Antifouling aplicado"],
  ["t_cover", "PROTECTION", "Fitted cover", "Housse sur mesure", "Passgenaue Abdeckung", "定制罩衣", "غطاء مفصّل", "Funda a medida"],
  ["t_leds", "PROTECTION", "Full LED lighting", "Éclairage full LED", "Voll-LED-Beleuchtung", "全 LED 照明", "إضاءة LED كاملة", "Iluminación full LED"],

  ["t_trailer", "TRANSPORT", "Trailer included", "Remorque incluse", "Trailer inklusive", "含拖车", "مقطورة مشمولة", "Remolque incluido"],
  ["t_topcase", "TRANSPORT", "Top case & panniers", "Top-case & valises", "Topcase & Koffer", "顶箱与边箱", "صندوق وحقائب", "Top case y maletas"],
  ["t_winch", "TRANSPORT", "Winch", "Treuil", "Seilwinde", "绞盘", "ونش", "Cabrestante"],
  ["t_towhitch", "TRANSPORT", "Tow hitch", "Attelage", "Anhängerkupplung", "拖车钩", "خطاف جر", "Enganche de remolque"],
];

export const TOY_EQUIPMENT: Record<string, { group: string; labels: Record<Locale, string> }> = {};
for (const [key, group, en, fr, de, zh, ar, es] of TOY_EQUIPMENT_ROWS) {
  TOY_EQUIPMENT[key] = { group, labels: { en, fr, de, zh, ar, es } };
}

export function toyEquipmentByGroup(): Record<string, string[]> {
  const groups: Record<string, string[]> = {};
  for (const [key, { group }] of Object.entries(TOY_EQUIPMENT)) {
    (groups[group] ||= []).push(key);
  }
  return groups;
}

export function toyEquipmentLabel(key: string, locale: Locale): string {
  return TOY_EQUIPMENT[key]?.labels[locale] ?? key;
}
