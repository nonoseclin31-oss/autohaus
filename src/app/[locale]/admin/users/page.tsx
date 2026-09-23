import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getDictionary, resolveLocale, localePath, formatDate } from "@/i18n";
import { getCurrentUser } from "@/lib/auth";
import { can, ROLE_KEYS } from "@/lib/rbac";
import { prisma } from "@/lib/prisma";
import { label, ROLES, optionsFor, type Locale as TaxLocale } from "@/lib/taxonomy";
import { setUserRole, toggleUserActive, deleteUser } from "@/app/actions/users";
import { UserDialog, RoleLegend } from "@/components/admin/user-dialog";
import { IconUser, IconUsers, IconTrash, IconCheckCircle, IconEyeOff, IconCar } from "@/components/icons";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminUsersPage({ params }: { params: Promise<{ locale: string }> }) {
  const locale = resolveLocale((await params).locale);
  const tax = locale as TaxLocale;
  const t = getDictionary(locale);
  const actor = await getCurrentUser();
  // The layout redirects signed-out visitors, but a page renders in
  // parallel with its layout, so it has to guard for itself.
  if (!actor) redirect(localePath(locale, "/login"));

  if (!can(actor.role, "user.read")) redirect(localePath(locale, "/admin"));
  const manage = can(actor.role, "user.manage");

  const users = await prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }],
    include: { _count: { select: { vehicles: true, leads: true } } },
  });

  const activeAdmins = users.filter((u) => u.role === "ADMIN" && u.active).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display text-3xl">{t.admin.users}</h1>
          <p className="mt-1 text-sm text-muted tabular-nums">
            {users.length} {t.common.results}
          </p>
        </div>
        {manage ? (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={localePath(locale, "/admin/users/team")}
              className="btn btn-solid cursor-pointer"
            >
              <IconUsers size={17} />
              {t.admin.teamPage}
            </Link>
            <UserDialog locale={locale} />
          </div>
        ) : null}
      </div>

      <RoleLegend locale={locale} />

      <div className="overflow-hidden rounded-sm border border-line bg-surface">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[52rem] text-sm">
            <caption className="sr-only">{t.admin.users}</caption>
            <thead>
              <tr className="border-b border-line bg-surface-2">
                <th scope="col" className="px-4 py-3 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                  {t.admin.fName}
                </th>
                <th scope="col" className="px-4 py-3 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                  {t.admin.fRole}
                </th>
                <th scope="col" className="px-4 py-3 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                  {t.admin.vehicles} / {t.admin.leads}
                </th>
                <th scope="col" className="px-4 py-3 text-start text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                  {t.admin.lastLogin}
                </th>
                <th scope="col" className="px-4 py-3 text-end text-[0.6875rem] font-semibold uppercase tracking-[0.12em] text-subtle">
                  {t.common.actions}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--color-line)]">
              {users.map((user) => {
                const isSelf = user.id === actor.id;
                const lastAdmin = user.role === "ADMIN" && user.active && activeAdmins <= 1;

                return (
                  <tr key={user.id} className={cn("transition-colors duration-150 hover:bg-surface-2", !user.active && "opacity-60")}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <span className="relative flex size-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-muted">
                          {user.avatarUrl ? (
                            <Image src={user.avatarUrl} alt="" fill sizes="36px" className="object-cover" />
                          ) : (
                            <IconUser size={16} />
                          )}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate font-semibold text-fg">
                            {user.name}
                            {isSelf ? <span className="ms-1.5 chip">{t.admin.you}</span> : null}
                          </p>
                          <p className="truncate text-xs text-subtle">{user.email}</p>
                          {user.jobTitle ? <p className="truncate text-xs text-subtle">{user.jobTitle}</p> : null}
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-3">
                      {manage && !isSelf ? (
                        <form action={setUserRole} className="flex items-center gap-2">
                          <input type="hidden" name="id" value={user.id} />
                          <input type="hidden" name="locale" value={locale} />
                          <select
                            name="role"
                            defaultValue={user.role}
                            aria-label={`${t.admin.fRole} — ${user.name}`}
                            className="select w-auto min-w-[9rem] py-1.5 text-sm"
                          >
                            {optionsFor(ROLES, tax)
                              .filter((o) => (ROLE_KEYS as readonly string[]).includes(o.value))
                              .map((o) => (
                                <option key={o.value} value={o.value}>{o.label}</option>
                              ))}
                          </select>
                          <button type="submit" className="btn btn-solid btn-sm cursor-pointer">
                            {t.common.save}
                          </button>
                        </form>
                      ) : (
                        <span className="chip">{label(ROLES, user.role, tax)}</span>
                      )}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5 text-xs text-muted tabular-nums">
                        <IconCar size={13} className="text-subtle" />
                        {user._count.vehicles} / {user._count.leads}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-xs text-muted tabular-nums">
                      {user.lastLoginAt ? formatDate(user.lastLoginAt, locale, {
                        day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
                      }) : t.admin.never}
                    </td>

                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {manage ? (
                          <UserDialog
                            locale={locale}
                            trigger="icon"
                            user={{
                              id: user.id, name: user.name, email: user.email, role: user.role,
                              phone: user.phone, jobTitle: user.jobTitle, active: user.active,
                            }}
                          />
                        ) : null}

                        {manage && !isSelf && !lastAdmin ? (
                          <form action={toggleUserActive}>
                            <input type="hidden" name="id" value={user.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <button
                              type="submit"
                              title={user.active ? t.admin.fActive : t.admin.draft}
                              aria-label={user.active ? t.admin.fActive : t.admin.draft}
                              className={cn(
                                "cursor-pointer rounded-sm p-2 transition-colors duration-200",
                                user.active ? "text-ok hover:bg-ok/12" : "text-subtle hover:text-fg",
                              )}
                            >
                              {user.active ? <IconCheckCircle size={16} /> : <IconEyeOff size={16} />}
                            </button>
                          </form>
                        ) : null}

                        {manage && !isSelf && !lastAdmin ? (
                          <form action={deleteUser}>
                            <input type="hidden" name="id" value={user.id} />
                            <input type="hidden" name="locale" value={locale} />
                            <button
                              type="submit"
                              title={t.common.delete}
                              aria-label={`${t.common.delete} — ${user.name}`}
                              className="cursor-pointer rounded-sm p-2 text-subtle transition-colors duration-200 hover:bg-red/12 hover:text-red"
                            >
                              <IconTrash size={16} />
                            </button>
                          </form>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
