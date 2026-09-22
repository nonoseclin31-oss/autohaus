import { BrandLoader } from "@/components/brand-loader";
import { ToysLoader } from "@/components/toys-loader";
import { inToysUniverse } from "@/lib/route";

/** Sits inside the site shell, so the header and footer stay put. */
export default async function Loading() {
  return (await inToysUniverse()) ? <ToysLoader /> : <BrandLoader />;
}
