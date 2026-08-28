# hadlockCMS Architecture

hadlockCMS is a multi-tenant website platform. Clients share one application
and schema while all client-owned state is isolated by `siteId`. Client forks
are not part of the operating model.

## Layers

### Platform control plane

The control plane owns authentication, profiles, site membership, onboarding,
billing, domains, MCP credentials, operations, backups, and the admin shell.
Its identity is always hadlockCMS by Hadlock Technologies.

Primary paths:

- `src/app/(admin)/**`
- `src/app/(admin-login)/**`
- `src/app/(onboarding)/**`
- `src/app/api/**`
- `src/server/**`
- `src/components/admin/**`
- `src/components/ui/**`
- `public/branding/hadlock/**`

### Generic site runtime

The site runtime resolves the request hostname or selected workspace to a site
ID, loads tenant settings and content, and renders the same block system for
every client. It must not contain client names, copy, logos, or assumptions.

Primary paths:

- `src/app/(site)/**`
- `src/components/BlockRenderer.tsx`
- `src/components/Logo.tsx`
- `src/components/ThemeInjector.tsx`
- `src/config/themes.ts`
- `src/config/site-templates.ts`
- `src/config/starters.ts`

### Client tenants

A client is represented by a `cms_site` row and related site-scoped records.
The database and configured media storage are the runtime source of truth for:

- identity, logo, favicon, domain, locale, and timezone;
- theme, layout, typography, navigation, and footer;
- pages, posts, programs, team, forms, events, and reusable blocks;
- users and their per-site roles;
- media, analytics, billing, webhooks, MCP credentials, and audit history.

An optional `clients/<slug>/` package may reproduce initial provisioning for a
contracted client. It is not imported by the application runtime and must scope
every inserted record to that client's site ID.

## Trellis

Trellis Workforce Development is the first client tenant.

- Provisioning: `clients/trellis/seed.ts`
- Public assets: `public/clients/trellis/`
- Site ID and slug: `trellis`
- Owner account: configured by `TRELLIS_OWNER_EMAIL` and `TRELLIS_OWNER_PASSWORD`
- Command: `bun run db:seed:trellis`

The normal `bun run db:seed` command never inserts Trellis data. It creates a
neutral administrator and blank site with `onboardingComplete = false`.

## Database isolation

Platform tables use the physical `hadlock_` namespace. Client content tables
contain a `siteId` column, and request procedures derive the active site from a
verified hostname, explicit workspace selection, or authenticated membership.
Queries and mutations must include that resolved site ID.

Cross-site identity tables such as users and sessions are intentionally shared.
Authorization is granted through `site_membership`; a user's role at one client
does not grant access to another.

## Creating a client

The preferred workflow is application onboarding:

1. Create the user or send an invitation.
2. Create a site and owner membership.
3. Complete identity, theme, layout, and section onboarding.
4. Upload client media into that site's storage namespace.
5. Verify the custom hostname.
6. Configure billing, email, analytics, webhooks, and MCP access as needed.

For reproducible contracted-client provisioning, add an idempotent package at
`clients/<slug>/` and a named script such as `db:seed:<slug>`. Never add its
content to `scripts/seed.ts`, schema defaults, generic public routes, or built-in
theme names.

## New-site invariant

A fresh user must be able to create a photography, technical portfolio,
project portfolio, publication, nonprofit, or business site without seeing the
name, branding, content, staff, programs, or domain of any existing client.

Tests should use neutral platform credentials and data unless they are
explicitly validating a client provisioning package.

## Development and migrations

Use Node.js 24. For a clean local database:

```bash
bun run db:migrate
bun run db:seed
```

To add Trellis alongside the neutral onboarding site:

```bash
bun run db:seed:trellis
```

The legacy pre-deployment schema used `trellis_` as its physical table prefix.
The baseline now uses `hadlock_`. Because that namespace was never deployed,
local legacy databases should be backed up and recreated or transferred through
the portable content export rather than baselined against the new namespace.
