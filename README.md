# Frekuence Club website

This repository contains the bilingual Astro frontend for Frekuence Club in Tirana. Albanian is
served at the root and English under `/en/`.

Phase 2 checkpoints 1–5 establish the approved signal-interference design system, event-led public
pages, the private Django/PostgreSQL event-management foundation, and its published-only events API.
The public Astro site remains a static build and continues to use its transitional content
collection; checkpoint 6 will connect it to Django without redesigning the public routes or
components. Checkpoint 6 Astro SSR integration and the checkpoint 7 production gateway are not
implemented, so the API remains private to the Compose network.
Reservations, payments, public accounts, analytics, tracking, and third-party embeds remain out of
scope.

## Local commands

```sh
npm ci
npm run dev
npm run check
npm run build
npm run build:fixtures
npm run test:e2e
npm run test:visual
npm run audit:lighthouse
npm run audit:lighthouse:fixtures
```

`npm run build` runs formatting, linting, Astro diagnostics, unit checks, the static build,
and production-output validation. Browser tests use the local Google Chrome installation by
default; set `CHROME_PATH` when Chrome is installed elsewhere. The Lighthouse command starts
and stops its own loopback preview server, then enforces the documented score and Core Web
Vitals thresholds.

`npm run build:fixtures` is an explicit non-production visual-review mode. It includes only the
records and renamed poster assets under `src/content/event-fixtures/` and writes them to the
ignored `dist-fixtures/` directory. A normal `npm run build` reads only `src/content/events/`, and
its production validator fails if fixture names or routes leak into `dist/`.

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
docker compose ps
```

The Django service and PostgreSQL have no host port. Development fixtures require an explicit
opt-in profile and runtime-only credentials; normal startup and the production backend image do not
contain the fixture command. Staff account provisioning, TOTP enrollment, screenshots, backup, and
restore procedures are documented in [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md).

The checkpoint 5 API is JSON-only and read-only:

- `GET /api/v1/events/?locale=sq&when=upcoming&limit=6&offset=0`
- `GET /api/v1/events/?locale=en&when=recent&limit=5&offset=0`
- `GET /api/v1/events/{slug}/?locale=sq|en`

Albanian is the default locale. Lists use a `count`/`next`/`previous`/`results` envelope, accept a
maximum `limit` of 20, and expose published localized content and managed poster derivatives only.

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
