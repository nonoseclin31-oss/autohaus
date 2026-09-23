import { headers } from "next/headers";
import { NotFoundView } from "@/components/not-found-view";
import { resolveLocale } from "@/i18n";

/**
 * A listing or page that no longer exists, in the language of the address
 * that led there — most often an old link to a car that has been sold.
 *
 * A not-found page is not handed the route's params, so the language is read
 * from the path the middleware passes along.
 */
export default async function NotFound() {
  const segment = (await headers()).get("x-pathname")?.split("/")[1];
  return <NotFoundView locale={resolveLocale(segment)} />;
}
