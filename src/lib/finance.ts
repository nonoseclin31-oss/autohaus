/**
 * Lease maths for the two formulas the showroom offers.
 *
 * LLD (location longue durée) — you rent the car for a term and hand it back.
 * The monthly covers what the car loses over the term, the cost of the money,
 * and the services that come with it: servicing, warranty, assistance and a
 * replacement car.
 *
 * LOA (location avec option d'achat) — the same rental, plus the right to buy
 * the car at the end for a price fixed at signature. That price is the
 * residual value, so the monthly covers only the part of the car you actually
 * consume. Services are optional rather than included.
 *
 * The arithmetic is the standard lease formula, not a percentage of the
 * price: depreciation is amortised over the term, and the finance charge is
 * taken on the average capital outstanding — which is the mean of what is
 * financed at the start and what remains at the end.
 *
 *   monthly depreciation = (financed − residual) / months
 *   monthly finance      = (financed + residual) × rate / 24
 *
 * Dividing the rate by 24 rather than 12 is what accounts for the capital
 * falling steadily to the residual over the term.
 */

/** What a car is worth at the end of a term, as a share of its price today. */
const RESIDUAL_CURVE: readonly (readonly [months: number, rate: number])[] = [
  [24, 0.64],
  [36, 0.54],
  [48, 0.45],
  [60, 0.38],
  [72, 0.32],
];

/** The mileage the residual curve assumes. */
export const REFERENCE_KM = 15000;

/** Annual percentage rate applied when a vehicle does not set its own. */
export const DEFAULT_FINANCE_RATE = 0.049;

/** German VAT. Showroom prices are stated inclusive of it. */
export const VAT_RATE = 0.19;

export const DURATIONS = [24, 36, 48, 60, 72] as const;
export const MILEAGES = [10000, 15000, 20000, 25000, 30000, 40000] as const;

export type Formula = "LLD" | "LOA";

export type FinanceInput = {
  /** Price of the vehicle, VAT included. */
  price: number;
  months: number;
  annualKm: number;
  /** Paid at signature. Lowers the monthly, never the purchase option. */
  downPayment?: number;
  formula?: Formula;
  /** Per-vehicle overrides, set in the back office. */
  rate?: number;
  residualRate?: number;
  servicesMonthly?: number;
  /** LOA only: services are not part of the contract unless asked for. */
  withServices?: boolean;
};

export type FinanceResult = {
  monthly: number;
  /** Depreciation, finance charge and services, before rounding. */
  depreciation: number;
  financeCharge: number;
  services: number;
  /** What the car is worth at the end — and, for a LOA, what it costs to keep. */
  residual: number;
  purchaseOption: number | null;
  /** Everything paid over the term, the down payment included. */
  totalCost: number;
  residualRate: number;
  /** Charged per kilometre beyond the contracted allowance. */
  excessKmRate: number;
  /** Credited per kilometre left unused, at half the excess rate. */
  unusedKmRate: number;
  /** The same monthly excluding VAT, which is what a company books. */
  monthlyNet: number;
  totalCostNet: number;
};

/**
 * Residual value as a share of the price.
 *
 * Interpolated between the curve's points so any term works, then adjusted
 * for mileage: the reference is 15.000 km a year, and every thousand above or
 * below moves the residual by a third of a point per year of contract. A car
 * on 30.000 km for four years has done 120.000 km, and the curve says so.
 */
export function residualRateFor(months: number, annualKm: number): number {
  const term = clamp(months, 12, 84);

  let rate: number;
  const first = RESIDUAL_CURVE[0];
  const last = RESIDUAL_CURVE[RESIDUAL_CURVE.length - 1];

  if (term <= first[0]) {
    // Shorter than the shortest point: extend the first segment's slope.
    const [m1, r1] = first;
    const [m2, r2] = RESIDUAL_CURVE[1];
    rate = r1 + ((term - m1) * (r2 - r1)) / (m2 - m1);
  } else if (term >= last[0]) {
    const [m1, r1] = RESIDUAL_CURVE[RESIDUAL_CURVE.length - 2];
    const [m2, r2] = last;
    rate = r2 + ((term - m2) * (r2 - r1)) / (m2 - m1);
  } else {
    const upper = RESIDUAL_CURVE.findIndex(([m]) => m >= term);
    const [m1, r1] = RESIDUAL_CURVE[upper - 1];
    const [m2, r2] = RESIDUAL_CURVE[upper];
    rate = r1 + ((term - m1) * (r2 - r1)) / (m2 - m1);
  }

  // The mileage penalty grows with the term but not in proportion to it: the
  // first 50.000 km cost a car far more of its value than the next 50.000.
  // Scaling by years alone put a five-year, 150.000 km car at 12% of new,
  // which is well under what one actually fetches.
  const years = term / 12;
  const mileageDelta = ((REFERENCE_KM - annualKm) / 1000) * 0.0035 * years ** 0.7;

  return clamp(rate + mileageDelta, 0.12, 0.78);
}

/**
 * Monthly cost of running and servicing the car, for a LLD.
 *
 * Scales with the value of the car — parts and labour on a Ferrari are not
 * parts and labour on a Golf — and with how hard it is driven, since servicing
 * is scheduled by distance.
 */
export function servicesMonthlyFor(price: number, annualKm: number): number {
  const base = 35 + price * 0.0004;
  const mileageFactor = (annualKm / REFERENCE_KM) ** 0.7;
  return Math.round(base * mileageFactor);
}

/** Runs one quote. */
export function quote(input: FinanceInput): FinanceResult {
  const formula = input.formula ?? "LLD";
  const months = Math.max(1, Math.round(input.months));
  const annualKm = Math.max(1000, Math.round(input.annualKm));
  const price = Math.max(0, input.price);

  // A down payment above the price would make the maths meaningless, and a
  // negative one is a typo.
  const downPayment = clamp(input.downPayment ?? 0, 0, price);

  const residualRate = input.residualRate ?? residualRateFor(months, annualKm);
  const residual = Math.round(price * residualRate);
  const financed = price - downPayment;

  // A large down payment can take the financed amount below the residual. The
  // customer has then pre-paid part of what they would owe at the end, so the
  // depreciation term simply goes to zero rather than negative.
  const depreciation = Math.max(0, financed - residual) / months;

  const rate = input.rate ?? DEFAULT_FINANCE_RATE;
  const financeCharge = ((financed + residual) * rate) / 24;

  const withServices = formula === "LLD" ? true : (input.withServices ?? false);
  const services = withServices
    ? (input.servicesMonthly ?? servicesMonthlyFor(price, annualKm))
    : 0;

  // Rounded to five so a quote reads like a quote rather than a calculation.
  const monthly = Math.max(49, Math.round((depreciation + financeCharge + services) / 5) * 5);

  const excessKmRate = excessKmRateFor(price, months);

  return {
    monthly,
    monthlyNet: Math.round(monthly / (1 + VAT_RATE)),
    excessKmRate,
    // Unused kilometres come back at half the rate: the car is worth more
    // than the contract assumed, but reselling it still costs something.
    unusedKmRate: Math.round((excessKmRate / 2) * 100) / 100,
    depreciation,
    financeCharge,
    services,
    residual,
    purchaseOption: formula === "LOA" ? residual : null,
    totalCost: downPayment + monthly * months,
    totalCostNet: Math.round((downPayment + monthly * months) / (1 + VAT_RATE)),
    residualRate,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * What a kilometre over the allowance costs.
 *
 * Derived from the residual model rather than invented: the curve says a
 * thousand extra kilometres a year costs 0.35% of the price per year of
 * contract, softened by the same exponent. Spread over the kilometres
 * actually driven, that is the per-kilometre figure. The floor keeps a cheap
 * car from quoting a rate too small to cover the handling.
 */
export function excessKmRateFor(price: number, months: number): number {
  const years = Math.max(1, months / 12);
  const rate = (price * 0.0035) / (1000 * years ** 0.3);
  return Math.max(0.08, Math.round(rate * 100) / 100);
}

/**
 * Both formulas on the same terms.
 *
 * The choice between renting and keeping the option to buy is the one a
 * customer actually has to make, and it is only meaningful side by side.
 */
export function compare(input: Omit<FinanceInput, "formula">): Record<Formula, FinanceResult> {
  return {
    LLD: quote({ ...input, formula: "LLD" }),
    LOA: quote({ ...input, formula: "LOA" }),
  };
}
