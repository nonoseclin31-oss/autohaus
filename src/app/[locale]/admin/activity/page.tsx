import { redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath, formatDate } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { IconActivity, IconUser } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const t = getDictionary(locale);
  const user = (await getCurrentUser())!;

  if (!can(user.role, "activity.read")) redirect(localePath(locale, "/admin"));

  const entries = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    include: { user: { select: { name: true, role: true } } },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="display text-3xl">{t.admin.activity}</h1>
        <p className="mt-1 text-sm text-muted tabular-nums">
          {entries.length} {t.common.results}
        </p>
      </div>

      {entries.length ? (
        <ol className="overflow-hidden rounded-sm border border-line bg-surface">
          {entries.map((entry) => (
            <li
              key={entry.id}
              className="flex items-start gap-3 border-b border-line px-4 py-3 last:border-b-0"
            >
              <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-2 text-subtle">
                <IconUser size={14} />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm">
                  <strong className="font-semibold text-fg">{entry.user?.name ?? "—"}</strong>{" "}
                  <code className="rounded-sm bg-surface-2 px-1.5 py-0.5 font-mono text-xs text-muted">
                    {entry.action}
                  </code>
                  {entry.summary ? <span className="ms-1.5 text-muted">{entry.summary}</span> : null}
                </p>
                <p className="mt-0.5 text-xs text-subtle">
                  {entry.entity}
                  {entry.entityId ? ` · ${entry.entityId.slice(0, 10)}` : ""}
                </p>
              </div>

              <time
                className="shrink-0 text-xs text-subtle tabular-nums"
                dateTime={entry.createdAt.toISOString()}
              >
                {formatDate(entry.createdAt, locale, {
                  day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit",
                })}
              </time>
            </li>
          ))}
        </ol>
      ) : (
        <div className="flex flex-col items-center gap-3 rounded-sm border border-line bg-surface px-6 py-20 text-center">
          <IconActivity size={44} className="text-subtle" />
          <p className="text-muted">{t.admin.noData}</p>
        </div>
      )}
    </div>
  );
}
