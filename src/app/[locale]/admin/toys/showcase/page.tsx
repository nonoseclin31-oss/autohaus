import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getDictionary, resolveLocale, localePath, formatCurrency } from "@/i18n";
import { ToyShowcase, type ToyShowcaseOption } from "@/components/admin/toy-showcase";
import { TOY_HERO_RANK, TOYS_GRID_SIZE } from "@/lib/toys";
import { label, TOY_KINDS, type Locale as TaxLocale } from "@/lib/taxonomy";
import { IconArrowLeft, IconArrowRight } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminToyShowcasePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  const tax = locale as TaxLocale;
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));
  // Arranging the shop window is a decision about the whole catalogue, not
  // about one listing, so it follows the catalogue-wide permission.
  if (!can(user.role, "vehicle.update.any")) redirect(localePath(locale, "/admin/toys"));

  // Only a published, unsold piece can sit at the top of the page — offering
  // the others would let someone place one the page then filters out.
  const rows = await prisma.toy.findMany({
    where: { published: true, status: { not: "SOLD" } },
    orderBy: [{ homeRank: "asc" }, { featured: "desc" }, { createdAt: "desc" }],
    select: {
      id: true, kind: true, brand: true, model: true, version: true, year: true,
      price: true, homeRank: true,
      images: { orderBy: [{ isCover: "desc" }, { position: "asc" }], take: 1, select: { url: true } },
    },
  });

  const toys: ToyShowcaseOption[] = rows.map((row) => ({
    id: row.id,
    name: [row.brand, row.model, row.version].filter(Boolean).join(" "),
    detail: `${label(TOY_KINDS, row.kind, tax)} · ${row.year} · ${formatCurrency(row.price, locale)}`,
    coverUrl: row.images[0]?.url ?? null,
  }));

  const hero = rows.find((row) => row.homeRank === TOY_HERO_RANK)?.id ?? "";
  const slots = Array.from(
    { length: TOYS_GRID_SIZE },
    (_, index) => rows.find((row) => row.homeRank === index + 1)?.id ?? "",
  );

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={localePath(locale, "/admin/toys")}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted transition-colors duration-200 hover:text-fg"
        >
          <IconArrowLeft size={15} />
          {t.admin.toys}
        </Link>
        <h1 className="display mt-2 text-3xl">{t.admin.toyArrange}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t.admin.toyIntro}</p>
        <Link
          href={localePath(locale, "/big-toys")}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-bronze transition-colors duration-200 hover:underline"
        >
          {t.admin.viewSite}
          <IconArrowRight size={15} />
        </Link>
      </div>

      <ToyShowcase locale={locale} toys={toys} hero={hero} slots={slots} />
    </div>
  );
}
