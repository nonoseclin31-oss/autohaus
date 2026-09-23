import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getDictionary, resolveLocale, localePath, formatCurrency, formatNumber } from "@/i18n";
import { CatalogOrder, type CatalogOption } from "@/components/admin/catalog-order";
import { CATALOG_DEFAULT_ORDER, CATALOG_PIN_LIMIT } from "@/lib/vehicles";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminCatalogOrderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));
  // Arranging the catalogue is a decision about the whole page, not about one
  // listing, so it follows the catalogue-wide permission.
  if (!can(user.role, "vehicle.update.any")) redirect(localePath(locale, "/admin/vehicles"));

  // Only a published, unsold listing can be pinned — offering the others
  // would let someone put a car at the top of a page that then hides it.
  // Read in the very order the public page uses, so this screen is a picture
  // of that page rather than a separate list to reconcile with it.
  const rows = await prisma.vehicle.findMany({
    where: { published: true, status: { not: "SOLD" } },
    orderBy: CATALOG_DEFAULT_ORDER,
    select: {
      id: true, brand: true, model: true, version: true, year: true,
      price: true, mileage: true, catalogRank: true,
      images: { orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
    },
  });

  const vehicles: CatalogOption[] = rows.map((row) => ({
    id: row.id,
    name: [row.brand, row.model, row.version].filter(Boolean).join(" "),
    detail: `${row.year} · ${formatCurrency(row.price, locale)} · ${formatNumber(row.mileage, locale)} ${t.common.km}`,
    coverUrl: row.images[0]?.url ?? null,
  }));

  const pinned = rows.filter((row) => row.catalogRank !== null).map((row) => row.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={localePath(locale, "/admin/vehicles")}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted transition-colors duration-200 hover:text-fg"
        >
          <IconArrowLeft size={15} />
          {t.admin.vehicles}
        </Link>
        <h1 className="display mt-2 text-3xl">{t.admin.catalogArrange}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t.admin.catalogIntro}</p>
        <Link
          href={localePath(locale, "/vehicles")}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-red transition-colors duration-200 hover:underline"
        >
          {t.admin.viewSite}
          <IconArrowRight size={15} />
        </Link>
      </div>

      <CatalogOrder locale={locale} vehicles={vehicles} pinned={pinned} limit={CATALOG_PIN_LIMIT} />
    </div>
  );
}
