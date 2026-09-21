"use client";

import { useState } from "react";
import { getDictionary, type Locale } from "@/i18n";
import { IconPin, IconInfo } from "./icons";

/**
 * A Google map that only loads once the visitor asks for it.
 *
 * Embedding the iframe outright sends the visitor's IP address to Google
 * before they have agreed to anything, which under the GDPR and the TTDSG is
 * the kind of transfer German businesses get warned over. Holding it behind a
 * click keeps the map available and keeps the page free of any third party
 * until it is wanted — which is also why the site needs no consent banner.
 */
export function ConsentMap({
  locale,
  query,
  title,
}: {
  locale: Locale;
  query: string;
  title: string;
}) {
  const t = getDictionary(locale);
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    return (
      <div className="overflow-hidden rounded-sm border border-line">
        <iframe
          src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`}
          title={title}
          width="100%"
          height="320"
          loading="lazy"
          referrerPolicy="no-referrer"
          className="block border-0 grayscale-[0.3]"
        />
      </div>
    );
  }

  return (
    <div className="flex h-[320px] flex-col items-center justify-center gap-3 rounded-sm border border-line bg-surface-2 px-6 text-center">
      <IconPin size={24} className="text-subtle" />
      <p className="text-sm text-muted">{t.contact.mapConsent}</p>
      <button type="button" onClick={() => setLoaded(true)} className="btn btn-solid cursor-pointer">
        {t.contact.mapLoad}
      </button>
      <p className="flex items-start gap-1.5 text-xs text-subtle">
        <IconInfo size={12} className="mt-0.5 shrink-0" />
        {t.contact.mapNotice}
      </p>
    </div>
  );
}
