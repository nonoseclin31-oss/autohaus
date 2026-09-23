"use client";

import { usePathname } from "next/navigation";
import { BrandLoader } from "./brand-loader";
import { ToysLoader } from "./toys-loader";

/** Whether a path is inside Big Toys: /fr/big-toys, /fr/big-toys/…, any locale. */
export function isToysPath(pathname: string): boolean {
  return pathname.split("/").includes("big-toys");
}

/**
 * The loading screen of whichever universe the visitor is going to.
 *
 * Decided here, in the browser, from the address being loaded — and not on
 * the server from the request, as it was. A loading screen is rendered once
 * with the layout it belongs to and then kept by the router for every later
 * navigation under that layout: one rendered while the visitor was in Big
 * Toys went on being shown on the way out, so the car pages opened on the
 * marine loader. Read at the moment it is shown, the address is always the
 * destination's.
 */
export function UniverseLoader({ fullscreen = false }: { fullscreen?: boolean }) {
  const pathname = usePathname() ?? "";
  return isToysPath(pathname) ? <ToysLoader fullscreen={fullscreen} /> : <BrandLoader fullscreen={fullscreen} />;
}
