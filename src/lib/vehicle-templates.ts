import type { VehicleFormValues } from "@/components/admin/vehicle-form";

/**
 * A template is a listing's values, reusable as the starting point for the
 * next car of the same kind.
 *
 * Everything the form holds is kept except two groups.
 *
 * Photos, because they belong to one car rather than to a kind of car — which
 * is what was asked for, and is also what keeps a template small.
 *
 * And the values that identify one specific car: its database id, stock
 * reference, URL slug and VIN. Carrying those over would either clash with the
 * car the template was made from or quietly label the new car as the old one.
 * Publication state is dropped for the same reason: a new listing should not
 * inherit "published" from whatever it was copied from.
 */
const EXCLUDED = new Set([
  "id",
  "images",
  "reference",
  "slug",
  "vin",
  "published",
  "featured",
  "ownerId",
  // Form plumbing rather than vehicle data.
  "locale",
  "intent",
  "templateName",
]);

export type TemplateSummary = {
  id: string;
  name: string;
  brand: string;
  model: string;
  version: string | null;
  usageCount: number;
  lastUsedAt: Date | null;
  createdAt: Date;
  authorName: string | null;
};

/**
 * Turns a submitted form into the JSON a template stores.
 *
 * Read from FormData rather than from a parsed vehicle so a template can be
 * saved from a listing that would not pass validation — someone may want to
 * keep the equipment list of a car they have not finished entering.
 */
export function payloadFromForm(formData: FormData): string {
  const out: Record<string, unknown> = {};

  for (const key of new Set(formData.keys())) {
    if (EXCLUDED.has(key)) continue;

    const values = formData.getAll(key).filter((value): value is string => typeof value === "string");
    if (!values.length) continue;

    // Repeated names are the multi-value fields: equipment, rental durations
    // and mileages. A single value stays a string.
    out[key] = values.length > 1 ? values : values[0];
  }

  return JSON.stringify(out);
}

/**
 * Turns a stored template back into initial values for the form.
 *
 * The form's fields are uncontrolled and read `defaultValue`, so strings are
 * enough for most of them — but the handful the form drives from React state
 * have to arrive as the right type or the section renders as if it were empty.
 */
export function valuesFromPayload(payload: string): VehicleFormValues {
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return {};
  }

  const str = (key: string): string | undefined =>
    typeof raw[key] === "string" && raw[key] !== "" ? (raw[key] as string) : undefined;
  const num = (key: string): number | undefined => {
    const value = str(key);
    if (value === undefined) return undefined;
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  };
  const bool = (key: string): boolean => raw[key] === "on" || raw[key] === "true" || raw[key] === true;
  const list = (key: string): string[] => {
    const value = raw[key];
    if (Array.isArray(value)) return value.map(String);
    return typeof value === "string" && value !== "" ? [value] : [];
  };

  const values: Record<string, unknown> = {};

  // Strings and numbers can be carried across by name; only their type differs.
  const NUMERIC = new Set([
    "year", "gears", "engineSize", "cylinders", "powerHp", "powerKw", "torqueNm",
    "acceleration", "topSpeed", "consumptionCombined", "consumptionUrban", "consumptionHighway",
    "co2", "batteryCapacity", "electricRange", "doors", "seats", "mileage", "previousOwners",
    "warrantyMonths", "price", "priceNet", "oldPrice", "financingMonthly",
    "rentalMonthly", "rentalDeposit", "rentalFirstPayment",
  ]);
  const BOOLEAN = new Set([
    "serviceHistory", "accidentFree", "nonSmoker", "imported",
    "vatDeductible", "negotiable", "rentalAvailable",
  ]);

  for (const key of Object.keys(raw)) {
    if (key.startsWith("headline_") || key.startsWith("description_")) continue;
    if (key === "equipment" || key === "rentalDurations" || key === "rentalMileages") continue;
    if (NUMERIC.has(key)) values[key] = num(key);
    else if (BOOLEAN.has(key)) values[key] = bool(key);
    else values[key] = str(key);
  }

  values.equipment = list("equipment");
  values.rentalDurations = list("rentalDurations").map(Number).filter(Number.isFinite);
  values.rentalMileages = list("rentalMileages").map(Number).filter(Number.isFinite);

  // Per-language headline and description are submitted as headline_fr,
  // description_fr and so on.
  const translations: Record<string, { headline: string; description: string }> = {};
  for (const key of Object.keys(raw)) {
    const match = /^(headline|description)_([a-z-]+)$/.exec(key);
    if (!match) continue;
    const [, field, locale] = match;
    translations[locale] ??= { headline: "", description: "" };
    translations[locale][field as "headline" | "description"] = str(key) ?? "";
  }
  if (Object.keys(translations).length) values.translations = translations;

  return values as VehicleFormValues;
}
