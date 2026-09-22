import { Logo } from "./logo";

/**
 * First-paint splash. Deliberately CSS-only — no state, no effect, no
 * `sessionStorage` — so it cannot cause a hydration mismatch and cannot get
 * stuck covering the page: the animation ends at `visibility: hidden`, and it
 * never takes pointer events. Hidden outright under `prefers-reduced-motion`.
 *
 * `suppressed` is decided once, by the layout, from the path the document was
 * loaded on — not from the current route. That distinction is the whole point:
 * Big Toys opens with its own loader instead of this one, and if this
 * component came and went as the visitor moved between the two universes, the
 * animation would restart and replay the whole brand splash in the middle of a
 * click. Decided at load, it simply never appears for that document.
 */
export function SplashScreen({ suppressed = false }: { suppressed?: boolean }) {
  if (suppressed) return null;

  return (
    <div className="splash" aria-hidden="true">
      <div className="splash-logo">
        <Logo variant="full" size="md" priority />
      </div>
      <div className="loader-track">
        <span className="loader-bar" />
      </div>
    </div>
  );
}
