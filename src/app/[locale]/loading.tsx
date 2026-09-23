import { UniverseLoader } from "@/components/universe-loader";

/**
 * The outermost loading boundary: it covers the site shell itself, which has
 * to reach the database before the header can be drawn.
 *
 * It shows the universe being loaded, because otherwise every visit to Big
 * Toys opened with the dealership's loader and then swapped to the marine
 * one a moment later — two loading screens for one page.
 */
export default function Loading() {
  return <UniverseLoader fullscreen />;
}
