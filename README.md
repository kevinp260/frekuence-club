# Frekuence Club website

This repository contains the bilingual Astro frontend for Frekuence Club in Tirana. Albanian is
served at the root and English under `/en/`.

Phase 2 checkpoints 1–6 establish the approved signal-interference design system, event-led public
pages, the private Django/PostgreSQL event-management foundation, its published-only events API,
and the Astro dynamic migration. The official Astro Node adapter renders only event-dependent
routes on demand from the private API; stable editorial, policy, privacy, visit, About, and error
routes remain prerendered. The checkpoint 7 production gateway is not implemented, so this branch
is an integration-review checkpoint rather than the final public topology.
Reservations, payments, public accounts, analytics, tracking, and third-party embeds remain out of
scope.

## Local commands

```sh
npm ci
FREKUENCE_EVENT_API_ORIGIN=http://127.0.0.1:8000 npm run dev
npm run check
npm run build
npm run test:e2e
npm run test:visual
npm run audit:lighthouse
npm run audit:lighthouse:fixtures
```

`npm run build` runs formatting, linting, Astro diagnostics, unit checks, the mixed SSR/prerender
build, and production-output validation. Browser tests use the local Google Chrome installation by
default; set `CHROME_PATH` when Chrome is installed elsewhere. The Lighthouse command starts
and stops its own loopback mock API and Astro server, then enforces the documented score and Core
Web Vitals thresholds.

Browser and visual tests use unmistakably synthetic records from `scripts/mock-events-api.mjs`.
The three renamed poster assets under `src/content/event-fixtures/` are served only through
Playwright request interception. Application code does not load them, and production validation
fails if fixture names, private API configuration, source maps, or environment files leak into
browser-readable output.

The checked-in favicons and social image are derivatives of the temporary, approved brand
exports. Regenerate them with `npm run assets:generate` after changing those source exports.

## Backend commands

All Django, PostgreSQL, migration, check, test, fixture, and staff visual-review processes run in
Docker. Copy `.env.example` to an ignored `.env`, replace every relevant placeholder, and use:

```sh
docker compose --profile tools run --rm --build backend-check
docker compose --profile tools run --rm --build backend-migrate
docker compose --profile tools run --rm --build backend-static
docker compose up -d --build backend
docker compose up -d --build web
docker compose ps
```

The Django service and PostgreSQL have no host port. Development fixtures require an explicit
opt-in profile and runtime-only credentials; normal startup and the production backend image do not
contain the fixture command. Staff account provisioning, TOTP enrollment, screenshots, backup, and
restore procedures are documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

The checkpoint 5 API remains JSON-only and read-only. Checkpoint 6 consumes it from Astro over the
private Compose network:

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

The implementation is deployable, but final public-launch approval remains blocked by the
owner inputs listed in [docs/CONTENT_TODOS.md](docs/CONTENT_TODOS.md) and the original assets
listed in [docs/BRAND_ASSET_TODOS.md](docs/BRAND_ASSET_TODOS.md).

The latest local release evidence is recorded in
[docs/VALIDATION_REPORT.md](docs/VALIDATION_REPORT.md).

## Project documentation

Repository working rules are in [AGENTS.md](AGENTS.md). The active specification is
[docs/PHASE_2_IMPLEMENTATION_BRIEF.md](docs/PHASE_2_IMPLEMENTATION_BRIEF.md); the original Phase 1
brief remains historical context. Current decisions, TODOs, deployment procedures, and validation
evidence live in the other files under `docs/`.
