import { prisma } from "./prisma";
import type { Locale } from "./taxonomy";
import { ageFrom, parseAboutCopy, pickCopyIn } from "./team-copy";

export { ageFrom, parseAboutCopy, pickCopy, pickCopyIn, readBirthDate, ROLE_MAX, TAGLINE_MAX } from "./team-copy";
export type { AboutCopy } from "./team-copy";

/**
 * The team section of the About page.
 *
 * Which accounts appear, and in what order, is `User.aboutRank`, set by an
 * administrator. What is published of each person is deliberately short —
 * a name, a function, an age and one line — and never the e-mail or phone
 * the account also holds: those reach a visitor through the contact form.
 */

export type TeamMember = {
  id: string;
  name: string;
  avatarUrl: string | null;
  role: string | null;
  tagline: string | null;
  /**
   * The language each text is written in, when it is not the page's own —
   * a profile written once in French shows in French everywhere, and the
   * page has to say so for a screen reader to pronounce it.
   */
  roleLang: Locale | null;
  taglineLang: Locale | null;
  age: number | null;
};

/**
 * The people shown on the About page, in the order chosen for them.
 *
 * Only active accounts: someone who has left the company is switched off in
 * the back office, and must leave the public page at the same moment rather
 * than when somebody remembers to take them down.
 */
export async function getPublicTeam(locale: Locale): Promise<TeamMember[]> {
  const rows = await prisma.user.findMany({
    where: { active: true, aboutRank: { not: null } },
    orderBy: { aboutRank: "asc" },
    select: { id: true, name: true, avatarUrl: true, jobTitle: true, birthDate: true, aboutCopy: true },
  });

  return rows.map((row) => {
    const copy = parseAboutCopy(row.aboutCopy);
    const role = pickCopyIn(copy, locale, "role");
    const tagline = pickCopyIn(copy, locale, "tagline");
    return {
      id: row.id,
      name: row.name,
      avatarUrl: row.avatarUrl,
      // The title on the account is the last resort, and its language is
      // unknown, so it is not marked.
      role: role?.text ?? row.jobTitle ?? null,
      roleLang: role && role.locale !== locale ? role.locale : null,
      tagline: tagline?.text ?? null,
      taglineLang: tagline && tagline.locale !== locale ? tagline.locale : null,
      age: row.birthDate ? ageFrom(row.birthDate) : null,
    };
  });
}
