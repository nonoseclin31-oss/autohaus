import { UniverseLoader } from "@/components/universe-loader";

/** Inside the admin shell, so the sidebar stays put while a page loads. */
export default function Loading() {
  return <UniverseLoader className="min-h-[70vh] rounded-[4px]" />;
}
