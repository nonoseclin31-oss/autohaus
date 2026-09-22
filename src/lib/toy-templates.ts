import type { ToyFormValues } from "@/components/admin/toy-form";

/**
 * A Big Toy template is a listing's values, reusable as the starting point
 * for the next machine of the same kind — the jet ski the workshop takes in
 * five times a season, entered once.
 *
 * Everything the form holds is kept except two groups, exactly as for cars.
 *
 * Photos, because they belong to one machine rather than to a kind of
 * machine — which is also what keeps a template small.
 *
 * And the values that identify one specific machine: its database id, stock
 * reference, URL slug and hull number. Carrying those over would either clash
 * with the machine the template was made from or quietly label the new one as
 * the old. Publication state goes for the same reason: a new listing must not
 * inherit "published" from whatever it was copied from.
 */
const EXCLUDED = new Set([
  "id",
  "images",
  "reference",
  "slug",
  "hullId",
  "published",
  "featured",
  "ownerId",
  // Form plumbing rather than listing data.
  "locale",
  "intent",
  "templateName",
]);

/** Turns a submitted form into the JSON a template stores. */
export function toyPayloadFromForm(formData: FormData): string {
  const out: Record<string, unknown> = {};

  for (const key of new Set(formData.keys())) {
    if (EXCLUDED.has(key)) continue;
    // React's server-action plumbing rides along in the same FormData under
    // keys like "$ACTION_KEY"; it is not listing data and must not be stored.
    if (key.startsWith("$")) continue;

    const values = formData.getAll(key).filter((value): value is string => typeof value === "string");
    if (!values.length) continue;

    // The only repeated name on this form is the equipment list; a single
    // value stays a string.
    out[key] = values.length > 1 ? values : values[0];
  }

  return JSON.stringify(out);
}

const NUMERIC = new Set([
  "year", "displacement", "cylinders", "strokes", "powerHp", "powerKw",
  "torqueNm", "topSpeed", "engineCount", "mileage", "engineHours", "dryWeight",
  "seats", "lengthM", "beamM", "fuelCapacity", "rangeKm", "warrantyMonths",
  "previousOwners", "price", "priceNet", "oldPrice", "financingMonthly",
]);

const BOOLEAN = new Set([
  "trailerIncluded", "registered", "serviceHistory", "accidentFree",
  "vatDeductible", "negotiable",
]);

/**
 * Turns a stored template back into initial values for the form.
 *
 * The form's fields are uncontrolled and read `defaultValue`, so strings are
 * enough for most of them — but the handful the form drives from React state
 * (the family, the equipment list, the status) have to arrive as the right
 * type or that part of the form renders as if it were empty.
 */
export function toyValuesFromPayload(payload: string): ToyFormValues {
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

  const values: Record<string, unknown> = {};

  for (const key of Object.keys(raw)) {
    if (key.startsWith("headline_") || key.startsWith("description_")) continue;
    if (key === "equipment") continue;
    if (NUMERIC.has(key)) values[key] = num(key);
    else if (BOOLEAN.has(key)) values[key] = bool(key);
    else values[key] = str(key);
  }

  const equipment = raw.equipment;
  values.equipment = Array.isArray(equipment)
    ? equipment.map(String)
    : typeof equipment === "string" && equipment !== ""
      ? [equipment]
      : [];

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

  return values as ToyFormValues;
}
