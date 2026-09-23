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
import { IconUser, IconUsers, IconCheckCircle, IconEyeOff, IconCar } from "@/components/icons";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
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

  type Row = (typeof users)[number];

  /** The role picker, or the role as a label for someone who may not change it. */
  function roleControl(user: Row, isSelf: boolean) {
    if (!manage || isSelf) return <span className="chip">{label(ROLES, user.role, tax)}</span>;
    return (
      <form action={setUserRole} className="flex items-center gap-2">
        <input type="hidden" name="id" value={user.id} />
        <input type="hidden" name="locale" value={locale} />
        <select
          name="role"
          defaultValue={user.role}
          aria-label={`${t.admin.fRole} — ${user.name}`}
          className="select min-w-0 flex-1 py-1.5 text-sm xl:w-auto xl:min-w-[9rem] xl:flex-none"
        >
          {optionsFor(ROLES, tax)
            .filter((o) => (ROLE_KEYS as readonly string[]).includes(o.value))
            .map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
        </select>
        <button type="submit" className="btn btn-solid btn-sm min-h-11 cursor-pointer md:min-h-0">
          {t.common.save}
        </button>
      </form>
    );
  }

  /** Edit, switch on or off, delete — none of the last two on oneself or the last administrator. */
  function userActions(user: Row, isSelf: boolean, lastAdmin: boolean) {
    if (!manage) return null;
    return (
      <>
        <UserDialog
          locale={locale}
          trigger="icon"
          user={{
            id: user.id, name: user.name, email: user.email, role: user.role,
            phone: user.phone, jobTitle: user.jobTitle, active: user.active,
          }}
        />
        {!isSelf && !lastAdmin ? (
          <form action={toggleUserActive}>
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="locale" value={locale} />
            <button
              type="submit"
              title={user.active ? t.admin.fActive : t.admin.draft}
              aria-label={user.active ? t.admin.fActive : t.admin.draft}
              aria-pressed={user.active}
              className={cn(
                "inline-flex min-h-11 min-w-11 cursor-pointer items-center justify-center rounded-sm transition-colors duration-200 md:min-h-9 md:min-w-9",
                user.active ? "text-ok hover:bg-ok/12" : "text-subtle hover:text-fg",
              )}
            >
              {user.active ? <IconCheckCircle size={17} /> : <IconEyeOff size={17} />}
            </button>
          </form>
        ) : null}
        {!isSelf && !lastAdmin ? (
          <form action={deleteUser}>
            <input type="hidden" name="id" value={user.id} />
            <input type="hidden" name="locale" value={locale} />
            <ConfirmSubmit compact label={`${t.common.delete} — ${user.name}`} confirm={t.admin.confirmDelete} />
          </form>
        ) : null}
      </>
    );
  }

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

      {/* Phones and tablets: one card per account. */}
      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:hidden">
        {users.map((user) => {
          const isSelf = user.id === actor.id;
          const lastAdmin = user.role === "ADMIN" && user.active && activeAdmins <= 1;
          return (
            <li key={user.id}>
              <article className={cn("flex h-full flex-col rounded-sm border border-line bg-surface", !user.active && "opacity-70")}>
                <div className="flex items-start gap-3 p-4">
                  <Avatar url={user.avatarUrl} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-fg">
                      {user.name}
                      {isSelf ? <span className="ms-1.5 chip">{t.admin.you}</span> : null}
                    </p>
                    <p className="truncate text-xs text-subtle">{user.email}</p>
                    {user.jobTitle ? <p className="truncate text-xs text-subtle">{user.jobTitle}</p> : null}
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted tabular-nums">
                      <span className="inline-flex items-center gap-1.5">
                        <IconCar size={13} className="text-subtle" />
                        {user._count.vehicles} / {user._count.leads}
                      </span>
                      <span>
                        {t.admin.lastLogin}: {user.lastLoginAt ? formatDate(user.lastLoginAt, locale) : t.admin.never}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="border-t border-line px-4 py-3">{roleControl(user, isSelf)}</div>
                <div className="mt-auto flex items-center justify-end gap-1 border-t border-line px-2 py-1.5">
                  {userActions(user, isSelf, lastAdmin)}
                </div>
              </article>
            </li>
          );
        })}
      </ul>

      <div className="hidden overflow-hidden rounded-sm border border-line bg-surface xl:block">
        <table className="w-full text-sm">
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
                      <Avatar url={user.avatarUrl} size={36} />
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
                  <td className="px-4 py-3">{roleControl(user, isSelf)}</td>
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
                    <div className="flex items-center justify-end gap-1">{userActions(user, isSelf, lastAdmin)}</div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Avatar({ url, size = 44 }: { url: string | null; size?: number }) {
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-surface-3 text-muted"
      style={{ width: size, height: size }}
    >
      {url ? <Image src={url} alt="" fill sizes={`${size}px`} className="object-cover" /> : <IconUser size={Math.round(size * 0.42)} />}
    </span>
  );
}
