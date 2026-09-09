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
- External ticket hostnames are denied by default. An owner-approved hostname must be added to
  `src/data/tickets.ts` before an external ticket URL validates.
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
