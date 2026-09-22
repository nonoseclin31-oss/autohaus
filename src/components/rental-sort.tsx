"use client";

import { useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { getDictionary, type Locale } from "@/i18n";
import { IconSpinner } from "./icons";
import { cn } from "@/lib/utils";

/**
 * Ordering for the long-term rental offers.
 *
 * Deliberately not a filter bar. This page shows a dozen cars at most and
 * sells one number, so narrowing the list is not what a visitor here needs —
 * reading it in a different order is. One inline control on the heading row,
 * no drawer, no chips.
 *
 * The choice is a URL parameter so a sorted view can be sent to someone, and
 * `scroll: false` keeps the page where it is: the control sits halfway down,
 * and jumping back to the hero on every change would be its own small bug.
 */
export function RentalSort({ locale }: { locale: Locale }) {
  const t = getDictionary(locale);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const current = searchParams.get("sort") ?? "";

  function change(value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set("sort", value);
    else params.delete("sort");
    const query = params.toString();
    startTransition(() => {
      router.replace(`${pathname}${query ? `?${query}` : ""}#offers`, { scroll: false });
    });
  }

  return (
    <div className="flex shrink-0 items-center gap-2">
      <label htmlFor="rental-sort" className="whitespace-nowrap text-sm text-muted">
        {t.common.sortBy}
      </label>
      <div className="relative">
        <select
          id="rental-sort"
          value={current}
          onChange={(event) => change(event.target.value)}
          className={cn("select h-10 w-auto min-w-[12rem]", pending && "opacity-60")}
        >
          <option value="">{t.rental.sortStandard}</option>
          <option value="price">{t.rental.sortPrice}</option>
          <option value="mileage">{t.rental.sortMileage}</option>
          <option value="registration">{t.rental.sortRegistration}</option>
          <option value="listed">{t.rental.sortListed}</option>
        </select>
        {pending ? (
          <IconSpinner
            size={15}
            className="pointer-events-none absolute end-8 top-1/2 -translate-y-1/2 text-red"
          />
        ) : null}
      </div>
    </div>
  );
}
