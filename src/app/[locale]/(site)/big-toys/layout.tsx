import { UniverseScope } from "@/components/universe-scope";

/**
 * The Big Toys universe, applied to the whole segment.
 *
 * It lives here rather than on each page so that the loading state gets it
 * too. A Suspense fallback renders inside its segment's layout, so a marine
 * page whose loader was still wearing the dealership's sand would flash twice
 * on every visit — once into the loader, once into the page.
 *
 * `UniverseScope` puts the same marker on <html>, which is what carries the
 * body background and the footer. Mounted once, at the top of the segment, it
 * stays put while the visitor moves between the collection and a listing.
 */
export default function BigToysLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-universe="toys" className="min-h-screen">
      <UniverseScope />
      {children}
    </div>
  );
}
