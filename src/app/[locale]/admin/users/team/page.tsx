import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { getDictionary, resolveLocale, localePath } from "@/i18n";
import { parseAboutCopy } from "@/lib/team";
import { AboutTeam, type TeamPerson } from "@/components/admin/about-team";
import { IconArrowLeft, IconArrowRight, IconInfo } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminAboutTeamPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);

  const user = await getCurrentUser();
  if (!user) redirect(localePath(locale, "/login"));
  // Putting a colleague on the public site is the administrator's call —
  // the same permission that creates and removes accounts.
  if (!can(user.role, "user.manage")) redirect(localePath(locale, "/admin"));

  // Active accounts only: a deactivated one has left the page along with the
  // company, and offering it here would let someone put them back by mistake.
  const rows = await prisma.user.findMany({
    where: { active: true },
    orderBy: [{ aboutRank: { sort: "asc", nulls: "last" } }, { name: "asc" }],
    select: {
      id: true, name: true, jobTitle: true, avatarUrl: true,
      birthDate: true, aboutCopy: true, aboutRank: true,
    },
  });

  const people: TeamPerson[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    jobTitle: row.jobTitle,
    avatarUrl: row.avatarUrl,
    birthDate: row.birthDate ? row.birthDate.toISOString().slice(0, 10) : "",
    copy: parseAboutCopy(row.aboutCopy),
  }));

  const shown = rows.filter((row) => row.aboutRank !== null).map((row) => row.id);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href={localePath(locale, "/admin/users")}
          className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-muted transition-colors duration-200 hover:text-fg"
        >
          <IconArrowLeft size={15} />
          {t.admin.users}
        </Link>
        <h1 className="display mt-2 text-3xl">{t.admin.teamArrange}</h1>
        <p className="mt-1 max-w-2xl text-sm text-muted">{t.admin.teamIntro}</p>
        <p className="mt-3 flex max-w-2xl items-start gap-2 text-sm text-bronze">
          <IconInfo size={16} className="mt-0.5 shrink-0" />
          {t.admin.teamConsent}
        </p>
        <Link
          href={localePath(locale, "/about")}
          className="mt-3 inline-flex cursor-pointer items-center gap-1.5 text-sm font-semibold text-red transition-colors duration-200 hover:underline"
        >
          {t.admin.viewSite}
          <IconArrowRight size={15} />
        </Link>
      </div>

      <AboutTeam locale={locale} people={people} shown={shown} />
    </div>
  );
}
