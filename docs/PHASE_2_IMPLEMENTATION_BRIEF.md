# Frekuence Club Website — Phase 2 Implementation Brief

## 1. Status and purpose

This is the active implementation specification for Phase 2 of the Frekuence Club website.
Phase 1 remains the working baseline and is documented in
`docs/PHASE_1_IMPLEMENTATION_BRIEF.md`, but its static-only restrictions no longer define the
approved target architecture.

Phase 2 has two connected goals:

1. Evolve the visual direction from a literal brand-book presentation into an original,
   frequency-led digital identity that still belongs unmistakably to Frekuence Club.
2. Allow authorized club staff to publish and maintain events and poster artwork without a
   frontend rebuild.

An implementation agent must read `AGENTS.md`, this brief, the current code, existing tests,
deployment documentation, the brand book, `assets/inspiration/`, and `assets/posters/` before
changing application code. Preserve unrelated work and report genuine conflicts.

Use stable, supported releases available at implementation time. Pin direct dependencies and
commit lockfiles. Verify any version-sensitive framework, security, image-processing, or proxy
guidance against current official documentation.

## 2. Confirmed product decisions

| Decision | Approved direction |
| --- | --- |
| Venue | Frekuence Club, Kompleksi Fari, Tiranë, Albania |
| Public domain | `https://frekuence.club` |
| Languages | Albanian (`sq-AL`) at root; English under `/en/` |
| Age restriction | Strictly 18+; physical ID required |
| Brand phrase | `Club calibrated at 7.83 Hz` |
| Entry model | Admission is approved at the door before payment |
| Reservations | Not available in this phase; non-interactive “coming soon” text is allowed |
| Online payments | None in this phase |
| Public homepage | Events first; no longer a general venue summary |
| Editorial content | Existing manifesto and 7.83 material move to a Who we are / About page |
| Event ownership | Club staff maintain events and posters through Django |
| Hosting | Entire application stack in Docker behind existing host Nginx |
| Frontend | Preserve Astro; use server rendering only where dynamic event data requires it |
| Administration | Customized Django Admin first; custom CRUD UI only after demonstrated need |

## 3. Scope

### 3.1 Included

- A redesigned, event-led homepage.
- A featured next-event presentation followed by an expressive deck of up to five event posters.
- Localized event indexes and localized event detail pages.
- A standalone About / Who we are page containing the current Human Hz manifesto and 7.83 story.
- A restrained abstract visual system based on frequencies, waves, phase, interference,
  chromatic registration, contours, and halftone texture.
- Django, PostgreSQL, a read-only public event API, authenticated event administration, and a
  secure poster upload/derivative pipeline.
- Astro server rendering for current event data, while stable editorial/legal pages remain
  prerendered where practical.
- Dynamic localized SEO metadata, event structured data, event social cards, and sitemap entries.
- Dockerized development and production topology compatible with host Nginx.
- Automated tests, browser/visual review, deployment documentation, and rollback instructions.

### 3.2 Explicitly excluded

- Reservations and guest-list submissions.
- Table bookings.
- Online payments, checkout, ticket issuance, QR tickets, refunds, or GoWild integration.
- Public customer accounts.
- A full custom staff application separate from Django Admin.
- Contact forms, embedded Instagram feeds, embedded Google Maps, analytics, marketing pixels, or
  consent-requiring cookies.
- Redis, Celery, or a worker service without an implemented asynchronous requirement.
- WebGL, canvas effects, heavy animation runtimes, autoplay audio, autoplay video, and literal
  strobe/flicker effects.
- Invented event facts or automatic publication based only on text visible in poster artwork.

## 4. Current implementation assessment

The existing implementation is a high-quality Phase 1 base and should be adapted rather than
discarded. Preserve its established strengths:

- Astro with strict TypeScript and native components.
- Typed centralized routes, venue data, and Albanian/English copy.
- Self-hosted typography and first-party assets.
- Semantic markup, keyboard access, visible focus, reduced-motion handling, and responsive
  behavior.
- Localized metadata, canonicals, hreflang, robots, sitemap, structured data, and a real 404.
- Exact dependency pinning, layered validation, visual tests, Lighthouse checks, and a minimal
  unprivileged Docker runtime.

The following Phase 1 assumptions must change deliberately:

- `src/views/HomeView.astro` currently acts as a venue summary and duplicates information from
  other pages. It must become event-led.
- `src/components/EventCollection.astro` and `src/content.config.ts` currently make Astro content
  files authoritative. They become migration references and are replaced by the Django event
  source for production reads.
- The existing static event build cannot reflect staff changes immediately. Event-facing routes
  need Astro on-demand rendering through a supported Node adapter.
- Static page-key metadata in `BaseLayout.astro` is insufficient for event-specific canonical,
  hreflang, Open Graph, status, and JSON-LD data and must be refactored without regressing static
  pages.
- The current build-time sitemap cannot discover events added after a build and must be replaced
  or complemented by a dynamic event-aware sitemap.
- The current static CSP hash for venue JSON-LD cannot cover dynamic event JSON-LD. Adopt a strict
  per-response nonce/hash strategy rather than weakening the policy.

## 5. Creative direction: Signal Interference

### 5.1 Design idea

The site should move from reproducing brand-book layouts toward expressing what Frekuence means
digitally: separate signals enter, overlap, interfere, and become a shared field.

The visual result should feel editorial, physical, rhythmic, slightly imperfect, and controlled.
It should not resemble a generic neon nightclub template, a streaming-service interface, or a
technology dashboard.

### 5.2 Preserve

- Approved logo and symbol use.
- Montserrat unless licensed replacement font files are supplied.
- Core black, white/linen, slate, and signal-red palette.
- Strong typographic hierarchy, sharp geometry, borders, open space, and poster-led compositions.
- The existing focus, contrast, motion, and responsive-accessibility standards.

### 5.3 Approved visual extension

Create an original system using three reusable primitives:

1. **Chromatic registration frame** — a black or linen title slab with two offset color planes or
   outlines, inspired by imperfect print registration. Use it for large page-title moments, not
   for every heading.
2. **Frequency field** — an SVG component with a small number of line/contour variants. It may be
   static or drift slowly through transforms and opacity. It must be deterministic, lightweight,
   decorative, and hidden from assistive technology.
3. **Signal divider** — a compact waveform, phase marker, coordinate rail, or interference band
   used to connect sections and metadata.

Use named decorative tokens for cyan, magenta, and green sampled from approved club poster
artwork. Keep functional text, focus, status, and controls within accessible core-brand
combinations. Do not apply uncontrolled rainbow gradients.

Possible page variants:

- Events: amplitude lines, signal numbering, and overlapping poster planes.
- About: concentric/cymatic fields resolving into a wave or shared interference pattern.
- Policy: a quieter gated grid or clipped waveform, communicating boundaries rather than chaos.
- Visit: coordinates, directional marks, and radar-like contours without embedding a map.

The poster remains the dominant artwork on event surfaces. Frequency graphics should create
depth and continuity around it, not reduce legibility or compete for attention.

### 5.4 Asset rules

- `assets/inspiration/` is reference material only. Do not ship, copy, trace, or closely reproduce
  an image unless its production rights are confirmed.
- `assets/posters/` contains candidate event artwork. Posters may guide proportions, color tokens,
  and test layouts, but they are not sufficient evidence that an event is approved for public
  listing.
- Several source posters are multi-megabyte PNGs. Preserve an approved original in managed media
  storage and serve optimized responsive derivatives to the public site.
- Never alter or animate the Frekuence logo. Frequency motion belongs around the identity, not on
  it.

### 5.5 Motion and accessibility

- Never animate flashes, contrast reversals, or large red/white fields at 7.83 Hz. The number is a
  brand concept, not a temporal animation instruction.
- Prefer slow transforms, phase drift, path movement, opacity changes, and hover/focus elevation.
- Disable nonessential motion under `prefers-reduced-motion: reduce` and retain a designed static
  composition.
- All content and links must remain available without JavaScript.
- Decorative SVGs use `aria-hidden="true"` and cannot enter the focus order.
- Test contrast over every moving or layered background. Put readable text on a stable solid
  surface when needed.

## 6. Information architecture and routes

Preserve trailing-slash canonical URLs.

| Albanian | English | Rendering | Purpose |
| --- | --- | --- | --- |
| `/` | `/en/` | On demand | Next event and secondary event deck |
| `/events/` | `/en/events/` | On demand | Published upcoming events and recent/archive access |
| `/events/{slug}/` | `/en/events/{slug}/` | On demand | Localized event detail |
| `/about/` | `/en/about/` | Prerendered | Who we are, Human Hz, manifesto, and 7.83 story |
| `/policy/` | `/en/policy/` | Prerendered | Entry policy and code of conduct |
| `/visit/` | `/en/visit/` | Prerendered | Address, access, practical details, Maps/Instagram links |
| `/privacy/` | `/en/privacy/` | Prerendered | Public-site privacy information |
| `/404.html` | Same design | Static/fallback | Branded real not-found response |
| `/staff/` | Not localized | Django | Authenticated staff administration |
| `/api/v1/events/` | Locale parameter | Django | Published event list data |
| `/api/v1/events/{slug}/` | Locale parameter | Django | Published event detail data |

Add About to the primary navigation. Prefer the clear navigation labels `Rreth nesh` and
`Who we are`; the display heading may remain the more distinctive `Human Hz`.

The language switcher on an event detail page must preserve the event slug and navigate to the
equivalent localized detail page. If a translation is unavailable under an explicitly approved
future policy, do not advertise a nonexistent alternate with hreflang.

## 7. Homepage specification

The homepage has one primary job: show what is happening next.

### 7.1 Section one: Next Signal

Begin immediately below the global header with the next event. Do not place a generic club hero
or manifesto before it.

Required content:

- Event poster.
- Event title.
- Localized date, start time, and optional doors time in `Europe/Tirane`.
- Lineup when supplied.
- Concise summary.
- Lifecycle status when postponed or cancelled.
- A clear `Shiko eventin` / `View event` link.
- Secondary, truthful 18+ and door-admission context.

Selection rule:

1. Use the explicitly featured event only when it is published, scheduled/postponed as
   appropriate, and upcoming.
2. Otherwise use the earliest published scheduled/postponed upcoming event.
3. Never use a draft, cancelled event, or past event as the primary next event.

The poster may dominate the viewport, but all operational information must also be real text in
the document. Ensure the LCP poster has explicit dimensions, responsive sources, and appropriate
fetch priority.

### 7.2 Section two: Event deck

Show at most five additional published event cards, composed like a controlled hand of playing
cards rather than a uniform grid.

- Use deterministic index-based rotation, translation, and stacking values. Do not randomize the
  composition on each request or hydration.
- Desktop pointer hover raises the card slightly, reduces its angle if useful, promotes its
  stacking layer, and reveals the event action.
- Keyboard focus produces an equivalent state and never hides the focus ring.
- Touch uses an explicit card-selection control with `aria-expanded`; the selected card rises and
  reveals a separate, clearly labelled event-detail link. Do not make users guess that two taps
  are required to follow a link.
- With JavaScript disabled, render a readable list with all event links visible.
- Under reduced motion, state changes may occur without animated transitions.
- Prevent body-level horizontal overflow at 320 px. Controlled clipping inside the deck or an
  intentionally labelled horizontal region is acceptable if keyboard and touch access remain
  complete.
- Titles, dates, and lifecycle state remain available to assistive technology even when the
  visual card face is primarily a poster.

The secondary dataset should not mix past and future events under an ambiguous heading:

- When additional upcoming events exist, label the deck `Në radar` / `On the radar` and use those
  events in chronological order.
- When no additional upcoming events exist, show up to five recent published past events under
  `Frekuencat e kaluara` / `Past frequencies`.
- If no published events exist at all, omit fake cards and show a designed `Sinjali i radhës po
  vjen` / `Next signal incoming` state with a normal Instagram link.

### 7.3 Homepage exclusions

Remove the manifesto, policy summary, and visit summary from the homepage. Do not replace them
with different duplicated summaries. The footer and primary navigation provide access to those
destinations.

## 8. About / Who we are page

Create a simple editorial page at `/about/` and `/en/about/`.

Recommended hierarchy:

- Navigation/eyebrow: `Rreth nesh` / `Who we are`.
- Display H1: `Human Hz`.
- Existing manifesto lead and body migrated from the homepage.
- Existing signal progression language.
- `Club calibrated at 7.83 Hz` as a distinct visual/content section.
- A concise explanation of 7.83 as a chosen symbol of calibration, resonance, and collective
  presence. Do not make medical, therapeutic, neurological, or unsupported scientific claims.
- Contextual links to Policy and Visit without repeating their full content.

Apply the chromatic registration frame to the page-title moment and use the About variant of the
frequency field. Keep the page readable and relatively sparse.

## 9. Events index and detail pages

### 9.1 Events index

- Upcoming published events first, chronological by start time.
- Recent/past published events in a separate, clearly labelled archive section.
- Cancelled events may remain visible only when communicating a real cancellation is useful; they
  must be labelled unambiguously and must not appear as the next event.
- Pagination or a conservative maximum is required before the archive can become unbounded.
- Preserve the Instagram channel link and a truthful no-upcoming-events state.

### 9.2 Event detail

Each published event page contains:

- Poster and accessible HTML metadata.
- Localized title, summary, and description.
- Date, start/end time, optional doors time, and timezone-aware formatting.
- Ordered lineup.
- Event lifecycle status.
- 18+ and physical-ID context.
- Door-admission wording; no reservation/payment control.
- Venue name/address and an external Google Maps link.
- Instagram link when useful.
- Localized canonical, reciprocal hreflang, Open Graph/Twitter metadata, poster social image, and
  truthful `MusicEvent` JSON-LD.

Draft/unpublished slugs and unknown slugs return a branded 404 with HTTP 404. Do not leak draft
metadata through API errors, page titles, sitemap output, image URLs, or response timing where
practical.

## 10. Event domain model

Implement a deliberately small initial model. Exact Python names may follow established project
conventions, but the behavior must remain equivalent.

| Field | Requirement |
| --- | --- |
| `id` | Server-generated UUID primary key |
| `slug` | Stable, unique, lowercase URL slug shared across locales |
| `title_sq`, `title_en` | Required to publish bilingually; bounded length |
| `summary_sq`, `summary_en` | Plain text, approximately 240 characters maximum |
| `description_sq`, `description_en` | Plain text or a strictly sanitized limited format; never raw arbitrary HTML |
| `starts_at` | Required timezone-aware instant |
| `ends_at` | Required and later than `starts_at` |
| `doors_at` | Optional and no later than `starts_at` |
| `lineup` | Ordered list of display names; provide a simple multi-line admin editor rather than an Artist model |
| `poster` | Required approved raster upload for publication |
| `poster_alt_sq`, `poster_alt_en` | Optional concise visual description; operational text still lives in HTML |
| `publication_status` | `draft` or `published` |
| `event_status` | `scheduled`, `postponed`, or `cancelled` |
| `is_featured` | Optional homepage override; only one valid published upcoming event at a time |
| `entry_note_sq`, `entry_note_en` | Optional concise door/entry note |
| `published_at` | Server-managed when publication first occurs |
| `created_at`, `updated_at` | Server-managed timestamps |
| `created_by`, `updated_by` | Server-managed staff references derived from `request.user` |

Store instants in UTC and format them for `Europe/Tirane` at the domain/presentation boundary.
Do not store a manually selectable `past` status. Do not add ticket, reservation, table, customer,
or payment models in this phase.

Publication validation must ensure the minimum Albanian and English event content, valid timing,
a valid processed poster, and a consistent lifecycle state. Drafts may be saved while incomplete.

Use an application/domain service for featured-event selection and publication rules so Astro,
the API, admin actions, and tests share one definition. Enforce invariants transactionally and
with database constraints where practical.

## 11. Django administration

Begin with Django Admin under `/staff/`. Changing the URL is organizational, not a substitute for
authentication or rate limiting.

Required staff experience:

- Frekuence name/branding without altering the public logo artwork.
- Event-only permissions for an `Event editors` group; no unnecessary access to users, groups,
  database internals, or unrelated models.
- List columns for title, start time, event status, publication status, featured state, and last
  update.
- Filters for publication status, lifecycle status, featured state, and date; search by title and
  lineup.
- Date hierarchy or an equally clear chronological navigator.
- Fieldsets separating Albanian, English, schedule, poster, publication, and audit information.
- Poster thumbnail/preview and clear upload requirements.
- Read-only IDs, processed image metadata, timestamps, and audit actors.
- Safe publish/unpublish actions with validation and understandable errors.
- Featured-event selection that cannot leave conflicting active featured records.
- Chronological defaults that make the next event easy to find.

Use Django forms and the model/domain service for validation. Do not rely on browser-only checks.
Keep Django’s built-in admin audit log and add structured audit information where publication and
featured transitions need clearer accountability.

A custom Django-template Event Desk is a later option. Do not build it until the client has used
the customized admin and identified concrete friction.

## 12. Public event API

Implement a small versioned read-only API, using Django REST Framework or an equivalently
maintainable Django-native approach.

Minimum endpoints:

- `GET /api/v1/events/?locale=sq&when=upcoming&limit=6`
- `GET /api/v1/events/?locale=en&when=recent&limit=5`
- `GET /api/v1/events/{slug}/?locale=sq`
- `GET /api/v1/events/{slug}/?locale=en`

Exact query naming may be improved during implementation and recorded, but preserve these
semantics:

- Anonymous clients can read only published fields from published events.
- Drafts are excluded at the queryset level, not filtered only after serialization.
- Limits are bounded server-side and archive access is paginated.
- Responses contain locale-specific public fields, stable URLs, event state, and responsive poster
  derivative information.
- Internal IDs, staff actors, filesystem paths, unpublished translations, and admin-only notes are
  never serialized publicly.
- Invalid locale/filter values return clear bounded errors; unknown/unpublished detail slugs return
  the same public 404 shape.
- Add appropriate caching and validators such as ETag/Last-Modified. Publication/update changes
  must invalidate or naturally version cached output.
- Permit only intended safe methods on public endpoints.

Prefer same-origin public URLs. Astro may use a private Docker-network backend URL for
server-to-server rendering, but it must not expose that internal hostname to browsers.

No authenticated write API is required while all edits occur through Django Admin. If a private
API is added later, derive the actor from `request.user`, scope querysets by authorization, and
reject client attempts to assign identity or privileged state.

## 13. Astro rendering and integration

- Add the supported Astro Node adapter and choose a server/hybrid configuration that permits
  current event data without converting every stable page into unnecessary runtime work.
- Server-render `/`, both event indexes, and all event detail routes. Prerender About, Policy,
  Visit, Privacy, and static error assets where practical.
- Create a typed server-side event client with explicit timeouts, bounded retries where safe, and
  normalized failure handling. Do not scatter raw fetch calls across views.
- Do not ship the internal API origin, credentials, or secrets to the client bundle.
- If the event service is unavailable, return a truthful designed state or a 5xx as appropriate;
  do not silently present stale event dates as current. A documented bounded cache may serve a
  previously validated response if its freshness and invalidation behavior are explicit.
- Refactor the layout metadata interface to accept dynamic title, description, canonical path,
  alternate path, Open Graph image, document type, robots status, and structured data while
  preserving the existing page-key convenience for static routes.
- Localized event pages should be HTML-complete on the first response. Do not rely on client-only
  fetching for indexable content.
- Keep browser JavaScript limited to navigation and progressive enhancement for the card deck.

## 14. Poster ingestion and delivery

### 14.1 Validation

- Allowlist raster formats supported and securely decoded by the selected maintained image
  library; JPEG, PNG, and WebP are sufficient initially. Reject SVG.
- Configure an explicit upload byte limit and decoded-pixel limit. A reasonable initial target is
  15 MiB and 40 megapixels, but record and test the final values.
- Verify decoded content rather than trusting extensions or declared MIME type.
- Reject malformed, truncated, decompression-bomb, zero-dimension, and otherwise unsafe images.
- Generate server-controlled randomized storage names and prevent path traversal.

### 14.2 Processing

- Normalize orientation and strip EXIF/metadata.
- Preserve a managed original for reprocessing, but do not reference it as the default public
  image.
- Generate responsive poster derivatives suitable for cards and details, for example widths near
  480, 960, and 1440 pixels, plus an event social-image derivative when necessary.
- Prefer WebP and optionally AVIF when the deployed image stack supports it reliably; provide a
  safe fallback.
- Record width, height, format, and versioned URL data needed by the frontend.
- Perform this synchronously in Phase 2 if bounded upload sizes keep requests reliable. Add a
  worker only when measured processing time or volume justifies it.

### 14.3 Presentation

- Use `srcset`/`sizes`, explicit dimensions/aspect ratio, lazy loading below the fold, and eager
  priority only for the actual next-event LCP image.
- Essential poster text remains duplicated as structured HTML. When adjacent HTML already names
  and dates the event, use intentionally concise or empty image alt text to avoid repetitive
  screen-reader output; use the localized poster-alt field when the artwork itself needs a visual
  description.
- Preserve the poster composition. Do not make an uncontrolled center crop the only available
  view.

## 15. SEO and discoverability

Preserve all working Phase 1 SEO behavior and add:

- Unique localized title and meta description for every event.
- Self-canonical event URLs and reciprocal Albanian/English hreflang links.
- Event poster Open Graph/Twitter images with declared dimensions and meaningful alt text.
- Truthful `MusicEvent` JSON-LD including name, start/end time, lifecycle status, image, venue, and
  address. Add performer or offer data only when confirmed and valid.
- A sitemap generated from current published data rather than only build-time content. It must
  update after event publication without rebuilding Astro.
- Real 404 status for unknown and unpublished event URLs and appropriate 5xx handling for service
  failures.
- Stable, human-readable slugs and no query-string canonical duplicates.
- Internal links between homepage, event index, event details, About, Policy, and Visit.

Keep Albanian as the default experience and `sq-AL` locale. Do not auto-redirect by IP or browser
language. Maintain consistent name, address, coordinates, and Maps URL throughout the site.

Outside the codebase, retain TODOs for Google Business Profile ownership/optimization, Search
Console verification, sitemap submission, and confirmed venue contact/opening data. Do not claim
those operational tasks are complete merely because technical metadata exists.

## 16. Security and privacy requirements

### 16.1 Authentication and authorization

- No public signup.
- Django session authentication for `/staff/`, with CSRF protection on every state-changing form.
- Strong password validation and TOTP-based MFA before production staff access unless an approved
  equivalent such as a private identity-aware gateway is documented.
- Separate day-to-day event editor accounts from emergency/superuser accounts.
- Least-privilege model permissions and server-side checks; hiding a navigation item is not
  authorization.
- Login rate limiting and monitoring without storing credentials or session values in logs.

### 16.2 Request and data safety

- Set `created_by` and `updated_by` from `request.user`; exclude them from editable forms and API
  payloads.
- Treat all identifiers and state transitions as untrusted input even from staff forms.
- Use model/domain validation, database transactions, constraints, safe ORM queries, output
  escaping, and strict upload validation.
- Never accept raw arbitrary event HTML. If limited rich text is approved, sanitize on the server
  with an explicit element/attribute allowlist and test stored-XSS attempts.
- Bound list limits, text lengths, request bodies, and upload sizes at both gateway and
  application layers.

### 16.3 Configuration and secrets

- `DEBUG=False` in production.
- Exact `ALLOWED_HOSTS` and `CSRF_TRUSTED_ORIGINS`.
- `Secure`, `HttpOnly`, and appropriate `SameSite` session cookies; secure CSRF cookies.
- Correct `SECURE_PROXY_SSL_HEADER` only when the trusted proxy overwrites, rather than appends,
  forwarded protocol headers.
- Runtime secrets via protected environment/secret mounts, never committed files, build args,
  image layers, frontend variables, or logs.
- Rotate secrets independently of image builds.

### 16.4 Headers and CSP

- Preserve HSTS, frame restrictions, content-type protections, referrer policy, and permissions
  policy through the full proxy chain.
- Use a reviewed strict CSP. Dynamic event JSON-LD should use a per-response nonce or another
  equally strict mechanism. Do not add broad `unsafe-inline`, `unsafe-eval`, wildcard script,
  frame, or connection sources.
- Permit media/image origins narrowly. Prefer same-origin assets.
- Ensure host Nginx, the container gateway, and the application do not silently overwrite one
  another’s security headers with weaker values.

### 16.5 Data minimization

This phase stores event content and staff accounts only. Do not add customer/contact data,
tracking identifiers, or reservation records. Keep the public privacy page accurate after staff
session infrastructure is added; staff-only essential cookies do not require a public marketing
cookie banner.

## 17. Container and network architecture

Use one public-facing Compose gateway behind host Nginx:

```text
Internet
  -> host Nginx (TLS and public boundary)
  -> 127.0.0.1:<Frekuence port>
  -> container gateway (unprivileged Nginx)
       -> Astro Node frontend
       -> Django application for /api/ and /staff/
       -> persistent processed media/static volumes
  -> PostgreSQL on a private Compose network
```

Minimum services:

- `gateway`: the only service with a loopback host-port binding; routes public paths, applies
  request limits/cache rules, and serves collected static/processed media read-only.
- `frontend`: Astro Node SSR, reachable only on the internal application network.
- `backend`: Django behind a production WSGI/ASGI server, reachable only internally.
- `db`: PostgreSQL with no host port.

Persistent named volumes or documented external equivalents:

- PostgreSQL data.
- Approved originals and generated media.
- Collected Django static files if served by the gateway.

Do not add Redis or a worker in this phase. Add health checks for gateway, frontend, backend, and
database readiness. Use startup ordering only as a convenience; applications must tolerate
dependencies becoming ready after process creation.

Run migrations and `collectstatic` as explicit deployment tasks. Do not run migrations
concurrently from every backend process. Back up the database and media with matching timestamps,
encrypt backups, define retention, and test restoration.

Update `docs/DEPLOYMENT.md` and the host Nginx example with:

- exact loopback binding;
- trusted proxy headers;
- request/upload size and timeout behavior;
- `/api/`, `/staff/`, media, and frontend routing;
- health verification;
- deployment and migration order;
- rollback for both code and schema;
- database/media backup and tested restore;
- log locations and redaction expectations.

## 18. Failure and empty states

- No published events: homepage shows `Next signal incoming`, a normal Instagram link, and no fake
  event controls.
- No upcoming event but recent history: show the incoming state plus the clearly labelled past
  deck.
- Event cancelled: label it prominently, remove it from next-event selection, and retain its page
  only when publication is intentionally useful.
- Backend temporarily unavailable: do not convert the error into “no events.” Return a designed
  service-unavailable state and appropriate HTTP status, or serve a documented bounded stale
  cache that is visibly and operationally safe.
- Poster derivative missing: retain accessible event text and use a deliberate branded fallback;
  do not break layout or expose a filesystem error.
- Unknown/draft event: real 404 without draft leakage.
- JavaScript unavailable: navigation and event links work; the deck becomes a readable static
  list.

## 19. Testing and acceptance criteria

### 19.1 Backend

- Model validation covers timing, publication requirements, lifecycle state, featured
  invariants, translations, slugs, and audit fields.
- Admin tests cover anonymous denial, non-staff denial, editor permissions, CSRF, safe publish
  actions, feature selection, and request-user attribution.
- API tests prove that drafts and private fields never leak, pagination/limits are bounded,
  localization is correct, methods are restricted, and unknown events return 404.
- Upload tests include spoofed MIME/extensions, SVG, malformed/truncated images, excessive bytes,
  excessive pixels, metadata stripping, path traversal filenames, and valid derivative creation.
- Django system checks, deployment checks, migration consistency, formatting, linting, and tests
  pass in the documented container environment.

### 19.2 Frontend and integration

- The first visible homepage content is the next-event surface or the truthful incoming state.
- Adding or editing a published event in Django becomes visible on the homepage/index/detail page
  without rebuilding the frontend.
- The homepage selects featured/fallback events exactly as specified and separates future from
  past decks.
- Event pages contain server-rendered localized content, correct canonical/hreflang, social
  metadata, valid JSON-LD, and real 404 behavior.
- The dynamic sitemap contains current published event URLs only.
- Card hover, focus, touch selection, CTA behavior, no-JavaScript fallback, and reduced-motion
  presentation all work.
- About contains the migrated manifesto/7.83 material; homepage no longer duplicates policy and
  visit summaries.
- Navigation and language switching preserve correct routes, including event slugs.
- Existing static routes, external-link safety, branded 404, and SEO behavior do not regress.

### 19.3 Visual and accessibility review

Review at minimum:

- Desktop: 1440 × 1000.
- Intermediate/tablet: approximately 1024 px wide.
- Mobile: 390 × 844.
- Minimum supported width: 320 px.
- Keyboard-only navigation.
- Reduced-motion mode.
- A long realistic event title, multi-act lineup, postponed state, and no-event state.

Acceptance requires:

- No page-level horizontal overflow.
- No unreadable poster metadata or overlapping controls.
- Visible focus and correct focus order.
- WCAG 2.2 AA color contrast for text and controls.
- Touch targets of practical size and no hover-only information.
- Decorative frequency graphics ignored by assistive technology.
- Poster cards remain legible and intentional across the supplied artwork’s differing palettes.

### 19.4 Performance and delivery

- Preserve or deliberately revise documented Lighthouse/Core Web Vitals budgets.
- The next-event poster is responsive and prioritized; other posters lazy-load.
- No normal page view downloads original multi-megabyte poster files.
- Public JavaScript remains small and is not required for primary content or navigation.
- Production containers run non-root, only the gateway binds to loopback, the database has no host
  port, health checks pass, and secrets are absent from built assets/images.
- Representative pages and a real 404 are verified through host Nginx after deployment.

## 20. Implementation sequence

Do not attempt an unreviewed all-at-once rewrite. Use this order and keep each checkpoint
deployable or clearly isolated:

1. **Baseline and decisions** — run existing checks; inspect outstanding changes; record selected
   backend package layout, adapter, image library, MFA mechanism, API shape, and CSP ownership.
2. **Design foundation** — add named spectral tokens and the three reusable frequency primitives;
   build representative static states and visually validate restraint, contrast, and motion.
3. **Editorial restructure** — create localized About routes, migrate manifesto/7.83 content, add
   navigation/metadata, and remove homepage duplication without yet fabricating events.
4. **Backend foundation** — add Django/PostgreSQL, event model/domain rules, migrations, admin,
   permissions, authentication controls, upload processing, tests, and development-only fixtures.
5. **Read-only API** — implement published-only localized endpoints, caching validators, limits,
   and tests.
6. **Astro dynamic migration** — add the Node adapter, typed event client, server-rendered homepage,
   indexes/details, card interaction, error handling, dynamic metadata, sitemap, and CSP solution.
7. **Container topology** — add the internal gateway, persistent volumes, health checks, production
   configuration, explicit migration/static steps, and updated host Nginx/deployment docs.
8. **Integrated QA** — run all frontend/backend/container tests, visual and accessibility review,
   Lighthouse, security checks, backup/restore exercise, and representative route verification.
9. **Handoff** — update README only for capabilities that now exist, implementation decisions,
   TODOs, validation evidence, exact deploy/rollback commands, and unresolved owner inputs.

At the end of each checkpoint, report changed behavior, commands and results, screenshots where
visual judgment matters, unresolved risks, and the next safe checkpoint. Do not claim validation
that was not actually run.

## 21. Owner inputs and content TODOs

Implementation may proceed using explicit empty/development states, but production publication
still requires confirmation of:

- Which files in `assets/posters/` represent approved real events versus design samples or
  duplicates.
- Complete event metadata and correct years; do not rely solely on poster OCR.
- Approved Albanian and English event copy.
- Whether every supplied poster has publication rights and whether photographer/artist credits
  are required.
- Final exact spectral accent token values derived from approved artwork.
- Original vector logo, pattern, and licensed font assets already tracked in brand TODOs.
- Staff account recipients and a production MFA/recovery procedure.
- Backup destination, retention, restore owner, and operational alert destination.
- Final legal controller details and any remaining policy copy marked in existing content TODOs.

Development fixtures must be unmistakably non-production and excluded from production startup.
Never turn visible poster text into a published event record without owner confirmation.

## 22. Definition of done

Phase 2 is complete only when:

- Authorized staff can securely create, validate, preview as permitted, publish, update, and
  unpublish an event with a poster.
- Published changes appear in server-rendered public pages and the sitemap without an Astro
  rebuild.
- The homepage is event-led and the secondary cards behave accessibly on pointer, keyboard, touch,
  reduced-motion, and no-JavaScript paths.
- About contains the Human Hz manifesto and calibrated-at-7.83 story, and the homepage no longer
  duplicates Policy/Visit content.
- Event detail pages, localized metadata, structured data, social images, canonical/hreflang, and
  HTTP status behavior are correct.
- Drafts, staff-only fields, secrets, unsafe uploads, and internal services are not publicly
  exposed.
- All application components run in Docker behind the host Nginx boundary; persistent data is
  backed up and restoration has been tested.
- Required automated checks and manual visual/accessibility reviews pass and are recorded.
- Deployment, migration, rollback, backup/restore, staff access, and outstanding owner inputs are
  documented accurately.

## 23. Agent startup instruction

Use the following short instruction when assigning implementation to an agent:

> Read `AGENTS.md` and `docs/PHASE_2_IMPLEMENTATION_BRIEF.md` completely, then inspect the current
> repository and run the existing baseline checks. Implement Phase 2 in the documented checkpoint
> order. Preserve the working Phase 1 behavior until its replacement is verified, do not invent
> event content, stop for genuine owner/security conflicts, and provide evidence for every
> validation you claim.
