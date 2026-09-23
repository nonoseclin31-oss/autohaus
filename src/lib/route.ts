import { headers } from "next/headers";

/**
 * The path the current request is for.
 *
 * Layouts are not given the pathname by the framework, and the site shell
 * needs it: it decides whose first-paint splash plays when a page is opened.
 * The middleware puts it on the request as `x-pathname`.
 *
 * Only for decisions taken once per document. Loading screens must not use
 * it: the router keeps them from the request that first rendered them, so a
 * choice made here would outlive the page it was made for — see
 * UniverseLoader, which decides in the browser instead.
 *
 * Empty when the header is missing — which is what happens for anything the
 * middleware does not match — and every caller treats that as "the
 * dealership", the safe default.
 */
export async function currentPathname(): Promise<string> {
  return (await headers()).get("x-pathname") ?? "";
}

/** Whether this request is for a page inside the Big Toys universe. */
export async function inToysUniverse(): Promise<boolean> {
  return (await currentPathname()).includes("/big-toys");
}
