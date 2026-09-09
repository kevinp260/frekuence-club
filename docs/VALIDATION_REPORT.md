# Phase 2 checkpoint 5 validation

Validated on 2026-09-09 against `feat/phase-2-read-only-api`. This checkpoint adds only the
published-only Django events API. Astro still reads its transitional content collection, Django
remains private, and no public route or visual design changed.

## Automated gates

| Gate                                                                                                                      | Result                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose --profile tools run --rm --build backend-check`                                                           | Passed: Ruff format and lint; no pending migrations; Django system and deployment checks; all migrations; 62 tests in 11.435 s; installed-environment audit with no known vulnerabilities                               |
| `docker compose --profile tools run --rm --build backend-check python manage.py test tests.test_public_api --verbosity 2` | Passed: 14 focused public API tests in 0.549 s                                                                                                                                                                          |
| `docker compose --profile tools run --rm --build frontend-check`                                                          | Passed: Prettier, ESLint, 0 Astro diagnostics across 58 files, 11 unit tests, 13-page production build, 12-route/40-file production validation, 37 browser tests; 26 opt-in visual tests skipped                        |
| `docker compose up -d --build backend` and private API smoke                                                              | Passed: production-target backend image built; Django and PostgreSQL healthy with private container ports only; Albanian upcoming list returned 200, an ETag, documented cache policy, and the four-field page envelope |

The running development database contained no published events, so the private API smoke returned
the expected empty `results` with `count: 0`; it did not create or publish test data. The Django
deployment check continues to report only the two deliberately silenced host-Nginx-owned HSTS
subdomain/preload warnings documented at checkpoint 4.

## API coverage

- Published-only list and slug detail responses in Albanian and English, with Albanian defaults
  and rejection of unknown, duplicated, or malformed query input.
- Public-field allowlisting: no UUID/database identifiers, audit actors or timestamps,
  publication internals, other-language content, original uploads, or filesystem paths.
- Indistinguishable 404 responses for unknown, draft, and intentionally unpublished slugs.
- Separate lifecycle status and derived timing for scheduled, postponed, cancelled, current,
  future, and past events; stable chronological and reverse-chronological ordering.
- Bounded `limit`/`offset` pagination with a default of 6, maximum of 20, deterministic relative
  links, and constant query budgets of two queries for list and one for detail.
- GET/HEAD/OPTIONS-only behavior, 405 write rejection, strong content ETags, documented public
  cache policy, and conditional 304 responses for list and detail.
- Managed responsive WebP derivative URLs, dimensions, format, and localized alt text only.

## Checkpoint boundary and known limitations

- No database migration was added; the checkpoint 4 Event schema and staff/security behavior are
  unchanged.
- Checkpoint 6's Astro Node/SSR migration and API consumption are not implemented. The public site
  therefore remains on the transitional Astro event collection.
- Checkpoint 7's gateway/API/media routing, proxy limits, and production topology are not
  implemented. Django, PostgreSQL, `/api/v1/`, and `/staff/` remain private with no host binding.
- No real event data was created or published. No frontend or staff UI changed, so new visual
  screenshots were neither required nor generated.
- Production staff operations, backup ownership/retention, final hosts/origins, public cache
  ownership, and real event content remain owner/operator TODOs.

---

# Previous Phase 2 checkpoint 4 validation

Validated on 2026-09-09 against `feat/phase-2-backend-foundation`. This checkpoint adds only the
Django/PostgreSQL backend foundation. The public Astro source and design are unchanged and remain
disconnected from Django until checkpoint 6.

## Automated gates

| Gate                                                              | Result                                                                                                                                                                                                                                |
| ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose --profile tools run --rm --build backend-check`   | Passed: Ruff format and lint; no pending migrations; Django system check; Django deployment check; migrations; 48 tests in 11.970 s; installed-environment audit with no known vulnerabilities                                        |
| `docker compose --profile tools run --rm --build backend-migrate` | Passed: explicit migration job; all migrations applied and no pending migration                                                                                                                                                       |
| `docker compose --profile tools run --rm --build backend-static`  | Passed: 131 Django/staff static files collected; final refresh copied 1 changed file and retained 130 unchanged files                                                                                                                 |
| `docker compose --profile tools run --rm --build frontend-check`  | Passed: Prettier, ESLint, 0 Astro diagnostics across 58 files, 11 unit tests, 13-page production build, 12-route/40-file production validation, 37 browser tests; 26 opt-in visual tests skipped                                      |
| `docker compose build web backend`                                | Passed: final pinned Astro/Nginx and Django/Gunicorn production images built                                                                                                                                                          |
| Backend and database health                                       | Passed: Django and PostgreSQL healthy on private container ports; no backend/database host bindings                                                                                                                                   |
| Isolated production-configuration health smoke                    | Passed: Django and PostgreSQL healthy with production environment, host, HTTPS redirect, secure-cookie, and non-default database settings; trusted internal probe returned 200; plain HTTP returned 301 to the exact HTTPS health URL |
| Staff visual workflow                                             | Passed: TOTP login and draft-only event list/editor captured in the pinned Playwright container at 1440 × 1000 and 1024 × 768; no page-level horizontal overflow                                                                      |

The Django deployment check reports two deliberately silenced HSTS subdomain/preload warnings.
Host Nginx owns final HSTS, and those flags remain disabled until checkpoint 7 verifies every
applicable hostname over HTTPS. All other deployment warnings are treated as failures.

## Backend coverage

- Domain validation: timezone-aware ordering, optional doors boundary, localized publication
  completeness, lifecycle/publication separation, stable slug shape, ordered bounded lineup,
  server-managed publication time, derived past state, and featured-event replacement/selection.
- Database enforcement: start/end and doors constraints, complete published rows, consistent
  featured state, and at most one published scheduled/postponed feature.
- Authorization: anonymous, non-staff, and password-only/non-TOTP staff denial; least-privilege
  Event editor permissions; no signup; CSRF enforcement; request-user attribution; and payload
  actor-field exclusion.
- Authentication/security: actual TOTP login, five-attempt username-plus-IP rate limiting,
  Argon2-first strong password configuration, secure production cookie requirements, production
  environment and database-credential fail-closed guards, an HTTPS-aware internal health probe
  without a public redirect exemption, and private QR provisioning.
- Upload attacks/processing: JPEG/PNG/WebP decode acceptance; SVG, malformed, truncated, spoofed
  extension/MIME, encoded-byte, and decoded-pixel rejection; traversal-resistant randomized names;
  orientation normalization; metadata stripping from managed original and derivatives; responsive
  WebP generation; and transaction-safe media replacement/deletion.
- Operations: migration leaf consistency, explicit migrations/static collection, fixture opt-in,
  production-image fixture exclusion, system/deployment checks, and dependency audit.

## Visual evidence

The final staff captures and reproduction notes are committed under
[`docs/review/phase-2-backend-foundation/`](review/phase-2-backend-foundation/README.md). The images
use a generated poster and visibly synthetic draft only; no candidate or real event is published.
Manual review found clear grouping, readable operational fields and poster metadata, practical
controls, and no clipping or horizontal overflow at either width.

## Checkpoint boundary and known limitations

- Checkpoint 5's published-only public API is not implemented.
- Checkpoint 6's Astro Node/SSR migration and Django integration are not implemented.
- Checkpoint 7's final gateway, media routing, proxy limits, and production topology are not
  implemented. Django and PostgreSQL remain private and are not available through the public site.
- The production staff roster, MFA recovery/emergency procedure, backup destination/retention/owner,
  final hosts/origins, and real event content remain owner/operator TODOs.
- No real event data is included or published. The development fixture is opt-in, draft-only,
  unmistakably labelled, and its command is absent from the production backend image.

---

# Previous Phase 2 checkpoint 3 validation

Validated on 2026-09-09 against `feat/phase-2-foundation` after the P1 event-homepage review
follow-up. This remains frontend-only checkpoint 3 work; Django/backend checkpoint 4 has not
started.

## Baseline context

- The original checkpoint 3 baseline and final gates passed before this follow-up.
- The Astro event collection was genuinely empty, but the homepage did not consume it and would
  therefore have continued to show the empty state after a real published entry was added.
- The three newly tracked poster files had generic numeric names and no explicit non-production
  inclusion boundary.

## Current automated gates

| Gate                                | Result                                                                                                                                                |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                     | Passed: formatting, ESLint, Astro diagnostics, 11 unit tests, 13-page production build, sitemap, and production-output validation                     |
| Astro diagnostics                   | Passed: 0 errors, 0 warnings, 0 hints across 59 files                                                                                                 |
| Production validator                | Passed: 12 localized canonical routes and 43 generated files; fixture names/routes absent; internal links, metadata, hreflang, sitemap, and 404 valid |
| `npm run test:e2e`                  | Passed: 37 functional/browser tests; 26 opt-in visual tests skipped                                                                                   |
| `npm run test:visual`               | Passed: 26 screenshots, including the five committed PR review captures                                                                               |
| `npm run audit:lighthouse`          | Passed: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1,658 ms; CLS 0                                                          |
| `npm run audit:lighthouse:fixtures` | Passed: Performance 98, Accessibility 100, Best Practices 100, SEO 100; LCP 2,342 ms; CLS 0.00013                                                     |
| `npm audit`                         | Passed: 0 known vulnerabilities                                                                                                                       |

## Event behavior covered

- Valid featured-event priority and earliest-upcoming fallback.
- In-progress scheduled events remain eligible until their `endsAt` boundary.
- Rejection of draft, cancelled, and past featured candidates.
- Chronological secondary selection with a hard five-card cap.
- Separately typed and visibly labelled upcoming and recent-past groups.
- Genuine zero-published-event fallback and no-upcoming-with-history behavior.
- Pointer hover, keyboard focus, explicit mobile tap selection, Escape reset, reduced motion,
  and a readable linked list when JavaScript is disabled.
- Real localized detail destinations, reciprocal language links, localized metadata, and truthful
  `MusicEvent` data without fabricated offers.
- Unique SVG resource IDs when multiple event frequency fields render together.
- No page-level horizontal overflow in the empty and fixture event homepages from 320 to 1440 px.
- Exact opt-in fixture loading and both build-time and browser-level proof that a normal production
  build excludes fixture content and routes.

## Visual evidence

The five requested captures are committed and linked from
[`docs/review/phase-2-foundation/README.md`](review/phase-2-foundation/README.md):

- Homepage with events at 1440 × 1000.
- Homepage with events at 390 × 844.
- Homepage empty state at 1440 × 1000.
- About page at 1440 × 1000.
- About page at 390 × 844.

The event captures use only visibly marked visual fixtures. Manual inspection found no page-level
overflow, clipped primary content, overlapping CTA controls, or illegible card metadata. The mobile
deck is an explicitly labelled horizontal region with visible selection controls and separate links.

## Fixture and checkpoint boundary

Normal builds load only `src/content/events/`. The opt-in fixture build loads the clearly named
records and poster assets under `src/content/event-fixtures/`, writes to ignored `dist-fixtures/`,
and never runs in the production Dockerfile. The production validator fails if fixture markers
appear in `dist/`.

No Django, PostgreSQL, Node adapter, event API, staff administration, upload processing, or
container-topology change is included. Checkpoint 6 is still responsible for replacing the
transitional collection source with Django/SSR without redesigning the routes or event components.
