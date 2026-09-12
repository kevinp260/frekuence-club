# Frekuence Club website

This repository contains the bilingual Frekuence Club application and its deployment tooling.
Albanian is served at the root and English under `/en/`.

Phase 2 checkpoints 1–9 implement the approved signal-interference design system, event-led public
pages, the private Django/PostgreSQL event-management foundation, its published-only events API,
the Astro dynamic migration, the production container topology, integrated QA coverage, and the
final handoff. A pinned unprivileged Nginx gateway is the only host-bound container and routes
same-origin public pages, the API, staff Admin, collected static files, and processed poster
derivatives. The Astro Node and Django services share only the application network; PostgreSQL is
isolated on a separate internal database network. Event-dependent routes render on demand while
stable editorial and error routes remain prerendered. Reservations, payments, public accounts,
analytics, tracking, and third-party embeds remain out of scope.

## Repository layout

- `services/frontend/` contains the independently locked Astro application, its production image,
  tests, generated public assets, and frontend-only tooling.
- `services/backend/` contains the Django application, migrations, tests, and production/check
  image stages.
- `services/gateway/` contains the unprivileged container Nginx image and private gateway
  configuration. The operator-managed host example remains under `deploy/nginx/`.
- `tools/` contains non-runtime validation utilities. Root `scripts/` and `tests/architecture/`
  cover cross-service behavior.
- Root Compose, environment placeholders, documentation, and `assets/` are shared repository
  concerns. PostgreSQL uses its pinned upstream image and has no empty source directory.

## Local commands

```sh
npm ci
npm run setup
FREKUENCE_EVENT_API_ORIGIN=http://127.0.0.1:8000 npm run dev
npm run check
npm run build
npm run test:e2e
npm run test:visual
npm run audit:lighthouse
npm run audit:lighthouse:fixtures
npm run audit:lighthouse:integrated
```

The root package is a command façade with no application dependencies. `npm run setup` performs
the locked frontend install in `services/frontend/`; the familiar root commands then delegate to
that service and include repository architecture checks where applicable. Direct service commands
may use `npm --prefix services/frontend run <command>`.

`npm run build` runs repository formatting, linting, architecture and frontend unit checks, Astro
diagnostics, the mixed SSR/prerender build, and production-output validation. Browser tests use the
local Google Chrome installation by default; set `CHROME_PATH` when Chrome is installed elsewhere.
The Lighthouse command starts and stops its own loopback mock API and Astro server, then enforces
the documented score and Core Web Vitals thresholds.

Browser and visual tests use unmistakably synthetic records from
`services/frontend/scripts/mock-events-api.mjs`. The three renamed poster assets under
`services/frontend/src/content/event-fixtures/` are served only through Playwright request
interception. Application code does not load them, and production validation fails if fixture
names, private API configuration, source maps, or environment files leak into browser-readable
output.

The checked-in favicons and social image are derivatives of the temporary, approved brand
exports. Regenerate them with `npm run assets:generate` after changing those source exports.

## Backend commands

All Django, PostgreSQL, migration, check, test, fixture, and staff visual-review processes run in
Docker. Copy `.env.example` to an ignored `.env`, replace every relevant placeholder, and use:

```sh
docker compose --profile tools run --rm --build backend-check
docker compose --profile tools run --rm --build backend-migrate
docker compose --profile tools run --rm --build backend-static
docker compose up -d --build --wait db backend web gateway
docker compose ps
npm run smoke:production-integration
npm run smoke:production-topology
npm run smoke:integrated-qa
```

Only `gateway` publishes a port, at
`127.0.0.1:${FREKUENCE_GATEWAY_PORT:-3010}`. Astro, Django, and PostgreSQL have no host port, and the
gateway is not connected to PostgreSQL's network. Migrations and `collectstatic` are explicit jobs;
normal service startup performs neither. Development fixtures require an explicit opt-in profile
and runtime-only credentials, and the production backend image contains no fixture command. Staff
authorization uses one simple role selector: Event viewer, Event editor, Event manager, Staff
manager, or Superuser. A superuser or delegated Staff manager can create named accounts and copy a
single-use, 24-hour setup link; only a superuser can grant Staff manager or Superuser access.
Accounts are deactivated rather than deleted so event audit history remains intact. Recipients choose a strong
password and can connect an authenticator during setup or later under **Account security**. TOTP is
optional per account and, when enabled, appears as a separate sign-in step. Provisioning, recovery,
deployment, backup, restore, and rollback procedures are documented in
[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

Staff can save a new event draft with only its poster; every other editable event field is optional
while drafting. Publication still requires the bilingual title, summary and description, start/end
times, and a successfully processed poster so public pages never rely on artwork alone. Poster
uploads use a **4:5 portrait** canvas, ideally **1600 x 2000 px**. WebP or JPEG is preferred; PNG is
accepted. The decoded image may contain at most 40 megapixels and the file at most 25 MiB. The
backend strips metadata and produces managed responsive WebP derivatives. Event slugs are generated
server-side from the available title plus the Tirana event date; title-only drafts receive a stable
unique suffix, and poster-only drafts receive an internal provisional slug.

The checkpoint 5 API remains JSON-only and read-only. Astro consumes it privately, while the
gateway exposes the same read-only contract under the public origin:

- `GET /api/v1/events/?locale=sq&when=upcoming&limit=6&offset=0`
- `GET /api/v1/events/?locale=en&when=recent&limit=5&offset=0`
- `GET /api/v1/events/{slug}/?locale=sq|en`

Albanian is the default locale. Lists use a `count`/`next`/`previous`/`results` envelope, accept a
maximum `limit` of 20 and an `offset` from 0 through 10,000, and expose published localized content
and managed poster derivatives only.

Astro runtime configuration uses `FREKUENCE_EVENT_API_ORIGIN` and
`FREKUENCE_EVENT_API_TIMEOUT_MS`; these names are intentionally server-only. Do not rename them
with Astro's `PUBLIC_` prefix. A request validates every API representation before rendering,
retries one safe transient read, and returns a localized 503 after the bounded timeout instead of
misrepresenting an outage as an empty programme.

## Production signoff

Phase 2 implementation and its nine checkpoints are complete, but production launch is not signed
off. Production DNS/TLS, host deployment, encrypted backup storage/restoration, monitoring, owner
staff credentials and optional-TOTP/emergency-account custody, real event content, legal details, and approved
original brand assets remain operator- or owner-dependent. The concise status, scope boundary, and
responsibility map are in [docs/PHASE_2_HANDOFF.md](docs/PHASE_2_HANDOFF.md); unresolved source
inputs remain in [docs/CONTENT_TODOS.md](docs/CONTENT_TODOS.md) and
[docs/BRAND_ASSET_TODOS.md](docs/BRAND_ASSET_TODOS.md).

The latest local release evidence is recorded in
[docs/VALIDATION_REPORT.md](docs/VALIDATION_REPORT.md).

## Project documentation

Repository working rules are in [AGENTS.md](AGENTS.md). The active specification is
[docs/PHASE_2_IMPLEMENTATION_BRIEF.md](docs/PHASE_2_IMPLEMENTATION_BRIEF.md); the original Phase 1
brief remains historical context. Current decisions, TODOs, deployment procedures, and validation
evidence live in the other files under `docs/`.
