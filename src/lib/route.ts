import { headers } from "next/headers";

/**
 * The path the current request is for.
 *
 * Layouts and loading files are not given the pathname by the framework, and
 * both need it here: the site shell decides whose first-paint splash plays,
 * and every loading boundary above Big Toys has to know which universe it is
 * standing in. The middleware puts it on the request as `x-pathname`.
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
