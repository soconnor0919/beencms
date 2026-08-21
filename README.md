# hadlockCMS

A white-label Next.js content management engine by Hadlock Technologies. Fork once, power any number of client sites.

## What's included

- Block-based page editor with hero media, dynamic feeds, FAQs, testimonials, video, forms, and more
- Gallery and portfolio blocks for photography, technical work, and project case studies, with filtering, responsive layouts, captions, metadata, and lightboxes
- Visual page editing with drag-and-drop sections, edit/split/preview modes, desktop/tablet/mobile canvases, draft autosave, manual save, keyboard shortcuts, undo/redo, duplication, and revision restore
- Five full-site starters plus tenant-scoped custom site templates captured from an existing workspace and staged safely as drafts
- Atomic site-wide publishing for pending page, post, program, and content-field drafts, with publication history, revisions, audit events, webhooks, and MCP control
- Custom-domain ownership verification with provider-neutral DNS TXT instructions; unverified hostnames never enter public tenant routing
- Draft/publish workflow with revision restore, page duplication, scheduled posts, and secure preview links
- Dynamic, nested, localized pages with review states, assignments, comments, editor locks, scheduling, and expiry
- Reusable sections, categories and tags, global content search, redirects, and a read-only content API
- Custom forms with submission queues, CSV export, email notifications, and webhooks
- Admin sections: team members, programs/companies, news and articles, calendar, contact inbox
- Calendar editor with draft/published events, a public events page, and a subscribable iCalendar feed
- Production media library with folders, search, bulk upload, alt/caption metadata, focal points, deduplication, storage quotas, and safe deletion checks
- Per-page SEO, social metadata, sitemap, robots rules, and structured data
- Cookieless first-party analytics with DNT/GPC respect, daily rotating visitor hashes, page/source/device trends, form conversions, retention controls, and MCP reporting
- Runtime color & font theming — changes without a rebuild
- shadcn-inspired Design Studio with live previews, seven theme presets, and five independent layout presets for business, editorial, photography, technical, and project portfolio sites
- Customizable palettes, font pairings, corners, button shapes, spacing, alignment, headers, and footers without replacing content
- Per-site onboarding for identity, theme, layout, starter homepage, navigation sections, and contact details
- Multiple independently routed sites with a workspace switcher, custom hostnames, isolated content and settings, and per-site memberships
- Per-site Free, Starter, Professional, and Business plans with Stripe Checkout, Customer Portal, signed idempotent webhooks, media quotas, member limits, and custom-domain enforcement
- Personal profiles with avatar, byline, biography, locale, timezone, notification preferences, password security, and 2FA
- Settings-driven navigation, footer, contact details, and accessible mobile menu
- Per-site roles: owner / admin / editor / reviewer / viewer
- SQLite + Drizzle ORM (zero ops, one-file DB)
- BetterAuth email/password sessions, expiring invitations, password recovery, roles, and optional TOTP two-factor authentication
- Local or S3-compatible media storage with atomic writes, magic-byte validation, EXIF-safe processing, responsive WebP/AVIF variants, dominant-color placeholders, and immutable caching
- Signed outbound webhooks, health endpoints, operation logs, portable content transfer, and consistent SQLite backups
- Bearer-authenticated MCP agent control with draft-first content mutations and auditing
- Dark mode
- Contact spam throttling, honeypot protection, notifications, and visitor confirmations

## Tech stack

Next.js · tRPC · Drizzle ORM · better-sqlite3 · BetterAuth · Tailwind v4 · shadcn/ui

## Quick start

Node.js 24 is recommended (see `.node-version`). Node.js 26 is not currently
supported by the pinned `better-sqlite3` release.

```bash
cp .env.example .env
# Fill in DATABASE_URL, BETTER_AUTH_SECRET, and BETTER_AUTH_URL
bun install
bun run db:push
bun run db:seed
bun run dev
```

Use `db:push` for a fresh development database. Deployments should run
`bun run db:migrate` before starting the new application version.

For a database created by an older pre-migration version, first make a backup,
then run:

```bash
bun run db:push
bun run db:baseline --confirm-schema-current
```

This records the current migration set without replaying it. Future releases can
then use `bun run db:migrate` normally.

## Operations

The Operations screen provides a consistent database download, portable content
export/import, webhook delivery history, and application error log. Restore a
database backup explicitly with:

```bash
bun run db:restore -- path/to/backup.sqlite --confirm-replace
```

Use `bun run db:backup -- /secure/path/backup.sqlite` for a consistent online
backup and `bun run db:check` for SQLite integrity and foreign-key checks. See
[the production runbook](./docs/PRODUCTION.md) for release, rollback, secrets,
storage, Stripe, monitoring, and restore procedures.

Media defaults to local storage. Set `STORAGE_DRIVER=s3` and the bucket,
endpoint, credentials, and public URL variables documented in `.env.example` to
use AWS S3, Cloudflare R2, Backblaze B2, MinIO, or another compatible provider.
Uploads are decoded with pixel limits, normalized for orientation, stripped of
embedded metadata, deduplicated by checksum per site, and converted into
responsive variants. Each site has an independently enforceable storage quota.

## Agent control with MCP

Generate a site-scoped token under **Integrations → Agent control with MCP**, or
set `HADLOCKCMS_MCP_TOKEN` as a platform fallback. Connect an MCP client to
`https://your-site.example/api/mcp` with an `Authorization: Bearer <token>`
header. When using a shared CMS hostname, also send
`x-hadlockcms-site: <workspace-slug>`. Keep tokens separate from user sessions
and store them in a secret manager. The server exposes page and post
drafting, explicit publishing and deletion, site settings, content search,
media metadata, forms, submission inspection, site templates, and publication
history, plus analytics reports and retention settings. Agents can stage a built-in full-site starter and atomically publish
all pending drafts; site-wide publishing requires an explicit `confirm: true`.
Mutations are recorded in the audit log.

## Custom domains

Save a hostname under **Integrations → Custom domain**. hadlockCMS generates a
unique TXT record at `_hadlockcms.<hostname>`. After that record is visible in
DNS, use **Verify DNS**. Public requests are routed to the site only after the
ownership record is verified; point the hostname's traffic record to the chosen
hosting installation separately.

## Resend email

After verifying a sending domain in Resend, configure:

```bash
EMAIL_PROVIDER="resend"
RESEND_API_KEY="re_xxxxxxxxx"
EMAIL_FROM="Website <noreply@example.com>"
EMAIL_TO="contact@example.com"
```

With `EMAIL_PROVIDER="auto"`, hadlockCMS prefers Resend when its API key and a
from address are present, then falls back to SMTP.

## Stripe billing

Billing is optional; without Stripe configuration, every site uses the Free
plan. Configure a least-privilege restricted Stripe key, webhook signing
secret, and recurring Price ID for each paid tier:

```bash
STRIPE_SECRET_KEY="rk_test_xxxxxxxxx"
STRIPE_WEBHOOK_SECRET="whsec_xxxxxxxxx"
STRIPE_PRICE_STARTER="price_xxxxxxxxx"
STRIPE_PRICE_PROFESSIONAL="price_xxxxxxxxx"
STRIPE_PRICE_BUSINESS="price_xxxxxxxxx"
```

Send Stripe events to `/api/stripe/webhook`. At minimum, subscribe to Checkout
Session completion and customer subscription lifecycle events. Configure the
Customer Portal separately in each Stripe sandbox and live mode. Taxes are not
enabled automatically; configure registrations and Stripe Tax before adding
automatic tax collection.

Every newly created site opens its own guided setup. Existing content is preserved;
the wizard configures that site’s settings and navigation and only creates starter
homepage blocks when the site does not already have a homepage. Admins can run it
again later from **Settings → Themes → Run site setup**.

## Forking for a new client

See [ARCHITECTURE.md](./ARCHITECTURE.md) for the full fork workflow and file ownership map.

```bash
git clone https://github.com/your-org/hadlockcms.git my-client
cd my-client
git remote rename origin upstream
gh repo create soconnor0919/my-client --public --source=. --push
git remote add origin https://github.com/soconnor0919/my-client
git config merge.ours.driver true
# Edit src/config/cms.ts, replace public/ assets, build out src/app/(site)/
```

## Pulling engine updates

```bash
git fetch upstream
git merge upstream/main   # instance files (cms.ts, (site)/**, public/**) are never overwritten
```
