import { Logo } from "./logo";

/**
 * First-paint splash. Deliberately CSS-only — no state, no effect, no
 * `sessionStorage` — so it cannot cause a hydration mismatch and cannot get
 * stuck covering the page: the animation ends at `visibility: hidden`, and it
 * never takes pointer events, so the page underneath is usable throughout.
 * Hidden outright under `prefers-reduced-motion`.
 */
export function SplashScreen() {
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
