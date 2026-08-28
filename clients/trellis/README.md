# Trellis Workforce Development

Trellis is a hadlockCMS client tenant. It is not a platform default, built-in
theme, or generic demo.

Run `bun run db:seed:trellis` after applying migrations to provision the
Trellis owner account, tenant workspace, membership, design settings, pages,
programs, and team records. Every inserted row is scoped to the `trellis` site
ID. Re-running the command is safe.

Set `TRELLIS_OWNER_EMAIL` and `TRELLIS_OWNER_PASSWORD` to override the local
provisioning credentials.

Set `PROVISION_TRELLIS=true` in a production deployment to run this idempotent
provisioner at startup. `TRELLIS_HOSTNAME` assigns a provider-controlled,
pre-verified hostname to the tenant; customer-owned domains should continue to
use the normal DNS ownership verification flow.

Runtime content belongs in the database and tenant media storage. The files in
this directory are the reproducible initial provisioning package only.

Client web assets live under `public/clients/trellis/` and are referenced by
the Trellis `site_settings` record; generic sites never load them.
