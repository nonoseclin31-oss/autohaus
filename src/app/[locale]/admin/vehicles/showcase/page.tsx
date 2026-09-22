import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getDictionary, resolveLocale, localePath, formatCurrency, formatNumber } from "@/i18n";
import { HomeShowcase, type ShowcaseOption } from "@/components/admin/home-showcase";
import { HERO_RANK, HOME_GRID_SIZE } from "@/lib/vehicles";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminShowcasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));
  // Arranging the shop window is a decision about the whole catalogue, not
  // about one listing, so it follows the catalogue-wide permission.
  if (!can(user.role, "vehicle.update.any")) redirect(localePath(locale, "/admin/vehicles"));

  // Only a published, unsold listing can be put on the home page — offering
  // the others would let someone place a car the page then filters out.
  const rows = await prisma.vehicle.findMany({
    where: { published: true, status: { not: "SOLD" } },
    orderBy: [{ homeRank: "asc" }, { featured: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, brand: true, model: true, version: true, year: true,
      price: true, mileage: true, homeRank: true,
      images: { orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
    },
  });

  const vehicles: ShowcaseOption[] = rows.map((row) => ({
    id: row.id,
    name: [row.brand, row.model, row.version].filter(Boolean).join(" "),
    detail: `${row.year} · ${formatCurrency(row.price, locale)} · ${formatNumber(row.mileage, locale)} ${t.common.km}`,
    coverUrl: row.images[0]?.url ?? null,
  }));

  const hero = rows.find((row) => row.homeRank === HERO_RANK)?.id ?? "";
  const slots = Array.from(
    { length: HOME_GRID_SIZE },
    (_, index) => rows.find((row) => row.homeRank === index + 1)?.id ?? "",
  );

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
        <h1 className="display mt-2 text-3xl">{t.admin.homeArrange}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t.admin.homeIntro}</p>
        <Link
          href={localePath(locale)}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-red transition-colors duration-200 hover:underline"
        >
          {t.admin.viewSite}
          <IconArrowRight size={15} />
        </Link>
      </div>

      <HomeShowcase locale={locale} vehicles={vehicles} hero={hero} slots={slots} />
    </div>
  );
}
