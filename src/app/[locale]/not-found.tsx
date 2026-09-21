import Link from "next/link";
import { Logo } from "@/components/logo";
import { IconArrowRight } from "@/components/icons";

export default function NotFound() {
  return (
    <div className="studio flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <Logo variant="full" size="md" priority />
      <p className="mt-10 display text-[clamp(4rem,16vw,9rem)] text-red">
        404
      </p>
      <p className="mt-2 max-w-md text-lg text-muted">
        This page has left the pit lane. It may have been moved or the vehicle is no longer listed.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-center">
        <Link href="/fr" className="btn btn-primary cursor-pointer">
          Accueil
          <IconArrowRight size={17} />
        </Link>
        <Link href="/fr/vehicles" className="btn btn-ghost cursor-pointer">
          Véhicules
        </Link>
      </div>
    </div>
  );
}
