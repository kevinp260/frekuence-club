# Implementation decisions

## Phase 1 baseline

- The repository began as a clean slate containing only the implementation brief and brand
  book; there was no Git repository or existing application to adapt. The original brief is
  preserved in `docs/PHASE_1_IMPLEMENTATION_BRIEF.md` as historical context.
- Phase 1 began on Astro 7.2.4 with static directory-format output and trailing-slash canonicals.
  Checkpoint 3 updates the exact pin to 7.2.8, the smallest release patched for
  `GHSA-26w7-cxv4-gfx2`; no adapter or rendering-mode change is included.
- Albanian and English content share typed views and centralized data instead of duplicated
  markup.
- Interface icons use the pinned `@lucide/astro` package and render as accessible inline SVG
  during the static build; no icon font, CDN, or client-side icon runtime is used.
- The empty event collection is intentional. The build warning that no event Markdown files
  match is expected until the first genuine event is supplied.
- The former transitional Astro event schema denied external ticket hostnames by default. That
  schema was removed at checkpoint 6 when Django became the sole production event source; no
  public reservation, payment, or ticket control was introduced.
- The approved monochrome symbol and circular cymatic pattern are direct PDF exports and are
  isolated as temporary assets. The PDF itself is excluded from Docker build context and
  production output.
- The brand book's yellow/amber is not used as a UI token because its approved UI status has
  not been confirmed.
- No contact route, opening hours, accessibility claim, event, or legal-controller detail is
  invented. Draft legal content is visibly marked and documented as a launch blocker.
- Public TLS redirects and security headers belong to host Nginx. Container Nginx only serves
  static files and real 404 responses.
- The CSP allows one inline JSON-LD block by its exact SHA-256 hash. Recompute and review the
  hash in the host example whenever venue structured data changes.

## Phase 2 checkpoint 1 — architecture selections

Recorded on 2026-09-09. These selections define later checkpoints; no backend, database, Node
adapter, or dynamic API is introduced by checkpoints 1–3.

- **Repository layout:** keep the Astro frontend at the repository root to avoid a needless Phase
  1 move. Add Django later under `backend/`, with project configuration in `backend/config/` and
  the bounded event domain in `backend/events/`. Keep publication rules in an event service layer
  used by models, admin actions, serializers, and tests rather than duplicating them.
- **Frontend adapter:** adopt the official `@astrojs/node` adapter in standalone mode during
  checkpoint 6. Use on-demand rendering for the homepage and event routes, while explicitly
  prerendering stable About, Policy, Visit, Privacy, and error assets where the adapter permits.
  The frontend remains static through checkpoint 3.
- **Backend baseline:** target the supported Django 5.2 LTS series with PostgreSQL and Django REST
  Framework's URL-namespaced read-only API. Exact patch versions will be rechecked and pinned when
  checkpoint 4 starts; documenting a series here must not be treated as an installed dependency.
- **Poster processing:** use Pillow's current supported stable release with server-side decoded
  content verification, decompression-bomb warnings treated as errors, explicit byte/pixel bounds,
  metadata stripping, and WebP plus safe fallback derivatives. Do not expose original uploads as
  normal frontend images.
- **Staff MFA:** use `django-otp` with TOTP devices and an OTP-protected customized Django Admin.
  Enrollment and recovery remain staff-only operational procedures; email and SMS OTP are not part
  of the selected design. Production staff access is blocked until enrollment, recovery, and
  emergency-account procedures are documented and tested.
- **API shape:** use `/api/v1/events/` and `/api/v1/events/{slug}/`, with `locale=sq|en`,
  `when=upcoming|recent`, a bounded `limit`, and stable chronological ordering. List responses use
  an explicit `count`/`next`/`previous`/`results` envelope. Public serializers expose localized
  published fields and derivative metadata only; unpublished records are excluded in the base
  queryset and unknown or unpublished slugs share the same public 404 response.
- **CSP ownership:** host Nginx remains the final public CSP/header owner. Static editorial JSON-LD
  continues to use reviewed exact hashes. During dynamic migration, Astro will generate a
  per-response nonce for dynamic structured data and pass it through the trusted proxy chain for
  host Nginx to include in the final strict policy. The container gateway must overwrite untrusted
  inbound nonce/proxy headers and preserve the trusted upstream value; Django, the gateway, and host
  Nginx must not emit competing CSP policies. Broad `unsafe-inline` and `unsafe-eval` remain
  prohibited.

The adapter choice follows Astro's official Node and on-demand rendering documentation. Django
5.2 is an LTS release. Django REST Framework documents URL versioning and bounded pagination, and
Pillow's security guidance requires retaining pixel limits and handling decompression-bomb signals.
Recheck the exact dependency compatibility matrix at the checkpoint that adds each package.

## Phase 2 checkpoints 2–3 — visual and editorial foundation

- The new cyan, magenta, and green signal tokens are provisional decorative values sampled from
  the supplied club poster set. They are not semantic status/control colors, and final exact token
  approval remains an owner TODO.
- `assets/inspiration/` remains reference-only. The three generic poster files previously named
  `1.png`, `2.png`, and `3.png` were moved into `src/content/event-fixtures/` and renamed with a
  `.visual-fixture` marker. They are available only when `FREKUENCE_EVENT_FIXTURES=true`; the normal
  production loader excludes the entire fixture directory, and production validation scans built
  text for fixture leakage. No visible poster text has been converted into event content.
- While Astro content remains the transitional event source, a shared selection module chooses a
  valid featured published upcoming event or the earliest valid upcoming event, caps the secondary
  deck at five, and uses a separately labelled recent-past fallback only when no additional upcoming
  event exists. The empty homepage remains the zero-published-event branch.
- Event cards progressively enhance from an ordinary linked list into a deterministic overlapping
  hand. Pointer hover, keyboard focus, reduced motion, and explicit touch selection share the same
  readable action state. Localized prerendered detail routes preserve the final URL shape until the
  Django/API source replaces Astro content in checkpoint 6.
- The homepage no longer duplicates its former manifesto, policy summary, or visit summary.
- Human Hz and 7.83 editorial content now lives on localized About routes. The 7.83 explanation is
  explicitly symbolic and makes no medical or unsupported scientific claim.

## Phase 2 checkpoint 4 — backend foundation

- Django lives in `backend/`, with project configuration in `backend/config/` and the bounded event
  domain in `backend/events/`. Direct production dependencies are exactly pinned with hashes:
  Django 5.2.17, PostgreSQL driver psycopg 3.3.5, Pillow 12.3.0, django-otp 1.7.3,
  django-axes 8.3.1, Argon2, Gunicorn, and QR provisioning support. PostgreSQL 17.11 and Python
  3.13.14 images use immutable digests.
- PostgreSQL is authoritative for the backend Event domain. The existing Astro content collection
  remains the public site's transitional source until checkpoint 6; no partially connected data
  path was introduced.
- Event publication and feature replacement use a transaction-bound service. The service derives
  audit actors only from the authenticated request user, locks competing featured records, and
  emits structured transition logs. Model validation and database constraints independently guard
  timing, publishability, lifecycle consistency, and the single-feature rule where a database
  constraint is practical.
- Events use stable UUID primary keys and unique lowercase slugs; paired Albanian/English content;
  timezone-aware start, end, and optional doors instants; an ordered JSON lineup; separate
  publication and lifecycle states; server-managed publication/audit fields; and managed poster
  metadata. `past` is derived from `ends_at`, never stored.
- Staff use an event-only OTP-protected Django Admin at `/staff/`. Session authentication, CSRF,
  Argon2-first password hashing, a 14-character minimum password validator, least-privilege Event
  editor permissions, and username-plus-IP login throttling are enabled. TOTP QR provisioning
  refuses public media/static paths and never prints the device secret or enrollment URI.
- Poster ingestion accepts only verified JPEG, PNG, and WebP content. It applies 15 MiB and
  40-megapixel limits before full decode, rejects malformed/spoofed/SVG input, normalizes EXIF
  orientation, re-encodes the managed original without metadata, and generates randomized
  metadata-free WebP derivatives near 480, 960, and 1440 pixels plus a social derivative. Media
  replacement/deletion occurs only after database commit.
- The draft-only development fixture command requires an exact opt-in and runtime credentials,
  creates visibly synthetic content without using supplied posters, and is removed—along with tests
  and development dependencies—from the production backend image.
- Migrations are explicit deploy jobs rather than application-startup side effects. Backend,
  database, check, migration, fixture, static collection, and browser-review processes all run in
  Docker. Only the existing Astro container remains loopback-published at this checkpoint; final
  gateway routing belongs to checkpoint 7.
- Django environment selection fails closed to the explicit `development`, `test`, and `production`
  set. Production also rejects an empty PostgreSQL password and both documented development/default
  password values before application startup.
- The internal backend health probe keeps the public HTTPS redirect enabled. It uses the first
  configured exact allowed host and the trusted `X-Forwarded-Proto: https` signal for the private
  HTTP hop to Gunicorn; requests without that signal continue to redirect to HTTPS.

## Phase 2 checkpoint 5 — public read-only events API

- Django REST Framework 3.18.1 is an exact, hashed production dependency. The API is namespaced at
  `/api/v1/`, JSON-only, anonymously readable, and deliberately has no authentication parser or
  mutation surface. `GET`, `HEAD`, and `OPTIONS` are the only allowed methods; writes return 405.
- The list route is `/api/v1/events/`; detail is `/api/v1/events/{slug}/`. `locale` accepts exactly
  `sq` or `en` and defaults to Albanian. `when` accepts exactly `upcoming` or `recent`; `limit`
  defaults to 6 and is capped at 20. `offset` defaults to 0 and is capped at the practical maximum
  of 10,000 before queryset slicing. Unknown, duplicated, malformed, or out-of-range query
  parameters fail with a bounded 400 response without reaching PostgreSQL.
- Lists use a `count`/`next`/`previous`/`results` envelope with relative same-origin pagination
  links. Upcoming includes current events whose `ends_at` remains in the future and sorts by start
  ascending; recent contains ended events and sorts by start descending. UUID primary keys are the
  deterministic tie-breaker but are never serialized.
- Published cancelled events remain public and explicitly carry `status: cancelled`; this avoids
  hiding a cancellation notice. Lifecycle status and derived `timing` (`current`, `upcoming`, or
  `past`) remain separate. Postponed events likewise retain their status while timing comes only
  from timestamps.
- The base queryset applies the publication boundary before lookup. Unknown, draft, and otherwise
  unpublished slugs therefore return the same 404 body and do not disclose whether a private row
  exists. Serializers allowlist localized public fields; database identifiers, audit actors and
  timestamps, publication internals, other-language copy, original poster uploads, and storage
  paths are excluded.
- Poster JSON contains alt text and validated metadata for server-managed WebP derivatives only.
  A file must reside under the managed derivative prefix and have consistent positive dimensions
  in server-generated metadata before it is serialized.
- Successful representations use a strong SHA-256 ETag and
  `Cache-Control: public, max-age=60, stale-while-revalidate=300`; `If-None-Match` receives 304 when
  unchanged. Validation failures, not-found responses, method failures, and metadata responses use
  `no-store`. A content-derived validator was selected instead of `Last-Modified` so deletion or
  unpublication cannot leave an older validator apparently current.
- List requests use one count query and one bounded page query; detail uses one query. Explicit
  field selection, bounded slicing, and stable ordering prevent result-size and related-object
  query growth.
- The Astro frontend does not consume this API yet, Django remains private with no host binding,
  and no gateway route was added. Those integration and exposure decisions remain checkpoints 6
  and 7 respectively.

## Phase 2 checkpoint 6 — Astro dynamic migration

- The official `@astrojs/node` 11.1.5 adapter is exactly pinned and runs in standalone mode with
  Astro 7.2.8. Albanian/English homepages, event indexes, slug details, and `/sitemap.xml` render on
  demand. About, Policy, Privacy, Visit, and the bilingual 404 are explicitly prerendered and are
  verified as files in `dist/client`; dynamic event routes are verified absent from static output.
- Django/PostgreSQL is now the sole production event source. The transitional Astro Markdown
  records and collection configuration were removed. The three clearly named owner-supplied
  poster fixtures remain only for Playwright request interception, while a separate loopback mock
  emits visibly synthetic API data. Neither mechanism is imported into application code or copied
  into browser output.
- A centralized server-only client reads `FREKUENCE_EVENT_API_ORIGIN` at runtime, rejects embedded
  credentials and non-origin URLs, applies an integer timeout bounded to 250–5,000 ms, and permits
  at most two safe GET attempts. Private requests set the trusted public scheme header required by
  Django's production HTTPS configuration and reject redirects instead of following an unexpected
  target. Zod schemas use strict public-field allowlists, validate locale, paths, timestamps,
  lifecycle/timing values, and managed WebP derivative metadata, and convert dates only after
  validation. Django-valid empty poster alt text and lineups remain accepted; empty lineups are not
  rendered as meaningless UI sections. At most 100 events per window may be rendered; a larger API
  count fails truthfully with 503 instead of silently truncating output.
- Published API 404s map to localized event 404 pages with a real 404 status and no private-record
  distinction. Network, status, content-type, JSON, and contract failures map to localized 503
  pages with `no-store`; no internal exception or URL is rendered. Because all event content is
  server-rendered, there is no client loading state or browser API request: the response waits only
  for the bounded server read and then returns the complete page or designed failure state.
- Runtime poster markup uses only same-origin managed derivative paths and explicit dimensions.
  Missing/invalid derivative data retains all accessible event text and uses the branded poster
  fallback. The final gateway that serves `/media/` remains checkpoint 7, so public derivative
  delivery is intentionally not wired in this review checkpoint.
- Middleware creates a new cryptographically random nonce for every dynamic response and emits a
  strict CSP covering executable scripts and JSON-LD. Every dynamic script receives the matching
  nonce; `unsafe-inline` and `unsafe-eval` are absent. Checkpoint 7 must ensure the gateway and host
  preserve this policy without adding a competing CSP.
- The on-demand sitemap contains reciprocal Albanian/English entries for stable routes and the
  currently published event set; an API outage returns 503 rather than a stale or empty success.
  Browser-readable output is scanned for fixture copy, API paths/origins, environment files, source
  maps, and other non-production artifacts.
- The existing loopback-bound `web` service now runs unprivileged Astro Node and reaches the
  private Django service directly. This is the checkpoint 6 review topology only. No gateway,
  public Django/staff routing, host-Nginx change, reservation/payment path, or checkpoint 7 work is
  included.

## Phase 2 checkpoint 7 — container topology

- A dedicated gateway uses the exactly pinned
  `nginxinc/nginx-unprivileged:1.30.4-alpine3.24` image digest and runs as UID/GID 101. It is the
  only Compose service with a host binding:
  `127.0.0.1:${FREKUENCE_GATEWAY_PORT:-3010}:8080`. The former Astro binding is removed; Django and
  PostgreSQL remain unbound.
- Compose has explicit `application` and internal `database` networks. Gateway and Astro use only
  `application`; PostgreSQL uses only `database`; Django bridges both. Tool services receive only
  the network they need, and the self-contained frontend gate has networking disabled at runtime.
  This prevents gateway-to-PostgreSQL reachability without introducing another service.
- Gateway proxies public pages and versioned frontend assets to Astro, and `/api/` plus `/staff/`
  to Django. It serves the collected static volume and only
  `/media/events/derivatives/` from read-only mounts. Every other `/media/` path returns 404, even
  when the requested managed original exists.
- The host Nginx template is the trusted public boundary. It replaces rather than appends the
  client forwarding chain and overwrites host, scheme, port, and real-IP headers. Gateway accepts
  only exact `http`/`https` scheme values from that loopback boundary, forwards only one
  syntactically plausible client address without appending a chain, and falls back to the socket
  peer for missing, multi-value, or malformed input. Django Axes 8.3.1 uses its supported
  `AXES_CLIENT_IP_CALLABLE` hook to validate and canonicalize that value with Python `ipaddress`,
  then falls back to a valid socket address or no address. This resolved value supplies Axes'
  username/address lockout keys and access-attempt audit records. Gateway also clears generic
  `Forwarded`, request CSP, and request nonce headers. Missing or malformed scheme input becomes
  HTTP, preserving Django's production HTTPS redirect and secure cookies.
- CSP ownership is refined from the checkpoint 1 plan: Astro itself emits the complete strict
  per-response nonce policy for dynamic pages. Gateway and host Nginx pass that response header
  unchanged and emit no CSP of their own, avoiding intersecting/obsolete policies. Gateway removes
  duplicate upstream frame, MIME-sniffing, referrer, permissions, cross-origin-opener, and HSTS
  headers before emitting one consistent set; HSTS is present only for a trusted original HTTPS
  request.
- The default request-body limit is 1 MiB and the staff route permits 16 MiB total, leaving bounded
  multipart overhead above the independently enforced 15 MiB poster-file limit. Connect timeout is
  5 seconds, normal proxy reads/sends are 35 seconds, and staff reads/sends are 60 seconds. Public
  and static paths reject non-read methods at the gateway; the Django API retains its native
  GET/HEAD/OPTIONS and 405 contract, while Admin retains its form/CSRF methods.
- API caching and strong ETag/304 responses pass through without a proxy cache. Staff responses are
  forced to `no-store`, unversioned collected static uses a conservative one-hour cache, and
  randomized processed derivatives plus hashed Astro assets use a one-year immutable cache.
- PostgreSQL, original/processed media, and collected static remain named volumes. The gateway
  mounts media/static read-only. Migrations and `collectstatic` remain explicit `tools` profile jobs
  and are absent from all normal startup commands; accounts and development fixtures likewise
  remain explicit operations. Deployment documentation exports one immutable gateway/web/backend
  tag set across build, migration, static collection, and startup. Isolated restoration likewise
  exports a unique Compose project, random gateway port, and compatible immutable tag set across
  its entire command sequence so it cannot reuse live ports or volumes; its explicit static
  collection job populates the isolated static volume before the restored gateway starts.
- Checkpoint 7 adds no model, migration, frontend behavior, event content, Redis, worker,
  reservation, payment, or custom staff-application work. A real host/TLS deployment, an
  operator-run encrypted backup/restore exercise, monitoring, and the documented owner inputs
  remain outstanding.

## Phase 2 checkpoint 8 — integrated QA

- Integrated validation uses only synthetic records created at runtime in disposable, uniquely
  named Compose projects. The matrix covers current/postponed, earliest upcoming, cancelled,
  deliberately featured, later upcoming, past, draft, and intentionally unpublished states in
  both locales. It never reads candidate posters or publishes a real event.
- `npm run smoke:integrated-qa` builds one immutable production image set, deploys a disposable
  source stack, exercises the complete public/API/staff/security matrix through the gateway,
  creates a matched PostgreSQL/media backup in a mode-0700 temporary directory, and restores it
  into a different Compose project with separate volumes and a different random loopback port.
  It verifies restored records, derivatives, TOTP staff access, public/API routes, a real 404, and
  all service health checks before deleting only its validated disposable resources.
- The integrated smoke inspects final frontend and backend images for source trees, tests,
  development fixtures, source maps, environment files, Git metadata, PDFs, fixture identifiers,
  and runtime secrets. It also confirms non-root application processes, dropped capabilities,
  read-only application filesystems, private internal services, and a loopback-only gateway.
- Lighthouse can now audit a bounded comma-separated set of same-origin routes in one isolated
  synthetic run. Checkpoint 8 covers Albanian/English homepages and both localized event details;
  per-route reports are transient test output rather than committed generated artifacts.
- Four useful synthetic screenshots record minimum-width layout, keyboard focus, explicit mobile
  card selection, and the JavaScript-disabled event fallback. Existing browser tests remain the
  authoritative interaction/accessibility regressions; screenshots are review evidence rather
  than image snapshots used to approve content.
- No production application behavior, model, migration, API contract, event content, reservation,
  payment, public account, analytics, or handoff automation was added. Checkpoint 9 was not
  implemented. Real DNS/TLS, encrypted production backup storage/restoration, monitoring, owner
  staff credentials, final content, legal inputs, and approved source brand assets still require
  operator or owner validation.

## Phase 2 checkpoint 9 — final handoff

- Checkpoint 9 is documentation-only. It adds the concise final handoff, reconciles current-state
  README/deployment/SEO wording, and records owner/operator responsibilities without changing
  frontend behavior, creative direction, backend models or migrations, API contracts, container
  topology, security policy, event content, or production data.
- Checkpoint 8 remains the latest full integrated technical validation. Checkpoint 9 runs only its
  documented formatting, diagnostics, unit/build, Compose-model, whitespace, and Markdown-link
  checks; it does not restate those results as a new visual, Lighthouse, security, or integrated
  smoke run.
- Phase 2 implementation is complete when this checkpoint is merged. Production launch approval
  remains conditional on the real-host, DNS/TLS, encrypted backup/restore, monitoring, named staff
  MFA ownership/recovery, content/legal, event-publication, and original-brand-asset inputs listed
  in `docs/PHASE_2_HANDOFF.md` and the existing TODO inventories.
- Future creative UI refinement is outside Phase 2 and requires a separate branch. It must
  preserve the validated accessibility, 320 px responsive floor, reduced-motion/no-script and
  keyboard/touch behavior, bilingual SEO/status semantics, proxy/CSP boundaries, production-output
  exclusions, and performance budgets, with validation proportional to the actual change.

## Post-Phase-2 creative refinement — frequency dial navigation

- This is a frontend-only creative refinement after the completed Phase 2 handoff; it is not a
  checkpoint 10. It changes the shared header navigation and focused frontend coverage without
  changing public routes, event behavior, metadata, the API/backend, container topology, security
  ownership, production content, or the Phase 2 handoff.
- `64rem` is the single navigation breakpoint. At and above it, the header presents one horizontal
  frequency dial. Below it, the compact bar progressively enhances into an opaque, internally
  scrollable modal navigation with focus containment, Escape/close-button restoration, scroll
  locking, safe breakpoint reset, and reduced-motion behavior.
- Events, About, Policy, and Visit remain the four primary content destinations, in that order.
  The `SQ / EN` alternate-language link is a separate two-position selector outside the dial. The
  symbol and `FREKUENCE CLUB` wordmark remain one localized-home link; Privacy remains in the
  footer.
- Every active content route uses the same symbolic `7.83 Hz` value, red station, and textual
  active treatment. The homepage keeps the primary stations and compact indicator neutral; event
  detail routes continue to activate Events. Language selection is not represented as a tuning
  station or active frequency.
- The scale is visual language, not an input model. Dragging, scrubbing, swiping, double-tap
  behavior, per-route frequency values, continuous animation, canvas, and WebGL are deliberately
  excluded; every destination remains an ordinary semantic link.
- The compact toggle is progressive enhancement. Without JavaScript, the server-rendered vertical
  dial remains visible and every destination is usable. With JavaScript, the existing nonce-loaded
  navigation script applies modal semantics and focus/scroll behavior without introducing another
  frontend runtime or inline executable code.
- Validation results and focused captures are recorded in `docs/VALIDATION_REPORT.md` and
  `docs/review/frequency-dial-navigation/`. Automated browser coverage uses the configured Chromium
  project; physical iOS/Android safe-area behavior and other browser engines remain useful
  pre-production device checks rather than claimed evidence.

## Post-Phase-2 creative refinement follow-up — segmented frequency scale

- The frequency dial no longer uses a continuous baseline. Each desktop destination and the
  compact indicator instead owns one repeated interval: a shared rounded `2px` major separator at
  each boundary, exactly two shorter rounded ticks on either side, and the station centered between
  them. Each interval is divided into six equal gaps, so the spacing remains uniform as the
  available width changes.
- The complete scale starts and ends with a three-gap terminus: one empty edge gap, one deliberately
  faded short tick, one normal short tick, and only then the first shared major separator. The order
  is mirrored after the final separator, so neither major line touches a navigation edge.
- The full-screen compact menu rotates the same equal-gap interval and termini vertically. Each
  mobile link fills its allocated grid row so the marks do not collapse around the station.
  Adjacent destinations share their major boundary, while each ordinary link, active route, focus
  state, and symbolic `7.83 Hz` label retains the previously validated semantics and behavior.
- Long horizontal header and overlay chrome was removed with the baseline. Purposeful vertical
  dividers between the brand, dial, and compact menu control remain because they communicate
  control grouping rather than frequency continuity.
- The `64rem` breakpoint, semantic-link interaction model, progressive-enhancement fallback,
  reduced-motion treatment, active-route rules, routes, localization, and navigation script remain
  unchanged. Dragging and scrubbing remain deliberately out of scope.
- Browser regression coverage asserts equal consecutive gaps, the segment count, four minor ticks
  per destination, faded outer termini, rounded major separators, shared boundaries, full-height
  mobile intervals, compact/overlay parity, removed header edge lines, and layout safety. Updated
  captures remain in
  `docs/review/frequency-dial-navigation/`.

## Post-Phase-2 creative refinement follow-up — travelling dial cursor

- Normal same-origin navigation uses one decorative cursor that travels from the current station
  to the selected station over `200ms` before the browser follows the ordinary link. The outgoing
  route remains a normal multi-page Astro document; no client router, animation package, state
  library, or third-party runtime was added.
- Desktop movement transitions the cursor's horizontal position. The enhanced mobile overlay uses
  the same element and timing on its vertical axis. On the homepage, the initially hidden cursor
  begins at the inner leading terminus so selecting a destination still reads as tuning into the
  dial rather than a station appearing from nowhere.
- The cursor and target label use signal-red for content destinations. The alternate-language link
  sits outside the dial as a compact segmented selector, visually identifies the current locale,
  and retains its localized alternate-page accessible name and route. It is deliberately excluded
  from cursor movement and follows native link navigation immediately.
- Only unmodified primary-button activations to another same-origin station receive the short
  visual delay. Current-page, modified, non-primary, external, download, and targeted navigation
  retains native browser behavior. Repeated activation is suppressed only while the single
  `200ms` tuning movement is already in progress.
- Reduced-motion preference bypasses interception and navigation proceeds immediately. Without
  JavaScript, links also follow their native behavior. The cursor is decorative and hidden from
  assistive technology; link semantics, focus treatment, mobile focus containment, and the
  progressive-enhancement fallback are unchanged. Page lifecycle handling clears transient tuning
  state so browser back/forward restoration returns the cursor to the server-rendered active
  station.

## Post-Phase-2 repository organization — service directories

- First-party runtime code is organized under `services/`: Astro in `services/frontend/`, Django
  in `services/backend/`, and the private container gateway in `services/gateway/`. PostgreSQL
  remains a pinned upstream Compose image and does not receive an empty source directory.
- Root owns shared concerns: Compose and environment placeholders, documentation, candidate and
  reference assets, host deployment configuration, cross-service smoke scripts, and architecture
  contract tests. Browser-based staff review and the containerized frontend gate live under
  `tools/` rather than pretending to be runtime services.
- The root npm package is a dependency-free command façade. Astro dependencies and their lockfile
  belong to the frontend service; the staff visual tool has its own minimal exact pin and lockfile.
  Existing root command names remain available, with `npm run setup` as the explicit service
  bootstrap step.
- Compose service names, image tags, internal DNS names, ports, networks, named volumes, security
  restrictions, health checks, deployment order, public routes, and application behavior are
  intentionally unchanged. Production build contexts are narrowed to the owning service; the
  repository-wide frontend-check tool alone uses a filtered root build context.
- Historical checkpoint path statements remain unchanged because they accurately describe the
  repository when those decisions landed. This section is the authoritative current path map.

## Post-Phase-2 staff access and optional TOTP refinement

- The owner approved a deliberate change from the Phase 2 mandatory-TOTP baseline: TOTP is optional
  per individual staff account, including superusers. Password authentication, strong-password
  validation, session/CSRF protection, staff authorization, Axes throttling, sanitized client-IP
  attribution, and the absence of public signup remain unchanged. This usability trade-off is
  explicit; production access reviews should record which accounts have enabled the stronger
  control.
- Password and authenticator verification are separate screens. A confirmed TOTP device always
  triggers the second step; an account without one completes password-only sign-in. Partial login
  state is server-side, expires after 15 minutes or five rejected authenticator codes, and never
  creates an authenticated session before successful token verification. Reaching the attempt
  limit discards the partial state and requires the password step again.
- Staff authorization uses five fixed presets over Django groups/permissions rather than exposing
  Django's granular permission picker: Event viewer, Event editor, Event manager, Staff manager,
  and Superuser. Editors work on drafts; managers additionally publish, feature, unpublish, and
  delete events. Staff managers can maintain lower-role accounts but cannot see or affect another
  Staff manager or a Superuser, assign their own role, or elevate access. Only a superuser can grant
  or maintain Staff manager or Superuser access. User deletion remains disabled; deactivation
  preserves event audit history.
- Superusers and delegated Staff managers create named accounts in the focused Admin. New accounts
  start with an unusable password and receive a one-time setup link that expires after 24 hours.
  The raw random token is displayed once in the URL fragment, cleared before submission, stored
  only as an HMAC digest, protected by CSRF when claimed, and never sent by an application email
  service.
- Setup asks the recipient to choose a strong password and explicitly offers authenticator setup or
  an optional skip. Authenticated users can later enable TOTP under Account security, or disable it
  only after re-entering both their password and a current token. Disabling changes the password
  hash so other sessions become invalid while the current session is preserved.
- Another authorized account manager can recover a permitted target after device loss by
  re-authenticating and issuing a replacement setup link. Recovery invalidates the target
  password/sessions and removes its TOTP devices. Staff managers cannot recover another Staff
  manager or a Superuser; self-reset is rejected, recovery codes are not introduced, and the
  existing private-file `provision_totp` command remains an operator fallback rather than the
  routine onboarding path.
- Staff UI work remains a restrained Django Admin customization: clearer password/OTP/setup forms,
  corrected dashboard contrast, visible focus, and reusable account-security controls. It is not a
  parallel staff application and changes no event, API, frontend, or container-topology contract.
