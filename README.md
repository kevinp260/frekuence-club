# Frekuence Club website

This repository contains the bilingual Astro frontend for Frekuence Club in Tirana. Albanian is
served at the root and English under `/en/`.

Phase 2 checkpoints 1–8 establish the approved signal-interference design system, event-led public
pages, the private Django/PostgreSQL event-management foundation, its published-only events API,
the Astro dynamic migration, the production container topology, and integrated QA coverage. A pinned unprivileged Nginx
gateway is the only host-bound container and routes same-origin public pages, the API, staff Admin,
collected static files, and processed poster derivatives. The Astro Node and Django services share
only the application network; PostgreSQL is isolated on a separate internal database network.
Event-dependent routes render on demand while stable editorial and error routes remain prerendered.
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
npm run audit:lighthouse:integrated
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
provisioning, TOTP enrollment, deployment, backup, restore, and rollback procedures are documented
in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

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

Checkpoint 8 provides integrated synthetic validation but is not final launch signoff. Production
DNS/TLS, host deployment, encrypted backup storage, monitoring, owner staff credentials, and the
owner inputs in [docs/CONTENT_TODOS.md](docs/CONTENT_TODOS.md) plus the original assets in
[docs/BRAND_ASSET_TODOS.md](docs/BRAND_ASSET_TODOS.md) remain operator-dependent. Checkpoint 9
handoff has not been implemented.

The latest local release evidence is recorded in
[docs/VALIDATION_REPORT.md](docs/VALIDATION_REPORT.md).

## Project documentation

Repository working rules are in [AGENTS.md](AGENTS.md). The active specification is
[docs/PHASE_2_IMPLEMENTATION_BRIEF.md](docs/PHASE_2_IMPLEMENTATION_BRIEF.md); the original Phase 1
brief remains historical context. Current decisions, TODOs, deployment procedures, and validation
evidence live in the other files under `docs/`.
