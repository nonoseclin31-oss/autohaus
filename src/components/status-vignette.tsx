import { label, VEHICLE_STATUS, type Locale } from "@/lib/taxonomy";
import { cn } from "@/lib/utils";
import { IconCheck, IconClock, IconFlag } from "./icons";

/**
 * The red "vignette" a sales advisor puts on a listing: SOLD (vendu) and
 * RESERVED (en cours de vente) are both red, COMING_SOON is gold.
 */
export function StatusVignette({
  status,
  locale,
  className,
}: {
  status: string;
  locale: Locale;
  className?: string;
}) {
  if (status === "AVAILABLE") return null;

  const Icon = status === "SOLD" ? IconFlag : status === "RESERVED" ? IconClock : IconCheck;

  return (
    <span
      className={cn(
        "vignette",
        status === "RESERVED" && "vignette-reserved",
        status === "COMING_SOON" && "vignette-soon",
        className,
      )}
    >
      <Icon size={13} />
      {label(VEHICLE_STATUS, status, locale)}
    </span>
  );
}

/** Diagonal stamp laid over a sold vehicle's photo. */
export function SoldOverlay({ status, locale }: { status: string; locale: Locale }) {
  if (status !== "SOLD") return null;
  return (
    <div className="sold-overlay" aria-hidden="true">
      <span className="sold-stamp">{label(VEHICLE_STATUS, "SOLD", locale)}</span>
    </div>
  );
}

/** Compact coloured dot + text, used in admin tables. */
export function StatusDot({ status, locale }: { status: string; locale: Locale }) {
  const tone =
    status === "AVAILABLE" ? "bg-ok" : status === "SOLD" ? "bg-red" : status === "RESERVED" ? "bg-red-deep" : "bg-gold";
  return (
    <span className="inline-flex items-center gap-2 text-sm">
      <span className={cn("size-2 shrink-0 rounded-full", tone)} aria-hidden="true" />
      {label(VEHICLE_STATUS, status, locale)}
    </span>
  );
}
