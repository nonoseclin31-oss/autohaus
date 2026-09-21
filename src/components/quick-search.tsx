"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { getDictionary, localePath, type Locale } from "@/i18n";
import { BODY_TYPES, FUELS, optionsFor, type Locale as TaxLocale } from "@/lib/taxonomy";
import { IconSearch } from "./icons";

const PRICE_STEPS = [10000, 20000, 30000, 50000, 75000, 100000, 150000, 250000];

export function QuickSearch({ locale, brands }: { locale: Locale; brands: string[] }) {
  const t = getDictionary(locale);
  const tax = locale as TaxLocale;
  const router = useRouter();

  const [brand, setBrand] = useState("");
  const [bodyType, setBodyType] = useState("");
  const [fuel, setFuel] = useState("");
  const [priceMax, setPriceMax] = useState("");

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const params = new URLSearchParams();
    if (brand) params.set("brand", brand);
    if (bodyType) params.set("bodyType", bodyType);
    if (fuel) params.set("fuel", fuel);
    if (priceMax) params.set("priceMax", priceMax);
    const query = params.toString();
    router.push(`${localePath(locale, "/vehicles")}${query ? `?${query}` : ""}`);
  }

  return (
    <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      <div>
        <label htmlFor="qs-brand" className="label">{t.vehicles.brand}</label>
        <select id="qs-brand" className="select" value={brand} onChange={(e) => setBrand(e.target.value)}>
          <option value="">{t.common.all}</option>
          {brands.map((b) => (
            <option key={b} value={b}>{b}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="qs-body" className="label">{t.vehicles.bodyType}</label>
        <select id="qs-body" className="select" value={bodyType} onChange={(e) => setBodyType(e.target.value)}>
          <option value="">{t.common.all}</option>
          {optionsFor(BODY_TYPES, tax).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="qs-fuel" className="label">{t.vehicles.fuel}</label>
        <select id="qs-fuel" className="select" value={fuel} onChange={(e) => setFuel(e.target.value)}>
          <option value="">{t.common.all}</option>
          {optionsFor(FUELS, tax).map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="qs-price" className="label">{t.vehicles.priceRange}</label>
        <select id="qs-price" className="select" value={priceMax} onChange={(e) => setPriceMax(e.target.value)}>
          <option value="">{t.common.all}</option>
          {PRICE_STEPS.map((step) => (
            <option key={step} value={step}>
              {"≤ "}
              {new Intl.NumberFormat("de-DE").format(step)} €
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-end">
        <button type="submit" className="btn btn-primary w-full cursor-pointer">
          <IconSearch size={17} />
          {t.common.search}
        </button>
      </div>
    </form>
  );
}
