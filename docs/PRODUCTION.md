# hadlockCMS Production Runbook

This runbook prepares a self-hosted hadlockCMS installation. It does not deploy
the application or provision third-party accounts.

## Runtime topology

- Run Node.js 24 on a persistent server or container. Do not use Node.js 26.
- Mount `DATABASE_URL` on durable storage. A single SQLite database supports one
  active application writer; do not scale application replicas horizontally
  against the same file over a network filesystem.
- Use S3-compatible media storage for disposable containers or more than one
  application instance. Local media requires a durable `public/uploads` volume.
- Terminate TLS at a reverse proxy and forward the original host, protocol, and
  client address headers. Health checks should call `GET /api/health`.

## Required secrets

Set `DATABASE_URL`, `BETTER_AUTH_SECRET`, and `BETTER_AUTH_URL`. Store secrets in
the hosting provider's secret manager, not in the image or repository. Use
separate credentials for development, staging, and production.

Optional production integrations are documented in `.env.example`:

- Resend or SMTP for account and form email
- Cloudflare Turnstile for public form abuse protection
- S3/R2/B2/MinIO for media
- Stripe restricted API key, webhook signing secret, and recurring Price IDs
- A platform MCP fallback token; site-scoped MCP tokens are preferred

Configure Stripe's Customer Portal in both sandbox and live mode. Send Checkout
and customer subscription lifecycle events to `/api/stripe/webhook`. Do not
enable automatic tax until the business has the required tax registrations.

## Release procedure

1. Put the current database backup and media backup in durable off-host storage.
2. Install from the lockfile with `bun install --frozen-lockfile` under Node 24.
3. Run `bun audit`; stop the release if production vulnerabilities remain.
4. Run `bun run typecheck`, `bun run test`, and `bun run build`.
5. Stop the old application process so only one writer performs migration.
6. Run `bun run db:migrate` and `bun run db:check`.
7. Start the new process with `bun run start`.
8. Verify `/api/health`, sign-in, public pages, one preview, media delivery,
   email delivery, and a Stripe sandbox checkout/webhook before enabling traffic.

For a first production database, run `bun run db:seed`, sign in immediately,
change the seeded password, finish onboarding, and enable two-factor
authentication. Never run the seed with its default password on an
internet-accessible service.

## Backup and restore

Create a consistent online SQLite backup with a unique destination:

```bash
bun run db:backup -- /secure/backups/hadlockcms-2026-08-21.sqlite
```

Schedule this command outside the application process and copy backups off the
host. Back up the media bucket or local uploads independently. Periodically test
restores in an isolated environment.

To restore, stop hadlockCMS, preserve the current database, then run:

```bash
bun run db:restore -- /secure/backups/hadlockcms-2026-08-21.sqlite --confirm-replace
bun run db:check
bun run db:migrate
```

## Rollback

Application rollback is safe only when the older version understands the
migrated schema. If it does not, stop the service and restore the pre-release
database plus the matching media state. Never run two versions against the same
SQLite file during rollback.

## Monitoring

Alert on non-200 health checks, elevated 5xx responses, storage quota failures,
Stripe webhook retries, email delivery failures, and database integrity errors.
Review the Operations screen, audit log, failed webhooks, and backup completion
regularly. Rotate MCP, Stripe, storage, email, and auth secrets after exposure or
staff access changes.
