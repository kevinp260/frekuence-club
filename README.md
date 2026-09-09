# Frekuence Club website

This repository contains the bilingual Astro frontend for Frekuence Club in Tirana. Albanian is
served at the root and English under `/en/`.

Phase 2 checkpoints 1–3 establish the approved signal-interference design system, an event-led
homepage, localized event detail routes, and localized About / Who we are pages. The site remains
a static build at this checkpoint. Published entries in the transitional Astro event collection
drive the homepage, event index, and detail routes; Django/PostgreSQL will replace that source in
checkpoint 6 without redesigning the public routes or components. Django, event administration,
poster uploads, and the dynamic event API are not implemented yet. Reservations, payments, public
accounts, analytics, tracking, and third-party embeds remain out of scope.

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
