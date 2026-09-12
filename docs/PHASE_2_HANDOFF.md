# Phase 2 final handoff

## Status

Phase 2 implementation checkpoints 1–9 are complete. The repository now contains the approved
public experience, event-management foundation, dynamic event integration, production container
topology, integrated technical evidence, and operational documentation.

This is not production launch approval. The owner and operator inputs under
[Production signoff](#production-signoff) must be completed on the real deployment environment
before the site is described as production-signed-off or real events are published.

Post-Phase-2 staff-access refinement: the original handoff required TOTP for all staff accounts.
The current, owner-approved policy makes TOTP optional per account, separates it into a second
screen only when enabled, and adds in-app onboarding, bounded role presets, and delegated recovery.
The authoritative current procedure is
[Staff accounts and TOTP](DEPLOYMENT.md#staff-accounts-and-totp); the historical checkpoint 8
evidence remains unchanged.

## Delivered capabilities

- Bilingual Albanian (`sq-AL`) and English public routes with translation parity, reciprocal
  hreflang, trailing-slash canonicals, localized metadata, a branded real 404, and a dynamic
  published-event sitemap.
- The Signal Interference design system, an event-led homepage, a maximum five-card secondary
  event deck, localized event indexes/details, and standalone About / Who we are pages.
- Accessible pointer, keyboard, explicit touch-selection, reduced-motion, and JavaScript-disabled
  event-card behavior from 320 px mobile through desktop.
- Astro Node on-demand rendering for event-dependent pages and sitemap data; stable About,
  Policy, Visit, Privacy, and error routes remain prerendered where supported.
- PostgreSQL as the production event source of truth, with Django domain validation, bilingual
  event content, publication/lifecycle separation, featured-event rules, audit attribution, and
  a focused event-only Django Admin.
- Staff session authentication with CSRF protection, strong passwords, fixed least-privilege event
  and staff-management roles, optional per-account TOTP, login throttling, and sanitized
  client-address attribution. There is no public signup.
- A versioned anonymous read-only event API that exposes published localized fields and managed
  poster derivatives only, with bounded queries, deterministic ordering, ETags, and conditional
  requests.
- Raster-only poster validation and re-encoding, randomized paths, metadata stripping,
  orientation normalization, bounded byte/pixel limits, responsive WebP derivatives, and private
  managed originals.
- Dockerized Astro, Django, PostgreSQL, and an unprivileged Nginx gateway with health checks,
  private service networks, persistent named volumes, and explicit migration/static jobs.

## Final architecture and boundaries

```text
Internet
  → host Nginx (operator-managed TLS and trusted public proxy boundary)
  → 127.0.0.1:${FREKUENCE_GATEWAY_PORT:-3010}
  → unprivileged container gateway
      ├─ public/editorial/event routes → Astro Node
      ├─ /api/ and /staff/             → Django
      ├─ /static/                      → collected static volume, read-only
      └─ /media/events/derivatives/    → processed media volume, read-only

Django → PostgreSQL on the internal database network
```

Only the gateway binds to the host loopback interface. Astro and the gateway share the
application network; Django bridges the application and internal database networks; PostgreSQL is
not reachable from the gateway or host. Host Nginx terminates TLS and overwrites forwarding
headers. The gateway normalizes the trusted scheme/client address, preserves Astro's per-response
nonce CSP, and does not expose internal service names.

Astro public routes neither authenticate with nor use Django staff session state, and browser
JavaScript makes no request to the private API origin. Anonymous API clients can use only the
documented published read model and safe methods. `/staff/` uses Django sessions, CSRF, optional
per-account TOTP, rate limiting, and fixed role-based event/staff authorization. The gateway serves
processed derivatives but denies original media paths. Secrets remain runtime-only and must never
use Astro `PUBLIC_*` variables.

The authoritative operational detail—including environment requirements, route limits, proxy
headers, staff enrollment, and exact commands—is [the deployment guide](DEPLOYMENT.md).

## Routine validation

For ordinary frontend/documentation work:

```sh
npm ci
npm run setup
npm run check
npm run build
git diff --check
```

The root npm package is a command façade. `npm run setup` installs the independently locked Astro
package under `services/frontend/`; application services live under `services/`, while Compose,
deployment documentation, shared assets, and cross-service smoke tooling remain at repository root.

For backend, integration, security, or release work, use the container gates and production
smokes:

```sh
docker compose config
docker compose --profile tools run --rm --build backend-check
docker compose --profile tools run --rm --build frontend-check
docker compose run --rm --no-deps gateway nginx -t
npm run smoke:production-integration
npm run smoke:production-topology
npm run smoke:integrated-qa
npm run audit:lighthouse:integrated
git diff --check
```

Run `npm run test:e2e` for behavior, navigation, accessibility, or responsive changes;
`npm run test:visual` for visual changes; and the applicable Lighthouse command for performance,
accessibility, best-practice, or SEO changes. Do not replace the full container gates with the
short documentation-only checkpoint 9 validation.

## Production deployment order

Follow [Production deployment order](DEPLOYMENT.md#production-deployment-order) using one exported
immutable gateway/web/backend tag set for the entire operation. Take the matched database/media
backup first, then execute this order:

```sh
export FREKUENCE_GATEWAY_TAG=IMMUTABLE_RELEASE_TAG
export FREKUENCE_WEB_TAG=IMMUTABLE_RELEASE_TAG
export FREKUENCE_BACKEND_TAG=IMMUTABLE_RELEASE_TAG

docker compose build --pull gateway web backend
docker compose --profile tools run --rm backend-migrate python manage.py showmigrations --plan
docker compose run --rm --no-deps gateway nginx -t
docker compose up -d --wait db
docker compose --profile tools run --rm backend-migrate
docker compose --profile tools run --rm backend-static
docker compose up -d --no-build --wait backend web gateway
docker compose ps
```

Migrations and `collectstatic` are operator-owned, explicit one-off jobs and never run during
normal application startup. After deployment, the operator must run the documented
[health and route verification](DEPLOYMENT.md#health-and-route-verification), including a real
404 and an intentionally published event/API pair when approved content exists.

Rollback selects one previous compatible gateway/web/backend image set while preserving named
volumes; schema reversal is permitted only when reviewed and data-preserving. PostgreSQL and media
must be backed up together under the same release/timestamp. Restoration must use a separately
named Compose project, a random gateway port, isolated volumes, compatible immutable tags,
migration compatibility checks, and `backend-static` before restored services start. The exact
[rollback](DEPLOYMENT.md#rollback) and
[matched backup/isolated restoration](DEPLOYMENT.md#matched-backup-and-isolated-restoration)
procedures are authoritative.

Staff-account creation and TOTP provisioning are explicit operator tasks. Named staff must use
individual accounts; enrollment material is private and temporary; the `Event editors` group is
the day-to-day least-privilege role. See [Staff accounts and TOTP](DEPLOYMENT.md#staff-accounts-and-totp).

## Authoritative technical evidence

Checkpoint 8 remains the latest full integrated technical validation. Its final reviewed head was
`9696c16776aa113100f37e525e61eb3b4b1f24c7`, merged into `main` by
`e4ddbc3a3babe08381e1c4fe41b47bedf63e4209`.

Use the top-level checkpoint 8 section and review follow-up in
[the validation report](VALIDATION_REPORT.md#phase-2-checkpoint-8-integrated-qa-validation) for the
actual backend/frontend counts, browser and visual evidence, Lighthouse results, production
integration/topology smokes, security coverage, and disposable database/media restoration. The
checkpoint 9 section records only documentation validation and does not supersede or pretend to
rerun that evidence.

## Production signoff

“Phase 2 implementation complete” means the approved repository scope and all nine implementation
checkpoints are delivered and documented. “Production launch signed off” additionally requires
real-environment and owner approvals that this repository cannot supply. Until those are recorded,
the site must not be described as production-signed-off.

All of the following remain unresolved:

- Content and policy: final Albanian/English manifesto copy; complete approved entry policy;
  legal operator identity/contact details; access-log fields, purposes, legal basis, recipients,
  and retention; official email/phone; accessibility details and a contact route; optional
  transport/parking guidance; and an opening schedule or confirmation of event-specific hours.
- Event publication: classification of supplied posters as approved events, samples, or
  duplicates; event facts and correct years supplied independently of artwork; approved bilingual
  copy and poster alt text; publication rights and any photographer/designer/artist credits; and
  approval before any real event is published.
- Visual assets: approved venue/crowd photography with rights; final cyan, magenta, and green
  signal tokens; horizontal, vertical, emblem, and symbol source SVGs; light/dark variants;
  favicon/source icons; approved cymatic pattern SVGs and monoline icons; licensed body-font files
  or Montserrat-only approval; amber/yellow UI status; and replacement/removal of all temporary
  brand exports.
- Staff and secrets: named production staff recipients, credential and optional-TOTP custody,
  emergency-account ownership, final production hosts/origins, Django secret key, and unique
  PostgreSQL credentials.
- Operations: real host deployment; public DNS and TLS/Certbot verification; encrypted matched
  backup destination, retention, automation, restore owner, and tested real-data restoration;
  monitoring/alert provider and destination; and demonstrated alert delivery.
- Future reservations: owner rules and minimum personal data may be recorded for a later phase,
  but reservations remain outside Phase 2 and must not be enabled by this handoff.

The detailed source inventories remain
[content and legal TODOs](CONTENT_TODOS.md) and [brand asset TODOs](BRAND_ASSET_TODOS.md). The
[SEO launch checklist](SEO_LAUNCH_CHECKLIST.md) separates repository evidence from production-
domain tasks.

## Explicitly out of scope

Phase 2 does not include reservations, guest lists, table booking, online payments, checkout,
tickets, QR tickets, refunds, GoWild integration, public customer accounts, contact forms, a
parallel custom staff CRUD application, embedded Instagram/Google Maps, analytics, tracking,
marketing pixels, consent-requiring cookies, Redis, Celery, workers, heavy client frameworks,
WebGL/canvas effects, autoplay media, literal strobe effects, or event publication inferred from
poster artwork. None is authorized by this handoff.

Future creative UI refinements belong on a separate branch outside Phase 2. They must preserve
the validated bilingual routes and content parity, keyboard/touch/no-script access, reduced-motion
behavior, 320 px responsive floor, WCAG contrast, canonical/hreflang/structured-data behavior,
real HTTP statuses, CSP and proxy boundaries, production-output exclusions, and Lighthouse/Core
Web Vitals budgets. Rerun the applicable browser, visual, accessibility, SEO, security, and
performance gates for the actual change.
