import { BrandLoader } from "@/components/brand-loader";
import { ToysLoader } from "@/components/toys-loader";
import { inToysUniverse } from "@/lib/route";

/**
 * The outermost loading boundary: it covers the site shell itself, which has
 * to reach the database before the header can be drawn.
 *
 * It asks which universe the request is for, because otherwise every visit to
 * Big Toys opened with the dealership's loader and then swapped to the
 * marine one a moment later — two loading screens for one page.
 */
export default async function Loading() {
  return (await inToysUniverse()) ? <ToysLoader fullscreen /> : <BrandLoader fullscreen />;
}
