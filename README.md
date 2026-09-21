# Autohaus Motion

Vehicle sales and long-term rental site for **Autohaus Motion GmbH** (Bundesstraße 124, 52159 Roetgen).
Public catalogue in six languages, plus a full back office for adding vehicles, managing sale
statuses, handling enquiries and assigning staff roles.

> Hosting: **Cloudflare Workers** — see [Deploying](#deploying-free-commercial-use-allowed).
> Requires **Node 22+** (`nvm use`).

## Stack

| Layer     | Choice                                           |
| --------- | ------------------------------------------------ |
| Framework | Next.js 15 (App Router, React 19, server actions) |
| Language  | TypeScript                                        |
| Styling   | Tailwind CSS v4 with brand tokens in `globals.css` |
| Database  | PostgreSQL (Neon) via Prisma 6 + driver adapter    |
| Auth      | JWT session cookie (`jose`) + bcrypt password hashes |
| Uploads   | Cloudflare R2 in production, local filesystem in development |

## Getting started

```bash
npm install
cp .env.example .env     # then put a Postgres URL in DATABASE_URL
npm run db:migrate       # creates the schema
npm run db:seed          # demo catalogue, staff accounts and leads
npm run dev
```

Open http://localhost:3000 — you are redirected to your browser's language.

Postgres is required even locally, because Prisma cannot switch provider per
environment. A free [Neon](https://neon.com) database takes a couple of minutes
and works for both development and production. Uploads stay on your local disk
until `BLOB_READ_WRITE_TOKEN` is set, so development needs no storage account.

### Demo accounts

The seed sets one password for all of them, printed by `npm run seed` when
it runs. It is a development convenience: change it before the site is
reachable from the internet, and never publish it — this file is in a
public repository.

| Email                           | Role          | Can do                                              |
| ------------------------------- | ------------- | --------------------------------------------------- |
| `admin@autohaus-motion.de`      | Administrator | Everything, including users and roles                |
| `manager@autohaus-motion.de`    | Manager       | Whole catalogue, rental offers, all leads, delete    |
| `commercial@autohaus-motion.de` | Sales advisor | Own listings, sale statuses (red badges), leads      |
| `sales@autohaus-motion.de`      | Sales advisor | Same, scoped to their own vehicles                   |
| `viewer@autohaus-motion.de`     | Viewer        | Read-only back office                                |

> Change these before deploying. `AUTH_SECRET` in `.env` must also be replaced with a random value.

## Languages

English, French, German, Chinese (Simplified), Arabic (RTL) and Spanish.

- Routes are prefixed with the locale: `/fr/vehicles`, `/ar/rental`, …
- `src/middleware.ts` picks a locale from the `NEXT_LOCALE` cookie, then `Accept-Language`,
  then falls back to French.
- UI copy lives in `src/i18n/dictionaries/<locale>.ts`. English is the typed source of
  truth — adding a key there makes TypeScript require it in the other five files.
- Vehicle taxonomy (body types, fuels, equipment, statuses, roles) is translated once in
  `src/lib/taxonomy.ts`, in compact `[key, en, fr, de, zh, ar, es]` tuples.
- Each vehicle carries its own per-language headline and description, entered on the
  **Descriptions** tab of the vehicle form. Empty languages fall back to English.
- Arabic sets `dir="rtl"` on `<html>`; layout uses logical properties (`ps-*`, `me-*`,
  `start-*`) so it mirrors without a separate stylesheet.

## Roles and permissions

Defined in one place: `src/lib/rbac.ts`.

| Permission           | Admin | Manager | Sales | Viewer |
| -------------------- | :---: | :-----: | :---: | :----: |
| Access back office   |   ●   |    ●    |   ●   |   ●    |
| Create vehicles      |   ●   |    ●    |   ●   |        |
| Edit any vehicle     |   ●   |    ●    |       |        |
| Edit own vehicles    |   ●   |    ●    |   ●   |        |
| Delete vehicles      |   ●   |    ●    |       |        |
| Publish / unpublish  |   ●   |    ●    |   ●   |        |
| Set sale status      |   ●   |    ●    |   ●   |        |
| Read leads           |   ●   |    ●    |   ●   |   ●    |
| Update leads         |   ●   |    ●    |   ●   |        |
| Delete leads         |   ●   |         |       |        |
| Manage users & roles |   ●   |         |       |        |
| Activity log         |   ●   |    ●    |       |        |

Permissions are enforced server-side in every server action, not only hidden in the UI.
The last active administrator cannot be deleted, deactivated or demoted.

## Sale status — the red badge

Every listing carries one of four statuses, set from the vehicle form's **Publication**
tab or in one click from the admin vehicle table:

| Status        | Public badge                        | Colour |
| ------------- | ----------------------------------- | ------ |
| `AVAILABLE`   | none                                | —      |
| `RESERVED`    | "Sale in progress" / "En cours de vente" | deep red |
| `SOLD`        | "Sold" / "Vendu" + diagonal stamp over the photo | red |
| `COMING_SOON` | "Coming soon"                       | gold   |

Sold and reserved cars stay online (good for SEO and for capturing backup interest) but
sink to the bottom of listings and show a notice on their detail page.

## Adding a vehicle

`/<locale>/admin/vehicles/new`. The form is split into twelve categorised sections:

1. **Identity** — make, model, version, year, VIN, stock reference, URL slug, location
2. **Classification** — body type, condition, segment
3. **Powertrain** — fuel, gearbox, gears, drivetrain, displacement, cylinders, hp/kW, torque, 0–100, top speed
4. **Consumption & emissions** — WLTP figures, CO₂, emission class, energy label, battery, range, charging
5. **Body & interior** — doors, seats, colours, paint finish, upholstery
6. **History & condition** — mileage, first registration, owners, service book, warranty, next inspection, accident-free, non-smoker, imported
7. **Pricing** — price, net price, previous price, VAT deductible, negotiable, financing
8. **Long-term rental** — monthly rate, deposit, first instalment, available durations and mileage packages
9. **Equipment** — 50 options across six groups, with select-all per group
10. **Photos & video** — drag-and-drop upload, reorder, pick the cover, video link
11. **Descriptions** — headline and body text per language, with a dot marking filled languages
12. **Publication** — sale status, visibility, home-page feature, assigned advisor

Reference and slug generate themselves if left empty, and clashes are resolved automatically.

## Long-term rental

`/<locale>/rental` explains the offer, lists rental-ready vehicles and includes an
estimator (duration 24–60 months, 10–30k km/year, adjustable deposit) that pre-fills the
enquiry form. A vehicle appears there as soon as **Offer this vehicle for long-term
rental** is ticked on its form.

The estimate formula lives in `estimateMonthly()` in `src/lib/utils.ts` — replace it with
your leasing partner's real grid before quoting customers.

## Project layout

```
prisma/
  schema.prisma          data model
  seed.mjs               demo data + generated placeholder imagery
src/
  app/
    [locale]/
      (site)/            public pages: home, vehicles, rental, about, contact, legal
      admin/             back office: dashboard, vehicles, leads, users, activity
      login/
      layout.tsx         root layout (html lang + dir)
    actions/             server actions: vehicles, leads, users, auth
    api/upload/          image upload endpoint
  components/            UI, including admin/ subfolder
  i18n/                  locale config + six dictionaries
  lib/                   prisma, auth, rbac, taxonomy, vehicle queries, helpers
  middleware.ts          locale detection and redirect
```

## Before going live

- [x] Prisma datasource switched to Postgres, initial migration committed
- [x] Uploads behind a storage adapter — Vercel Blob in production
- [x] `AUTH_SECRET` validated at boot; a placeholder or short value refuses to start
- [ ] Set a fresh `AUTH_SECRET` in the host's environment variables
- [ ] Change every seeded password, or delete the demo accounts
- [ ] Wire real email delivery for new leads (currently stored in the database only)
- [ ] Complete `/legal/imprint`, `/legal/privacy` and `/legal/terms` — German law (TMG §5,
      DSGVO) prescribes mandatory content, and the current text is a placeholder
- [ ] Replace the seeded placeholder graphics with real photography
- [ ] Set the real phone number and email in `COMPANY` (`src/lib/utils.ts`)

## Deploying (free, commercial use allowed)

Runs on **Cloudflare Workers**, whose free plan permits commercial use — unlike
Vercel's Hobby plan.

| Piece | Service | Free tier |
| --- | --- | --- |
| Hosting | Cloudflare Workers | 100k requests/day |
| Database | Neon Postgres | free tier |
| Image uploads | Cloudflare R2 | 10 GB storage, no egress fees |
| URL | `autohaus-motion.<you>.workers.dev` | free, HTTPS included |

#### Bundle size — the one real constraint

The free Workers plan caps a script at **3 MB gzipped**. This app measures:

| Part | gzipped |
| --- | --- |
| Application code | 1697 KiB |
| Prisma WASM query engine | 866 KiB |
| **Total** | **2564 KiB** (83% of the limit) |

It fits, with roughly 500 KiB spare. Prisma's WASM engine is the single
biggest item and is unavoidable while Prisma runs on Workers. Re-check after
adding any sizeable dependency:

```bash
npm run cf:build && npx wrangler deploy --dry-run --outdir=.wrangler-dryrun
```

If it ever exceeds the limit, in increasing order of effort: upgrade to Workers
Paid ($5/month, 10 MB limit); move Prisma behind Accelerate, which replaces the
WASM engine with a thin client; or drop Prisma on the Worker and query Neon
directly with SQL.

### Requirements

Wrangler needs **Node 22+**. The repo pins it in `.nvmrc`:

```bash
nvm use        # picks up .nvmrc
```

### 1. Database

Create a free Postgres at [neon.com](https://neon.com) and copy the **pooled**
connection string. Then create the schema and the first accounts:

```bash
echo 'DATABASE_URL="<your neon url>"' >> .env
npm run db:deploy    # creates every table
npm run db:seed      # demo catalogue + staff accounts
```

### 2. Cloudflare account and media bucket

R2 has to be switched on from the Cloudflare dashboard first. It is an
account-level one-off that the API cannot do for you — every bucket command
fails with code 10042 until someone clicks it. After that:

```bash
npx wrangler login
npx wrangler r2 bucket create autohaus-motion-media
npx wrangler r2 bucket dev-url enable autohaus-motion-media
```

The last command prints the `https://pub-….r2.dev` address that serves the
vehicle photos. It is what `R2_PUBLIC_URL` below must be set to. Until the
bucket and that secret exist, the site runs fine but adding a photo fails with
a storage error.

### 3. Secrets

Never in `wrangler.jsonc` — that file is committed.

```bash
npx wrangler secret put DATABASE_URL     # the Neon pooled URL
npx wrangler secret put AUTH_SECRET      # see below
npx wrangler secret put R2_PUBLIC_URL    # the pub-….r2.dev address
```

Generate a fresh `AUTH_SECRET` — not the one from your `.env`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

### 4. Deploy

```bash
npm run cf:deploy
```

The site comes up at `autohaus-motion.<your-subdomain>.workers.dev`.
**Sign in and change the seeded password immediately** — those credentials are
published in this README.

### Everyday workflow

```bash
npm run dev          # normal Next dev server, fast
npm run typecheck && npm run lint
node scripts/audit-locales.mjs    # cross-locale layout check
npm run cf:preview   # run the real Worker locally before shipping
npm run cf:deploy    # ship
```

`cf:preview` runs the actual Workers runtime, which is the only way to catch
Workers-specific problems before they are live. Use it whenever you touch
Prisma, uploads, or anything Node-flavoured.

Schema changes:

```bash
npm run db:migrate -- --name what_changed   # local, writes a migration
npm run db:deploy                           # apply to production
```

### Attaching autohaus-motion.com

`autohaus-motion.com` was registered at IONOS on 25 Aug 2026 and is parked —
nothing is served from it, so pointing it at the Worker breaks no live site.
(`autohaus-motion.de` runs a Wix site and is left alone for now.)

Cloudflare Workers custom domains require the zone to be on Cloudflare, so the
nameservers move from IONOS to Cloudflare. That means Cloudflare takes over
**all** DNS for the domain, including mail — so the existing records have to
come across or email stops.

#### DNS as it stands (captured before the move)

| Type | Name | Value | Keep? |
| --- | --- | --- | --- |
| A | `@` | `217.160.0.254` | ✗ IONOS parking — the Worker replaces it |
| AAAA | `@` | `2001:8d8:100f:f000::200` | ✗ same |
| MX | `@` | `10 mx00.ionos.de` | **✓ keep — email** |
| MX | `@` | `10 mx01.ionos.de` | **✓ keep — email** |
| TXT | `@` | `v=spf1 include:_spf-eu.ionos.com ~all` | **✓ keep — email** |
| CNAME | `autodiscover` | `adsredir.ionos.info` | **✓ keep — Outlook autoconfig** |
| CNAME | `_dmarc` | `dmarc.ionos.de` | **✓ keep — email** |

No CAA record, no DKIM record, and **no `www`** — `www.autohaus-motion.com`
does not currently resolve.

#### Steps

1. **Cloudflare → Add a site → `autohaus-motion.com` → Free plan.**
   Cloudflare scans IONOS and imports what it finds. Check every ✓ row above
   is present before continuing — this is the step where email gets lost.

2. **Delete the `A` and `AAAA` records** for `@`. They point at the IONOS
   parking page; the Worker takes over the apex.

3. **Confirm MX and the two CNAMEs are "DNS only"** (grey cloud, not orange).
   Cloudflare cannot proxy mail.

4. **IONOS → Domains → `autohaus-motion.com` → Nameservers**, replace the four
   `ui-dns.*` entries with the two Cloudflare gives you. Propagation is usually
   under an hour.

5. Once Cloudflare reports the zone **Active**:
   **Workers & Pages → autohaus-motion → Settings → Domains & Routes → Add
   custom domain** → `autohaus-motion.com`, then repeat for
   `www.autohaus-motion.com`.

6. Cloudflare issues the TLS certificate automatically. Neither domain serves
   working HTTPS today, so this is a real fix, not just a move.

#### Rolling back

Nameservers are the only destructive change. Putting the four `ui-dns.*`
entries back at IONOS restores the previous setup entirely. Keep the table
above until you are happy.

### Notes on the Cloudflare setup

**Prisma runs on its WASM engine.** Workers cannot open a raw TCP socket, so
queries go through Neon's serverless driver via `@prisma/adapter-neon`.
`serverExternalPackages` in `next.config.ts` keeps Next from bundling Prisma
with Node export conditions, which would otherwise pull in the native query
engine and fail at runtime.

**Images are served as uploaded.** Cloudflare's free plan has no image resizing
and next/image's optimiser cannot run in Workers, so `images.unoptimized` is
on. To compensate, the uploader downscales to 2000px and re-encodes to WebP
*in the browser* before anything is sent (`src/lib/image-resize.ts`). A 6 MB
phone photo becomes a few hundred KB, which keeps both R2 and page weight down.

**Uploads need no account locally.** `src/lib/storage.ts` writes to `public/`
when the R2 binding is absent, so `npm run dev` works with nothing configured.

## Project skills

`.claude/skills` holds 27 skills vendored from [ECC](https://github.com/affaan-m/ECC)
(MIT) covering React/Next.js, Prisma, accessibility, testing, security and deployment.
They are copied rather than installed as the full plugin, which would register hooks that
run around every tool call. See [`.claude/skills/README.md`](.claude/skills/README.md)
for what is included and why.

## Brand assets

The official logo you supplied lives at `public/brand/logo.jpg`. It is a 1500×1500
JPEG on a solid white ground, which does not sit well on the off-white canvas, so
`scripts/build-logo.mjs` derives the web assets from it:

| File | Size | Used for |
| --- | --- | --- |
| `logo-wordmark.png` | 1320×192 | Header, mobile drawer, admin sidebar |
| `logo-full.png` | 1328×542 | Loading screen, splash, footer, 404 |
| `logo-square.png` | 1024×1024 | Spare square lockup |
| `src/app/icon.png` | 512×512 | Browser tab / PWA icon |
| `src/app/apple-icon.png` | 180×180 | iOS home screen |
| `src/app/opengraph-image.png` | 1200×630 | Link previews |

The white ground is keyed out on the **minimum** RGB channel rather than luminance —
white has a high minimum, while the brand yellow `#FFC300` and red `#E30613` each have a
channel at or near zero, so the artwork survives untouched while the background goes
transparent. Edge pixels get a soft alpha ramp, so there is no jagged cutout.

Re-run after replacing the source artwork:

```bash
node scripts/build-logo.mjs
```

The `<Logo />` component takes `variant="wordmark" | "full"` and a size from `xs` to `xl`.
It is the only place the logo is referenced, so swapping the artwork is a one-file change.

> Note: the tagline baked into the artwork reads *"German compagny based in Frankfort"*.
> That looks like two typos — *company* and *Frankfurt*. I have left your file exactly as
> supplied; if you want it corrected, send a new version and re-run the script above.

## Loading screen

Two layers, both built on the full logo lockup over a progress bar in the flag colours:

- **Splash** (`components/splash-screen.tsx`) covers the first paint of the public site.
  It is deliberately CSS-only — no state, no effect, no `sessionStorage` — so it cannot
  cause a hydration mismatch and cannot get stuck: the animation ends at
  `visibility: hidden`, and it never takes pointer events, so the page underneath stays
  usable the whole time. Under `prefers-reduced-motion` it is not rendered at all.
- **Route loaders** (`loading.tsx` in `[locale]`, `[locale]/(site)` and `[locale]/admin`)
  show `<BrandLoader />` while a route streams. The site and admin versions sit inside
  their shells, so the header, footer and sidebar stay put rather than flashing away.

The admin has no splash — staff reload it constantly and a splash each time would grate.

## Profiles

`/<locale>/admin/profile`, reachable from the card at the bottom of the admin sidebar.
Every signed-in user can edit their own:

- Profile photo — uploaded to `public/avatars`, with replace and remove
- Full name, email address, phone, job title
- Interface language
- Password, behind the current password

Role and account status are deliberately **not** editable here; those stay with an
administrator on the Users & roles page. The action only ever writes to the caller's own
record, email uniqueness is re-checked on save, and a password change requires the
current password, a minimum of 8 characters and a matching confirmation.

Avatars appear in the admin sidebar, the users table, and next to the assigned advisor on
each public vehicle page.

## Cross-locale layout audit

Switching language changes every string length on the page, and two locales
(`zh`, `ar`) fall outside Playfair's Latin coverage. `scripts/audit-locales.mjs`
drives a real Chrome over **6 locales × 4 pages × 3 viewports** and fails on
anything that reads as broken alignment: viewport overflow, elements outside the
viewport, clipped text, header nav wrapping, header-height drift, buttons of
different heights sharing a line, off-centre flex rows, and which font family
actually resolved for headings.

```bash
npm run dev                      # in one terminal
node scripts/audit-locales.mjs   # add --width 375 for a single viewport
```

It found and drove the fix for seven real bugs:

| Bug | Cause |
| --- | --- |
| zh/ar headings used Playfair at 1.05 line-height | the locale override sat in `@layer base` while `.display` is in `@layer components`, so it lost the cascade and never applied |
| Buttons 2–3px taller in zh/ar | no fixed `line-height` on `.btn`, so CJK/Arabic glyphs raised the intrinsic line box above `min-height` |
| Header nav wrapped to two lines in fr/de/es | longer labels with no `whitespace-nowrap` |
| "Doppelkupplung" clipped in vehicle cards | `line-clamp-1` on a column too narrow for German |
| Porsche card overflowed in de/ar | price + struck-through old price + a wide power unit, with no `min-w-0` |
| Every locale overflowed at 375px | responsive grids fell back to an implicit `auto` column, which sizes to max-content; the logo was also a fixed 220px |
| Arabic showed "+400 2" | bidi moved the trailing `+` of "2 400+"; now isolated with `<bdi dir="ltr">` |

## Accessibility audit

`scripts/audit-a11y.mjs` runs axe-core over all six public pages in all six
locales, then adds the two things axe does not evaluate: target size
(SC 2.5.8) and a focus indicator you can actually see (SC 2.4.11).

```bash
node scripts/audit-a11y.mjs                              # the live site
node scripts/audit-a11y.mjs --base http://localhost:3000 # a local build
```

Two details in the harness matter, because both produced false readings before
they were handled. Entrance transitions run for 700ms after the splash clears,
and sampling before they settle reports contrast against a half-faded element
nobody ever sees — so the script scrolls the page and waits. And a focus ring
often sits on an ancestor rather than the focused element: a card whose title
link is stretched over it carries the outline itself.

The target-size check applies the two SC 2.5.8 exceptions, so it reports only
targets that genuinely fail: a stretched link is measured as the card it
covers, and a small target with nothing within 24px of it passes on spacing.

It found six real defects:

| Defect | Cause |
| --- | --- |
| No focus indicator on any vehicle card | the stretched title link carried `outline-none`, killing the global ring; the card, which is what the link covers, had none of its own |
| No focus indicator on the four home-page dropdowns | `.select:focus` set a deliberately transparent outline, leaving a 1px border tint and a 14%-opacity glow |
| Skip link moved the view but not the keyboard | `<main>` could not take focus, so the next Tab went back to the header |
| Skip link did nothing at all on the login page | that page's `<main>` had neither the id nor a tabindex |
| Step numerals at 1.42:1 against the canvas | `--color-line-strong` is a border colour, used as 48px text; large text needs 3:1 |
| Four small-text colours between 4.03:1 and 4.39:1 | `--color-subtle` fell short wherever it met a tinted panel, and the 10px rental labels were dimmed to 80% on top of being small |

Filter rows were also raised from 20px to the 24px minimum.

## Themes

Light is the default; the toggle in the header switches to dark and the choice
is remembered per browser. Only colours change — no layout, no components, no
type.

The dark neutrals stay warm. A blue-grey dark is the reflex and it fights the
stone palette the light theme is built on. The canvas is a charcoal rather
than a near-black, because anything translucent above a near-black — the
header once it starts blurring the page behind it, a chip laid on a photo —
has to be lifted so far to stay legible that it reads as a light patch instead
of the same surface. The spread from canvas to the highest surface is 2.9×,
which is what lets cards, inputs and menus separate without borders doing all
the work.

Brand red is the one colour that cannot invert. No single red carries 4.5:1 as
text on a dark canvas and also takes white text on top of it as a button — the
two pull luminance in opposite directions. So the fill keeps the exact brand
red and one rule swaps a lighter red wherever red is used as *text*. Red hover
brightens rather than darkens: on a dark surface a darker red reads as
disabled.

The first, near-black palette is kept as `[data-theme="dark1"]` in
`globals.css`. To ship it instead, swap which block owns the `dark` name.

Two things to watch when adding UI:

A hardcoded `bg-white`, `#fff` or `rgba(255,255,255,…)` is invisible in light
mode and glaring in dark. The header's scrolled state, the chips over a
vehicle photo and the sold stamp were each written that way and each had to be
moved onto a token.

The logo has a light-on-dark twin, swapped on a background image rather than
in React — a component reading the theme after hydration renders the wrong
mark for a frame, and the browser fetches only the variant whose rule applies.

Both palettes are audited:

```bash
node scripts/audit-a11y.mjs --theme dark
node scripts/audit-locales.mjs --base https://autohausmotion.com --theme dark
```

## Listing templates

Entering the tenth car of the same kind means retyping everything that is true
of all of them. A third button beside Save and Save draft keeps the current
values under a name, and a new listing can start from one.

A template holds every field except two groups. Photos, because they belong to
one car rather than to a kind of car. And the values that identify one specific
car — id, stock reference, slug, VIN — which would either clash with the car
the template came from or quietly label the new one as the old one. Publication
state is dropped too: a copy should not inherit "published".

The values are stored as JSON in one column rather than a column per field.
The form has some sixty of them and gains more over time; a column each would
mean a migration every time one is added.

Two things to know before changing it:

The picker applies a template by linking to `?template=<id>`, which the server
reads and hands to the form as ordinary defaults. That is deliberate — poking
values into the form from the client would miss the sections React drives from
state (equipment, rental, status). The form is keyed on the template id,
because picking one navigates within the same route: without the key React
reconciles the form already on screen, and an uncontrolled field that is
already mounted ignores a changed `defaultValue`. Text fields updated anyway;
every dropdown silently kept the previous car's value.

And the payload is read from `FormData`, which also carries React's own
server-action keys beginning with `$`. They are filtered out; anything else
added to the form is stored automatically.

## Database migrations

The Cloudflare build runs `prisma generate`, never `prisma migrate`. A schema
change therefore has to be applied to the database yourself, before the deploy
that depends on it lands:

```bash
npx prisma migrate dev --create-only --name what_changed  # write it
cat prisma/migrations/*_what_changed/migration.sql        # read it
npx prisma migrate deploy                                 # apply it
```

`migrate dev` without `--create-only` would run against whatever `DATABASE_URL`
points at, which locally is production. Create, read, then deploy.

## Sessions

Sessions are stateless JWTs in an httpOnly cookie, valid for seven days. That
means nothing server-side to look up on each request — and nothing to delete
when access should stop. `User.passwordChangedAt` closes that: `getCurrentUser`
refuses a token issued before it, so changing a password evicts every session
opened with the old one instead of leaving them live until they expire.

Anything that writes `passwordHash` must set `passwordChangedAt` alongside it,
and anything that changes the *current* user's password must call
`createSession` afterwards — otherwise the browser that just changed it signs
itself out on the next request.

## Search

`src/lib/seo.ts` holds the two things every public page needs: its canonical
URL with the six language alternates, and the structured data for what the
page is.

Next replaces `alternates` rather than merging it, so a page that sets only a
title inherits the layout's canonical — which points at the locale home page.
Every page below `[locale]/layout.tsx` therefore calls `pageAlternates(locale,
path)` with its own path. Leaving it out is silent: the page renders fine and
quietly tells search engines it is a duplicate of the home page.

`src/app/sitemap.ts` lists the eight static paths and every published listing,
in all six locales, each entry carrying its own alternates. Drafts and
unpublished listings are excluded — following one would be a soft 404. It is
`force-dynamic`, so a listing appears as soon as it is published.

`src/app/robots.ts` allows the public site and keeps crawlers out of `/api`,
the back office and the login page. The host appends its own content-signal
comments to whatever the origin serves; the directives still apply.

Structured data:

| Page | Schema | Why |
| --- | --- | --- |
| Home | `AutoDealer` | name, address and phone are what a local result is built from |
| Listing | `Vehicle` + `Offer` | puts price, year and mileage under the result instead of a bare link |
| Listing | `BreadcrumbList` | shows a path rather than a raw URL |

Titles and snippets live in `meta` in each dictionary, deliberately apart from
the on-screen copy: a subtitle that reads well above a heading is usually too
short to fill a result, and a heading long enough to be interesting gets cut
off at around 60 characters.

After a deploy that changes any of this, check the live pages rather than the
source — the canonical is the one thing a build will never warn you about:

```bash
curl -s https://autohausmotion.com/fr/vehicles | grep -o '<link rel="canonical"[^>]*>'
curl -s https://autohausmotion.com/sitemap.xml | grep -c '<loc>'
```

## Design notes

Light, editorial and premium — the showroom, not the pit lane.

**Palette.** Warm stone neutrals on an off-white canvas (`#fafaf9`), near-black text
(`#0c0a09`), and the brand colours used as accents rather than surfaces: signal red
`#c8102e` for actions and the sale badges, gold `#ca8a04` as fills with bronze `#8a6508`
as its readable text form. Every text colour clears WCAG AA on its background — measured,
not assumed:

| Pair | Ratio |
| --- | --- |
| Body text on canvas | 18.9:1 |
| Muted text on canvas | 7.3:1 |
| Subtle text on canvas | 4.6:1 |
| Red on canvas | 5.6:1 |
| Bronze on canvas | 5.1:1 |
| White on red button | 5.9:1 |
| Ink on gold fill | 6.0:1 |

**Type.** Playfair Display carries the display voice (`.display`), Inter carries the
interface and all data, and Barlow Condensed italic is reserved for the logo wordmark and
the "sold" rubber stamp — the one place the racing identity belongs. Playfair has no
Arabic or CJK coverage, so `html[lang="ar"]` and `html[lang="zh-Hans"]` fall back to Inter
with looser line height and no italics, set in `globals.css`.

**Surfaces.** White cards on the canvas, 1px hairline borders, 2–4px radii, and soft warm
shadows (`--shadow-xs` … `--shadow-lg`) that appear on hover rather than at rest.

**Layers.** All component CSS lives in `@layer components` so Tailwind utilities always
win over it — without that, a `hidden` or `w-full` on a `.btn` silently does nothing.

All motion is disabled under `prefers-reduced-motion`.
