# Post-Phase-2 service-layout validation

Validated on 2026-09-12 on `chore/services-layout`, created from merged creative-navigation
baseline `a480a994450d02fd9b5c5ccfc85044c6191af093`. This is a repository-organization change:
Astro, Django, and the container gateway now own independent directories under `services/`;
non-runtime container tools live under `tools/`; cross-service tests remain at repository root;
and shared documentation, deployment configuration, scripts, and source assets remain root
concerns. PostgreSQL still uses its pinned upstream image and intentionally has no empty service
directory.

Application source, routes, event and API behavior, database schema and migrations, proxy rules,
ports, internal service names, networks, named volumes, security controls, production content, and
the completed Phase 2 handoff did not change. Compose build contexts and repository command paths
were updated to match the new ownership boundaries. The root npm package is now a dependency-free
command facade; the Astro package and lockfile are owned by `services/frontend/`, and the staff
visual tool has its own exact Playwright pin and lockfile.

## Service-layout commands actually run

| Command                                                                                | Result                                                                                                                                                                                                            |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Pre-change `npm run check`                                                             | Passed: 67 Astro-visible files, 0 diagnostics, and 34/34 unit tests                                                                                                                                               |
| Pre-change `npm run build`                                                             | Passed: 8 prerendered routes and 59 production files                                                                                                                                                              |
| Pre-change `docker compose config --quiet`                                             | Passed                                                                                                                                                                                                            |
| Pre-change backend Docker gate                                                         | Passed: formatting/lint, migration and Django checks, 69 tests, and no known vulnerabilities                                                                                                                      |
| Pre-change frontend Docker gate                                                        | Passed: 65 container-visible files, 0 Astro diagnostics, 34 unit tests, 8-route/59-file build, and 68 browser tests; 38 opt-in visual cases skipped as designed                                                   |
| `npm ci`                                                                               | Passed for the dependency-free root command facade: 1 package audited, 0 vulnerabilities                                                                                                                          |
| `npm run setup`                                                                        | Passed: 508 frontend packages installed, 509 packages audited, 0 vulnerabilities                                                                                                                                  |
| `npm run check`                                                                        | Passed: repository/frontend Prettier and ESLint, 14/14 architecture tests, 22/22 frontend unit tests, and 0 Astro errors, warnings, or hints across 61 frontend files                                             |
| `npm run build`                                                                        | Passed: the complete check reran, Astro Node built successfully, and production validation found 8 prerendered routes and 59 production files                                                                     |
| `npm run test:e2e`                                                                     | Passed: 14/14 architecture tests, production build, and 68/68 browser/integration/accessibility tests; 38 opt-in visual cases skipped as designed                                                                 |
| `npm run test:visual`                                                                  | Passed: 14/14 architecture tests, production build, and 38/38 visual captures                                                                                                                                     |
| Focused frequency-dial output-path capture                                             | Passed: 1/1 Chromium case wrote to the authoritative root review directory after its path correction, with no change to the committed screenshot                                                                  |
| `npm run audit:lighthouse:integrated`                                                  | Passed all four localized synthetic routes; exact results below                                                                                                                                                   |
| `docker compose config`                                                                | Passed: the rendered configuration contained 190 lines and preserved the existing services, networks, volumes, restrictions, and gateway-only host binding                                                        |
| `docker compose --profile tools build gateway web backend staff-visual frontend-check` | Passed: all five reorganized first-party images built from their new service/tool contexts                                                                                                                        |
| `docker compose --profile tools run --rm --build backend-check`                        | Passed: Ruff format/lint, migration and Django system/deployment checks, 69 tests, and no known installed-environment vulnerabilities                                                                             |
| `docker compose --profile tools run --rm --build frontend-check`                       | Passed: 14 architecture tests, 22 frontend unit tests, 0 Astro diagnostics across 61 frontend files, 8-route/59-file build validation, and 68 browser tests; 38 visual cases skipped as designed                  |
| `npm run smoke:production-integration`                                                 | Passed: production-equivalent Django/Astro integration and direct untrusted Django HTTP redirect                                                                                                                  |
| `npm run smoke:production-topology`                                                    | Passed: gateway-only binding, public/API/staff/static/media/security behavior, client-IP separation, health checks, explicit jobs, and persistence across recreation                                              |
| `npm run smoke:integrated-qa`                                                          | Passed: complete source-stack verification, matched PostgreSQL/media backup, isolated restoration into separate disposable volumes, restored staff/public/API behavior, real 404, restrictions, and health checks |
| Gateway Nginx `nginx -t`                                                               | Passed through the Compose gateway image after the configuration move                                                                                                                                             |
| Host-example Nginx `nginx -t`                                                          | Passed with the unchanged example mounted read-only into the exactly pinned unprivileged Nginx image                                                                                                              |
| Relative Markdown link verifier                                                        | Passed: all 37 relative links across 18 Markdown files resolve to existing repository files                                                                                                                       |
| `git diff --check`                                                                     | Passed with no whitespace errors                                                                                                                                                                                  |

The integrated Lighthouse results were:

| Route                                       | Performance | Accessibility | Best practices | SEO |      LCP | CLS |
| ------------------------------------------- | ----------: | ------------: | -------------: | --: | -------: | --: |
| `/`                                         |          99 |           100 |             96 | 100 | 1,990 ms |   0 |
| `/en/`                                      |          99 |           100 |             96 | 100 | 2,047 ms |   0 |
| `/events/visual-fixture-featured-field/`    |          99 |           100 |             96 | 100 | 1,818 ms |   0 |
| `/en/events/visual-fixture-featured-field/` |          99 |           100 |             96 | 100 | 1,820 ms |   0 |

The first post-move browser-gate attempt stopped during formatting because generated `.astro`
type files were included by the new service-local formatter; they are now explicitly ignored as
generated output. The first root lint attempt exposed ESLint 10's working-directory boundary; the
root facade now invokes the frontend-owned pinned binary with its explicit service configuration.
Both corrections affect tooling scope only. Every successful result above was obtained afterward.

The staged-path audit also found that the full visual run had initially written eight duplicate
frequency-dial captures below the frontend service because those review paths were relative to the
old repository-root working directory. The visual test now resolves those destinations back to
the shared root `docs/review/` tree. The accidental duplicates were removed, the focused 1/1
capture above verified the corrected destination, and the authoritative screenshot content did
not change.

Production and public behavior remained visually and functionally identical, so no new review
screenshots were committed. The full visual suite and four-route Lighthouse audit passed against
the reorganized frontend. Real host/DNS/TLS, encrypted backup storage, monitoring, real owner
credentials, approved content, and original brand assets remain operator/owner validations from
the Phase 2 handoff; this path refactor does not claim or alter them.

---

# Post-Phase-2 frequency dial navigation validation

Validated on 2026-09-11 on `feat/frequency-dial-navigation`, created from merged Phase 2 checkpoint
9 baseline `3e995fe43d305a143b5b796b75e345ba2b6183e5`. This is a frontend creative refinement, not
checkpoint 10. It changes only the shared navigation presentation and behavior, its focused
frontend tests/evidence, the English primary About label, global header sizing/scroll containment,
and these implementation/validation records. Django, PostgreSQL, migrations, API contracts, event
behavior, public routes, metadata, sitemap behavior, proxy/CSP ownership, container topology,
production event content, and the Phase 2 handoff did not change.

## Frequency dial behavior and review

- The horizontal dial starts at the selected `64rem` breakpoint. The compact bar and full-screen
  vertical overlay cover 320, 390, and 768 px; 1024 and 1440 px use the horizontal presentation.
- The destinations remain Events, About, Policy, Visit, and `SQ / EN` in order. Route helpers and
  `alternateHref` preserve localized destinations. Event detail routes activate Events; the
  homepage leaves every primary station neutral.
- Active pages use one symbolic `7.83 Hz` value with textual and red station treatment. Keyboard
  focus uses a separate white station ring and underlined label. No drag/scrub or hover-dependent
  navigation exists.
- The nonce-loaded script supplies modal semantics, first-link focus, Escape and close-button focus
  restoration, Tab/Shift+Tab containment, inert background regions, body scroll locking, link
  close, and breakpoint reset. Without JavaScript, the server-rendered vertical dial remains
  visible and linked.
- Eight focused captures in `docs/review/frequency-dial-navigation/` were manually inspected for
  station/label alignment, active-frequency placement, the `Frekuence Club` spelling, focus
  visibility, safe-area spacing, 320 px clipping, overflow, and content overlap. The first review
  found a truncated 1024 px wordmark and overly broad focus outline; both were corrected before the
  committed captures. A later 320 px regression found inert page text contributing 15 px to root
  scroll width behind the overlay; clipping the inert background fixed it and the focused test
  passed.

## Commands actually run

| Command                                                          | Result                                                                                                                                                                                                         |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check`                                                  | Passed as a standalone final check: Prettier, ESLint, 0 Astro errors, warnings, or hints, and 34/34 unit tests                                                                                                 |
| `npm run build`                                                  | Passed: Astro Node build completed; production validation found 8 prerendered routes and 59 production files                                                                                                   |
| `npm run test:e2e`                                               | Passed: completed-source build plus 68/68 browser/integration/accessibility tests; 38 opt-in visual cases skipped as designed                                                                                  |
| `npm run test:visual`                                            | Passed: 38/38 captures, including the eight focused frequency-dial review states                                                                                                                               |
| `npm run audit:lighthouse:integrated`                            | Passed all four localized synthetic routes; exact results below                                                                                                                                                |
| `docker compose config`                                          | Passed with the existing topology unchanged                                                                                                                                                                    |
| `docker compose --profile tools run --rm --build frontend-check` | Passed: container formatting/lint, 0 Astro diagnostics across 65 container-visible files, 34/34 unit tests, 8-route/59-file build validation, and 68 browser tests; 38 opt-in visual cases skipped as designed |
| `git diff --check`                                               | Passed with no whitespace errors after documentation formatting                                                                                                                                                |

The integrated Lighthouse results were:

| Route                                       | Performance | Accessibility | Best practices | SEO |      LCP | CLS |
| ------------------------------------------- | ----------: | ------------: | -------------: | --: | -------: | --: |
| `/`                                         |          99 |           100 |             96 | 100 | 1,988 ms |   0 |
| `/en/`                                      |          99 |           100 |             96 | 100 | 1,967 ms |   0 |
| `/events/visual-fixture-featured-field/`    |          99 |           100 |             96 | 100 | 1,821 ms |   0 |
| `/en/events/visual-fixture-featured-field/` |         100 |           100 |             96 | 100 | 1,808 ms |   0 |

The browser suite covers Albanian/English routes, real 404 behavior, localized/event-detail active
state, destination order, alternate-language targets, 320/390/768/1024/1440 layouts, sticky
behavior, minimum targets, short-height reachability, focus containment/restoration, scroll lock,
breakpoint reset, reduced motion, no JavaScript, and page-level overflow. Automated browser and
visual evidence uses the configured Chromium project. Physical iOS/Android safe areas, Safari,
Firefox, and the real production host remain appropriate operator/device review; none was simulated
or claimed.

---

# Phase 2 checkpoint 9 final handoff validation

Validated on 2026-09-11 against exact merged checkpoint 8 application baseline
`e4ddbc3a3babe08381e1c4fe41b47bedf63e4209` on `feat/phase-2-handoff`. Checkpoint 9 changes
documentation only: the final handoff, current README/deployment state, implementation decision,
SEO launch boundary, and this evidence record. No frontend behavior, creative direction, Django
model or migration, API contract, container topology, security policy, event content, production
data, or post-Phase-2 feature changed.

## Checkpoint 9 commands actually run

| Command                         | Result                                                                                                                                                       |
| ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run check`                 | Passed after the formatting correction below: Prettier, ESLint, 0 Astro errors, warnings, or hints, and 34/34 unit tests                                     |
| `npm run build`                 | Passed: the complete check reran with 34/34 unit tests; Astro Node build completed; production validation found 8 prerendered routes and 58 production files |
| `docker compose config`         | Passed: the resolved gateway, Astro, Django, PostgreSQL, application/database networks, health checks, restrictions, and named volumes remain valid          |
| `git diff --check`              | Passed with no whitespace errors                                                                                                                             |
| Relative Markdown link verifier | Passed: 23 relative links across README, handoff, deployment, decisions, validation, and SEO documents resolve to existing repository files                  |

Preliminary `npm run check` attempts stopped at Prettier: first for one extra blank line inherited
in the merged checkpoint 8 report, then for the newly inserted checkpoint 9 report section.
`npx prettier --write docs/VALIDATION_REPORT.md` corrected only Markdown formatting. The successful
`npm run check` and `npm run build` results above were obtained after those corrections. No
application defect or behavior change was involved.

## Authoritative evidence and completion boundary

Checkpoint 8 remains the latest full integrated technical validation. Its final reviewed head is
`9696c16776aa113100f37e525e61eb3b4b1f24c7`, merged by the exact `main` commit identified above.
The checkpoint 8 section below remains authoritative for backend/frontend counts, browser and
visual review, Lighthouse budgets, integration/topology smokes, security controls, production-
image exclusions, and disposable matched database/media restoration. Checkpoint 9 did not rerun
those full gates and does not claim otherwise.

Phase 2 implementation checkpoints 1–9 are complete. Production launch is not signed off. Real
host deployment, DNS and TLS/Certbot, encrypted backup storage/retention and real-data restoration,
monitoring and alert delivery, owner staff credentials plus TOTP ownership/recovery, approved real
event facts/copy/poster rights, legal/contact/accessibility inputs, and approved original brand
assets remain owner/operator responsibilities. The exact boundary and responsibility map is in
`docs/PHASE_2_HANDOFF.md`; source inputs remain preserved in `docs/CONTENT_TODOS.md` and
`docs/BRAND_ASSET_TODOS.md`.

Future creative UI work is outside Phase 2 and must use a separate branch with validation that
preserves the established accessibility, responsive, localization/SEO, security, and performance
behavior. Checkpoint 9 adds no reservation, guest list, payment, customer account, analytics,
tracking, new event publication, or other post-Phase-2 capability.

---

# Phase 2 checkpoint 8 integrated QA validation

Validated on 2026-09-11 against `feat/phase-2-integrated-qa` from merged checkpoint 7 main
baseline `233dca94201b2c13e802a011b92c17dd97776313`. Checkpoint 8 adds integrated validation,
disposable backup/restore evidence, multi-route Lighthouse coverage, and useful synthetic review
captures. It does not add or change public product behavior, event data, database schema, gateway
routing, or deployment architecture. Checkpoint 9 was not implemented.

### Review follow-up rerun (2026-09-11)

The two checkpoint 8 review assertions were tightened without changing production behavior. The
integrated smoke now parses headerless `ps` user/command columns, requires at least one command
named exactly `postgres`, and rejects the result if any such process is not owned by `postgres`.
The no-JavaScript capture now waits for at least one deck poster and for every intercepted poster
to report both `complete` and a non-zero `naturalWidth` before it can become review evidence.

The follow-up was subsequently validated in a local Chrome- and Docker-capable environment.
`npm run check` passed with 0 Astro diagnostics and 34 unit tests. `npm run test:visual` passed
all 30 captures. The no-JavaScript screenshot was regenerated only after every intercepted deck
poster had decoded successfully with a non-zero `naturalWidth`; manual review confirmed that the
synthetic poster, event information, and event link are visibly rendered.
`npm run smoke:integrated-qa` passed the complete source-stack verification, PostgreSQL
process-ownership audit, matched PostgreSQL/media backup, isolated restoration of eight synthetic
event records, restored gateway verification, container restrictions, and service health checks.
`git diff --check` passed.

## Complete automated gates

| Gate                                                             | Result                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose config`                                          | Passed: the resolved production topology remains valid                                                                                                                                                                          |
| `docker compose --profile tools run --rm --build backend-check`  | Passed: Ruff format/lint; no pending migrations; Django system/deployment checks; migrations; 69 tests in 8.822 s; pip-audit found no known vulnerabilities                                                                     |
| `docker compose --profile tools run --rm --build frontend-check` | Passed: Prettier, ESLint, 0 Astro diagnostics, 33 unit tests, mixed Astro Node production build, 8-route/58-file output validation, and 43 browser/integration/accessibility tests; 30 opt-in visual tests skipped in this gate |
| `npm run test:visual`                                            | Passed: 30 captures across 320, 390, 1024, and 1440 px, including four checkpoint 8 evidence captures                                                                                                                           |
| `npm run smoke:production-integration`                           | Passed: production-equivalent Django HTTPS settings and five localized Astro routes using the synthetic empty-alt/empty-lineup fixture; direct untrusted HTTP redirected to HTTPS                                               |
| `npm run smoke:production-topology`                              | Passed: gateway topology, routes, API validators, media isolation, security headers, distinct Axes client lockouts, health, and recreation persistence                                                                          |
| `npm run smoke:integrated-qa`                                    | Passed: full synthetic event/security matrix through gateway plus matched database/media backup and isolated restore into a second disposable Compose project                                                                   |
| `npm run audit:lighthouse`                                       | Passed empty programme: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1,743 ms; CLS 0                                                                                                                    |
| `npm run audit:lighthouse:fixtures`                              | Passed synthetic event homepage: Performance 99, Accessibility 100, Best Practices 96, SEO 100; LCP 1,842 ms; CLS 0.000127                                                                                                      |
| `npm run audit:lighthouse:integrated`                            | Passed synthetic Albanian/English homepages and localized event details; every route met the 90/95/95/95 score floors, LCP below 2.5 s, and CLS below 0.1                                                                       |
| Gateway and host-example Nginx `nginx -t`                        | Passed inside the exactly pinned unprivileged Nginx image; gateway validation also runs in both topology smokes                                                                                                                 |
| `git diff --check`                                               | Passed with no whitespace errors                                                                                                                                                                                                |

The integrated Lighthouse results were:

| Route                                       | Performance | Accessibility | Best practices | SEO | LCP      | CLS      |
| ------------------------------------------- | ----------- | ------------- | -------------- | --- | -------- | -------- |
| `/`                                         | 99          | 100           | 96             | 100 | 1,803 ms | 0.000127 |
| `/en/`                                      | 99          | 100           | 96             | 100 | 1,908 ms | 0        |
| `/events/visual-fixture-featured-field/`    | 100         | 100           | 96             | 100 | 1,670 ms | 0.000127 |
| `/en/events/visual-fixture-featured-field/` | 100         | 100           | 96             | 100 | 1,677 ms | 0.000127 |

All Lighthouse fixture content was unmistakably synthetic and served only by the loopback mock
API. Reports under `test-results/` are generated local evidence and remain ignored rather than
being treated as production assets.

## Integrated functional and security coverage

The integrated smoke built one immutable tagged image set and used production Django HTTPS,
secure-cookie, non-default secret, and non-default PostgreSQL settings. Through the container
gateway it verified:

- Albanian and English homepages, event indexes, About, Policy, Visit, Privacy, localized event
  details, dynamic sitemap, staff login, public API, and a branded real 404;
- published-only list/detail data; indistinguishable API 404 bodies for unknown, draft, and
  intentionally unpublished slugs; no private fields or draft slugs in public HTML/API/sitemap;
- current/postponed, earliest upcoming, cancelled, featured upcoming, later upcoming, and past
  event ordering, homepage selection, separate index groups, lifecycle labels, and cancelled
  `MusicEvent` status;
- same-language canonical URLs, reciprocal `sq-AL`/`en` hreflang, localized Open Graph and Twitter
  data, managed derivative images, `MusicEvent` JSON-LD without fabricated offers, and published
  bilingual sitemap entries;
- list/detail ETags and conditional 304s, GET/HEAD/OPTIONS behavior, write-method 405s, static Admin
  CSS, processed WebP derivatives, and 404 isolation of the matching managed original;
- one changing request-specific Astro nonce CSP with no `unsafe-inline`/`unsafe-eval`, one copy of
  each gateway-owned security header, HSTS on trusted HTTPS, and Django HTTPS redirect behavior
  when the trusted scheme is absent;
- anonymous staff redirect/no-store, CSRF rejection, rejection of password-only staff login,
  rejection of a fully OTP-authenticated non-staff account, and successful TOTP staff Admin access
  after restoration. The backend gate and topology smoke retain detailed strong-password, MFA,
  authorization, upload-attack, Axes throttle, and separated client-IP regression coverage;
- only a loopback-bound gateway, no frontend/backend/database host ports, non-root gateway/Astro/
  Django processes, PostgreSQL workers owned by `postgres`, application read-only roots, dropped
  capabilities, and healthy gateway/frontend/backend/database services; and
- final frontend/backend image exclusion of source/test trees, development fixtures, source maps,
  environment files, Git metadata, PDFs/BrandBook, fixture identifiers, and runtime application or
  database secrets. Checked responses contained no private service hostname, traceback, or
  internal exception marker.

## Isolated backup and restoration

`npm run smoke:integrated-qa` used two PID-scoped Compose project names, `FREKUENCE_GATEWAY_PORT=0`,
separate named volumes, and one compatible immutable image set. It created eight synthetic event
records plus a generated red raster poster and TOTP test users in the source project, created a
matched custom-format PostgreSQL dump and media archive inside a private mode-0700 temporary
directory, and restored both into the distinct restore project. Migration compatibility and the
explicit `backend-static` job completed before restored services started.

The restored stack retained all eight records, randomized original metadata, processed
derivatives, TOTP devices and staff authorization. Its public/API routes, real 404, and all four
health checks passed. The source and restore gateway ports and database volumes were demonstrably
different. Cleanup accepted only the two generated project-name prefixes and removed their
containers, networks, volumes, and temporary backup directory; it did not touch development or
production data. This is a disposable procedural exercise, not evidence for a real encrypted
backup destination or production credentials.

## Accessibility and visual review

The browser gate passed 43 behavior, integration, metadata, and axe regressions. It covers 1440 px
desktop, 390 px mobile, the supported 320 px minimum, keyboard-only navigation and visible focus,
explicit touch/card selection, Escape behavior, reduced-motion presentation, JavaScript-disabled
fallback, landmarks/headings, equivalent event links, tap controls, and page-level overflow.

The 30-capture visual run was manually reviewed. Four useful checkpoint 8 captures are committed
under [`docs/review/phase-2-integrated-qa/`](review/phase-2-integrated-qa/README.md): event-led
homepage at 320 px, keyboard-focus deck at 1440 px, selected touch card at 390 px, and the no-script
fallback at 390 px. Review found no clipped primary copy, page-level horizontal overflow,
unreadable essential poster information, hidden focus, control overlap, insufficient tap access,
or hover-only event destination. Contrast and landmark semantics remain covered by axe and
Lighthouse. No candidate real poster or inferred event fact was used.

## Defects and checkpoint boundary

No material production behavior defect was found. Checkpoint 8 exposed evidence gaps rather than
an architecture flaw: no single test previously exercised the complete bilingual event-state and
security matrix, backup/restore stopped at persistence/recreation coverage, Lighthouse audited one
route per run, and minimum-width/interaction fallback evidence was not committed. The new
integrated smoke, verifier, regression tests, multi-route audit support, and captures close those
QA gaps without redesigning the application.

The initial integrated harness correctly stopped before restoration because its PostgreSQL
identity assertion inspected the root-owned init wrapper instead of the actual server process; the
test was corrected to require every PostgreSQL server process to run as `postgres`. A second test
assertion used uppercase text against semantically equivalent mixed-case HTML and was corrected.
Neither issue changed or weakened a production control.

Checkpoint 9 handoff was not implemented. There is still no reservation, payment, public account,
analytics, new event content, real publication, new gateway route, or database migration.

## Operator-required validation and remaining risk

These checks were not run and are not claimed: real production host access, public DNS, a real TLS
certificate/renewal, installed host Nginx reload, encrypted production backup destination and
retention, real production-data restoration, monitoring/alert delivery, owner staff credentials
and recovery, final event publication, legal/contact inputs, and approved original brand assets.
Exact safe commands and expected results are recorded in `docs/DEPLOYMENT.md` under “Operator-
dependent production signoff.”

Until those steps are completed, remaining launch risk is operational rather than a known local
code failure: certificate/DNS correctness, backup confidentiality and recoverability, alert
delivery, real staff MFA ownership/recovery, and content/asset approval are unproven in the target
environment. Do not treat this local integrated QA report as authorization to publish a real
event.

---

# Phase 2 checkpoint 7 validation

Validated on 2026-09-10 against `feat/phase-2-container-topology`, including the PR #6 client-IP,
deployment-scope, and isolated-restore static-volume review follow-ups. This checkpoint adds only
the container gateway, production network/volume topology, host proxy example, operational
lifecycle, and their regression coverage. Checkpoint 6 rendering and event behavior are preserved;
checkpoint 8 integrated QA is not included.

## Automated gates

| Gate                                                             | Result                                                                                                                                                                                                             |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker compose config`                                          | Passed: the resolved model contains one loopback-published gateway, explicit application/database networks, and no frontend/backend/database host binding                                                          |
| `docker compose --profile tools run --rm --build backend-check`  | Passed: Ruff format/lint; no pending migrations; Django system/deployment checks; migrations; 69 tests in 11.951 s; no known installed-environment vulnerabilities                                                 |
| `docker compose --profile tools run --rm --build frontend-check` | Passed: Prettier, ESLint, 0 Astro diagnostics, 29 unit tests, mixed Astro Node build, 8-route/58-file production-output validation, and 43 browser/integration/accessibility tests; 26 opt-in visual tests skipped |
| `npm run smoke:production-topology`                              | Passed: isolated production stack, distinct Axes client lockouts, forwarding-chain rejection, explicit migration/static jobs, gateway routes/security, all health checks, and persistence across recreation        |
| Gateway and host-example Nginx `nginx -t`                        | Passed inside the pinned unprivileged gateway image; the smoke also runs the gateway check before startup                                                                                                          |
| `npm run check`                                                  | Passed locally: formatting, ESLint, 0 Astro diagnostics across 65 files, and all 29 unit tests                                                                                                                     |
| `git diff --check`                                               | Passed with no whitespace errors                                                                                                                                                                                   |

The frontend browser gate reran the existing checkpoint 6 route, interaction, accessibility,
metadata, failure-state, 320–1440 px overflow, keyboard, touch, and reduced-motion regressions. No
visual markup or styling changed, so the opt-in screenshot suite was not rerun and no screenshots
were replaced. The 29 unit tests include a restore-workflow regression that requires the explicit
`backend-static` job to appear before restored gateway startup while preserving the exported
project, random-port, and compatible-tag scope.

## Production-topology coverage

The smoke uses a fresh Compose project with production Django HTTPS/secure-cookie settings,
non-default application/database credentials, and a random loopback host port. It proves:

- gateway is the sole host-bound service and is connected only to the application network;
- Astro, Django, and PostgreSQL have no host bindings, while all four services become healthy;
- Albanian/English homepages, event index, both localized event details, sitemap, and a real 404
  retain their status/content through gateway;
- the public event API retains its published-only representation, ETag, and conditional 304;
- anonymous `/staff/` redirects to the Django login boundary with `no-store`, secure/HttpOnly CSRF
  cookie behavior remains active, and collected Django Admin CSS is served;
- five failed staff logins from one sanitized forwarded IPv4 address lock only that
  username/address pair, a different address remains unlocked, and Axes stores separate attempt
  counts and audit addresses; a multi-value forwarding chain is replaced by a valid socket peer;
- a real randomized processed WebP derivative is served with immutable caching, while the matching
  managed original path returns 404;
- a 17 MiB staff request receives 413 at gateway, while ordinary public-page writes receive 405;
- trusted original HTTPS reaches Django without disabling `SECURE_SSL_REDIRECT`; an equivalent
  gateway request without the trusted scheme receives Django's public-host HTTPS redirect;
- dynamic HTML carries exactly one matching request-specific CSP nonce, changes nonce between
  responses, and contains neither `unsafe-inline` nor `unsafe-eval`;
- checked responses expose no private service hostnames, internal exception type, or traceback;
- forcing recreation of database, backend, Astro, and gateway without rerunning migrations or
  `collectstatic` retains the synthetic database record, derivative, and collected static asset;
- migration and static collection services remain removable `tools` profile jobs rather than
  normal startup services.

The synthetic event and 120 × 180 generated poster existed only in disposable project-scoped
database/media volumes. The smoke removed its containers, networks, and volumes on exit. It did not
read candidate posters, touch the development database, or publish a real event.

## Configuration and delivery decisions covered

- Pinned unprivileged gateway runtime; non-root user, dropped capabilities, read-only root,
  explicit tmpfs, health/restart/graceful-stop behavior, and read-only static/media mounts.
- Separate application and internal database networks with Django as the sole bridge.
- Same-origin Astro, API, staff, static, and derivative routing; all other media paths denied.
- Host-boundary forwarding-header replacement, gateway normalization, public-host redirects, safe
  proxy limits/timeouts, strict single-address Axes resolution, one normalized non-CSP
  security-header set, and exact Astro CSP pass-through.
- API cache/validator pass-through, staff `no-store`, conservative collected-static caching, and
  immutable hashed frontend/processed-media caching.
- Explicit migrations/static collection, named persistent volumes, one exported immutable tag set
  across deployment jobs/services, and an isolated restore sequence whose project, random port,
  and compatible tags remain exported for every command and whose explicit static collection
  completes before the restored gateway starts.

## Checkpoint boundary and known limitations

- Checkpoint 7 adds no migration, backend/API schema, frontend route/content/design, real event,
  reservation, payment, public account, analytics, Redis, Celery, worker, or custom staff UI.
- Checkpoint 8 integrated QA has not begun. This report does not claim a real host-Nginx/TLS
  deployment, Lighthouse/security signoff, production monitoring, or an operator-run encrypted
  backup restoration.
- Production backup destination, retention, owner, alerting, staff roster/MFA recovery, final
  event content/publication, legal inputs, and production brand assets remain documented owner
  limitations.

---

# Previous Phase 2 checkpoint 6 validation

Validated on 2026-09-10 against `feat/phase-2-astro-dynamic`. This checkpoint replaces the
transitional Astro event collection with server-side reads from the private Django API and adds
only the Astro dynamic migration. Checkpoint 7 routing and topology are not included.

## Automated gates

| Gate                                                             | Result                                                                                                                                                                                                                                          |
| ---------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose --profile tools run --rm --build backend-check`  | Passed: Ruff format/lint; no pending migrations; Django system/deployment checks; all migrations; 65 tests in 10.615 s; no known installed-environment vulnerabilities                                                                          |
| `docker compose --profile tools run --rm --build frontend-check` | Passed: Prettier, ESLint, 0 Astro diagnostics, 22 unit tests, mixed Astro Node build, production-output validation, and 43 browser/integration/accessibility tests; 26 opt-in visual tests skipped                                              |
| `npm run smoke:production-integration`                           | Passed: isolated production-configured PostgreSQL/Django/Astro stack; synthetic empty-alt/empty-lineup event rendered through five localized Astro routes; ordinary direct Django HTTP returned a 301 HTTPS redirect without the trusted header |
| `npm run test:visual`                                            | Passed: 26 visual captures at 320, 390, 1024, and 1440 px, including five checkpoint 6 PR captures                                                                                                                                              |
| `npm run audit:lighthouse`                                       | Passed empty API state: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1,374 ms; CLS 0                                                                                                                                    |
| `npm run audit:lighthouse:fixtures`                              | Passed synthetic event state: Performance 99, Accessibility 100, Best Practices 96, SEO 100; LCP 1,941 ms; CLS 0.000127                                                                                                                         |
| `docker compose build web` and loopback runtime smoke            | Passed: pinned Astro Node standalone image built; web/backend/database healthy; only web bound to `127.0.0.1:3010`; homepage, About, and dynamic sitemap returned 200; unknown event returned 404; dynamic CSP contained a per-response nonce   |

The gate figures above are recorded from the requested final reruns. The integration smoke created
one unmistakably synthetic published event only in fresh project-scoped database/media volumes and
removed those containers and volumes on completion. The development database was not changed, and
no real event was created or published for validation.

## Frontend and integration coverage

- Strict typed client validation for list/detail envelopes, localized public fields, reciprocal
  paths, date invariants, statuses/timing, and managed WebP derivative metadata only.
- Server-only origin validation, no credentialed URLs, a fixed trusted `X-Forwarded-Proto: https`
  header, redirect rejection, a configurable 250–5,000 ms timeout, one bounded safe retry, and a
  100-event-per-window ceiling that fails instead of silently truncating.
- API 404 to localized real 404 mapping; status/content-type/network/schema failures to designed
  localized 503 responses with `no-store` and no internal URL, exception, or private-record leak.
- Featured/earliest/current event selection, five-card limit, separate upcoming/past groupings,
  scheduled/postponed/cancelled labels, and genuine empty behavior.
- Django-valid empty optional poster alt text and lineup values are accepted. Empty lineups emit no
  homepage, card, or detail-section markup.
- Pointer, keyboard, explicit touch selection, Escape reset, no-JavaScript, reduced motion,
  navigation, reciprocal language links, minimum-width overflow, and axe accessibility coverage.
- Dynamic localized canonical/hreflang, Open Graph poster derivative, `MusicEvent` JSON-LD without
  fabricated offers, current published-event sitemap entries, and truthful sitemap failure.
- A fresh cryptographic CSP nonce on every dynamic response, matching nonce attributes on scripts
  and JSON-LD, and explicit absence of `unsafe-inline` and `unsafe-eval`.
- Production output confirms eight stable localized editorial routes plus the bilingual 404 are
  prerendered; event-dependent routes are not static files. The 58-file output contains no source
  maps, environment files, fixture text, internal API origin/path, or browser-facing API config.

## Visual evidence

Five representative captures and reproduction notes are committed under
[`docs/review/phase-2-astro-dynamic/`](review/phase-2-astro-dynamic/README.md). They show the
API-backed homepage and event detail at 1440 × 1000 and 390 × 844 plus the designed 503 state at
1440 × 1000. The API and poster data are unmistakably synthetic development fixtures. Manual
inspection found no clipping, page-level overflow, overlapping controls, or illegible primary
copy; the established Signal Interference composition remains intact.

## Checkpoint boundary and known limitations

- The final checkpoint 7 container gateway does not exist. The intermediate loopback-bound Astro
  Node `web` service talks directly to private Django; Django and PostgreSQL retain no host port.
- Managed poster URLs are same-origin `/media/` paths, but public derivative serving is deliberately
  deferred to checkpoint 7. Missing derivatives retain accessible event text and a branded visual
  fallback.
- The committed host Nginx bootstrap example still represents the previous static header policy.
  It was not changed because host-Nginx work is explicitly checkpoint 7; checkpoint 6 must not be
  publicly deployed until the proxy chain preserves Astro's nonce CSP without adding a competing
  policy.
- The client deliberately fails when either API window reports more than 100 events. Checkpoint 7
  and later operational review may introduce a bounded cache or pagination UX if the programme
  grows beyond that documented review ceiling.
- No public API route, `/staff/` route, media route, gateway, host-Nginx change, reservation,
  payment, public account, analytics, or new/real event content was implemented.

---

# Previous Phase 2 checkpoint 5 validation

Validated on 2026-09-10 against `feat/phase-2-read-only-api` after the pagination review follow-up.
This checkpoint adds only the published-only Django events API. Astro still reads its transitional
content collection, Django remains private, and no public route or visual design changed.

## Automated gates

| Gate                                                                                                                      | Result                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docker compose --profile tools run --rm --build backend-check`                                                           | Passed: Ruff format and lint; no pending migrations; Django system and deployment checks; all migrations; 65 tests in 7.394 s; installed-environment audit with no known vulnerabilities                                |
| `docker compose --profile tools run --rm --build backend-check python manage.py test tests.test_public_api --verbosity 2` | Passed: 17 focused public API tests in 0.660 s                                                                                                                                                                          |
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
- Bounded pagination with a default limit of 6, maximum limit of 20, and exact offset range of
  0–10,000. Boundary tests accept 10,000 and reject 10,001 plus a value above PostgreSQL's bigint
  range with 400/no-store and zero database queries. Pagination retains deterministic relative
  links and constant query budgets of two queries for list and one for detail.
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
