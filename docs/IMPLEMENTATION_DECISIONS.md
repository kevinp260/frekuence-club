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
  only exact `http`/`https` scheme values from that loopback boundary, rebuilds upstream forwarding
  headers, and clears generic `Forwarded`, request CSP, and request nonce headers. Missing or
  malformed scheme input becomes HTTP, preserving Django's production HTTPS redirect and secure
  cookies.
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
  remain explicit operations.
- Checkpoint 7 adds no model, migration, frontend behavior, event content, Redis, worker,
  reservation, payment, or custom staff-application work. Checkpoint 8 integrated QA, a real
  host/TLS deployment, an operator-run encrypted backup/restore exercise, monitoring, and the
  documented owner inputs remain outstanding.
