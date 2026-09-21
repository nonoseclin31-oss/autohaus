import { redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath, formatDate } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProfileForm } from "@/components/admin/profile-form";

export const dynamic = "force-dynamic";

export default async function ProfilePage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);

  const session = await getCurrentUser();
  if (!session) redirect(localePath(locale, "/login"));

  const user = await prisma.user.findUnique({
    where: { id: session.id },
    select: {
      id: true, name: true, email: true, phone: true, jobTitle: true,
      avatarUrl: true, role: true, locale: true, createdAt: true,
    },
  });
  if (!user) redirect(localePath(locale, "/login"));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="display text-3xl">{t.profile.title}</h1>
        <p className="mt-2 text-muted">{t.profile.subtitle}</p>
        <p className="mt-1 text-xs text-subtle">
          {t.profile.memberSince} {formatDate(user.createdAt, locale, { month: "long", year: "numeric" })}
        </p>
      </div>

      <ProfileForm
        locale={locale}
        user={{
          id: user.id,
          name: user.name,
          email: user.email,
          phone: user.phone,
          jobTitle: user.jobTitle,
          avatarUrl: user.avatarUrl,
          role: user.role,
          locale: user.locale,
        }}
      />
    </div>
  );
}
