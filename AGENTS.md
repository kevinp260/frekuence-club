# Repository instructions

## Project contract

- This repository is the bilingual website for Frekuence Club in Tirana. Albanian (`sq-AL`)
  is served at `/`; English is served under `/en/`. Preserve equivalent routes, translation
  parity, reciprocal hreflang links, and trailing-slash canonicals.
- Phase 2 is explicitly approved. The active target architecture is Astro for the public
  frontend, Django for event administration and the event API, and PostgreSQL for persistent
  event data. Read `docs/PHASE_2_IMPLEMENTATION_BRIEF.md` before planning or implementing Phase
  2 work.
- Preserve the working Phase 1 site while migrating. Do not remove a working route or deploy a
  partially connected data path merely to complete the architectural transition.
- Phase 2 includes event list/detail pages, a customized staff-only Django Admin, poster media,
  an event-led homepage, and a standalone About / Who we are page.
- Reservations, guest-list submissions, online payments, public user accounts, analytics,
  tracking, marketing pixels, third-party feeds, and a separate custom CRUD application remain
  out of scope unless the owner explicitly approves them later.
- Never invent events, artists, prices, opening hours, contacts, legal identities, venue
  accessibility claims, testimonials, translations, or operational policies. Record unresolved
  owner inputs in the appropriate TODO document.

## Migration and working rules

- Inspect the current worktree, repository instructions, active brief, tests, deployment files,
  and existing user changes before editing. Preserve unrelated work.
- Treat `docs/PHASE_1_IMPLEMENTATION_BRIEF.md` as historical context. Do not reimplement Phase 1
  or allow its former static-only scope to override the approved Phase 2 brief.
- Establish one production source of truth for events. Astro content collection entries may be
  used as temporary fixtures during migration, but Django/PostgreSQL must become authoritative
  before dynamic event publishing is enabled.
- Work in reviewable phases. Keep the application runnable, testable, and rollback-capable at
  each deployable checkpoint.
- Record material architecture, security, dependency, content-model, and deployment decisions in
  repository documentation as they are made.
- Pin direct dependencies exactly and update the appropriate lockfiles with dependency changes.
  Prefer stable, supported releases and official documentation; do not adopt experimental
  framework features without a documented need.

## Architecture and content

- Keep Astro and strict TypeScript for the public frontend. Use native Astro components,
  semantic HTML, plain CSS, and the smallest practical progressive-enhancement scripts. Do not
  add React, Vue, Svelte, a client state library, or a heavy animation library without a concrete
  requirement.
- Continue using the pinned `@lucide/astro` package for interface icons unless a documented
  replacement is approved. Render icons as accessible inline SVG without an icon font, CDN, or
  client-side icon runtime.
- Enable Astro on-demand rendering only where current event data requires it. Continue
  prerendering stable editorial/legal routes when practical.
- Use Django with PostgreSQL for event persistence and staff workflows. Begin with a restricted,
  customized Django Admin; do not build a parallel custom administration application until
  client feedback demonstrates that it is needed.
- Use Django session authentication and CSRF protection for staff. Do not introduce JWTs for the
  administration interface.
- Keep the event API versioned and read-only for anonymous clients in this phase. Public
  querysets and serializers must expose published event data only.
- Derive authenticated actors and ownership from `request.user` and the server-side session.
  Never trust a user, owner, creator, updater, or permission identifier supplied in a request
  payload.
- Keep confirmed venue data, routes, and translations centralized. Reuse shared layouts, views,
  components, serializers, and domain services rather than duplicating localized behavior.
- Store timezone-aware instants and present venue dates in `Europe/Tirane`.

## Event behavior

- The homepage begins with the next published upcoming event. A deliberately featured published
  upcoming event may override the chronological default. Never feature a draft, cancelled, or
  past event as the next event.
- The secondary homepage deck contains at most five published events. Upcoming and past events
  must not be mixed under an ambiguous label. Follow the fallback rules in the Phase 2 brief.
- Every event must have a stable detail route in both locales. Missing, draft, and unavailable
  events must return a real HTTP 404 to anonymous visitors.
- Essential information contained in a poster—at minimum title, date, time, and status—must also
  exist as accessible HTML and structured data. A poster image is never the sole carrier of
  operational information.
- Keep publication status separate from event lifecycle status. Derive whether an event is past
  from its timestamps rather than storing `past` as a manually editable status.
- Do not expose reservation, payment, or ticket controls in this phase. “Reservations coming
  soon” may be non-interactive status text only.

## Brand and interface

- Treat `BrandBook_FREKUENCE_Compressed.pdf` as the authority for the logo and core identity.
  Never redraw, trace, distort, recolor, rotate, outline, animate, or rearrange the logo.
- The current files under `src/assets/brand/temporary/` remain approved temporary bitmap exports.
  Keep them isolated and replace them only with owner-approved originals. Regenerate dependent
  favicon/social derivatives through the documented asset command rather than editing generated
  files manually.
- The approved Phase 2 extension is a restrained visual language of signal interference,
  chromatic registration, frequency lines, contour fields, and halftone texture. Preserve the
  core black, white, signal-red, and Montserrat system.
- Cyan, magenta, and green sampled from approved club poster artwork may be introduced as named
  decorative signal tokens. Do not use them as arbitrary UI colors or as the only indicator of
  state. All text and controls must continue to meet WCAG 2.2 AA contrast.
- Do not introduce yellow/amber as a functional UI color until its status is separately approved.
- Treat files under `assets/inspiration/` as visual references, not production assets. Do not
  copy, trace, or publish them unless usage rights are confirmed. Recreate an original system in
  CSS and SVG.
- Treat files under `assets/posters/` as candidate owner-supplied event artwork. Do not infer or
  publish missing event facts from artwork alone. Optimize approved posters through the backend
  media pipeline rather than shipping multi-megabyte originals to normal page views.
- Prefer a small set of reusable visual primitives over page-specific effects. Avoid generic
  neon gradients, glow-heavy cyberpunk styling, random glitch effects, WebGL, canvas effects,
  autoplay media, and stock nightlife imagery.
- Do not animate the interface at a literal 7.83 flashes or color changes per second. Use 7.83 as
  a spatial or conceptual motif, keep motion slow and nonessential, and provide a static
  `prefers-reduced-motion` presentation.
- Preserve keyboard access, visible focus, semantic landmarks, reduced-motion behavior, WCAG
  2.2 AA contrast, and layouts without page-level horizontal overflow at 320 px and above.
- Hover behavior must have keyboard-focus parity. Touch interactions must use real controls with
  explicit state; never require hover emulation or create a hidden double-tap navigation trap.
- Do not create `href="#"`, dead links, fake buttons, or unavailable actions styled as
  interactive controls.

## Media and upload safety

- Accept only explicitly allowlisted raster poster formats. Validate decoded file content,
  dimensions, pixel count, and byte size server-side; do not trust filenames or browser MIME
  declarations. Reject SVG and malformed files.
- Re-encode public poster derivatives, strip metadata, generate responsive sizes, and serve
  dimensions explicitly to prevent layout shift. Do not expose an unprocessed original as the
  default frontend image.
- Store media in persistent storage shared only with the component that serves it. Back up event
  data and media together and document a tested restoration procedure.
- Keep upload paths randomized or server-generated. User-supplied filenames must not determine
  filesystem paths or executable content types.

## SEO, security, and privacy

- Preserve unique localized metadata, same-language canonicals, reciprocal hreflang links,
  robots behavior, the branded 404, and truthful venue structured data.
- Add server-rendered event metadata, `MusicEvent` JSON-LD, event Open Graph images, and a sitemap
  that updates when published events change. Do not emit event structured data for drafts or
  fabricate offers, availability, performers, or prices.
- Refactor static metadata assumptions cleanly for dynamic routes. Dynamic JSON-LD must be
  compatible with the production CSP through a per-response nonce or another reviewed strict
  mechanism; do not weaken the policy with broad `unsafe-inline` or `unsafe-eval` allowances.
- Keep secrets server-side and inject them at runtime. Never expose a secret through Astro
  `PUBLIC_*` variables, frontend bundles, Docker image layers, logs, or committed environment
  files.
- Configure Django with `DEBUG` disabled, exact allowed hosts and trusted origins, secure and
  HttpOnly session cookies, secure CSRF cookies, an appropriate SameSite policy, correctly
  trusted proxy headers, and explicit staff authorization.
- Rate-limit staff login and sensitive endpoints at the container gateway and/or application
  layer. Require strong staff credentials and add TOTP-based MFA before production staff access
  unless a documented equivalent control is approved.
- Use same-origin routing. Do not enable permissive CORS. Apply method, authentication,
  permission, object-scope, input, and output controls independently on every non-public API.
- Avoid third-party scripts and embeds. Do not add a consent banner while the site uses no
  consent-requiring cookies; staff session cookies are not public marketing cookies.
- External links opened in a new tab must use safe `rel` values. Avoid inline executable code
  except where a reviewed CSP nonce/hash mechanism explicitly covers it.
- Log security-relevant staff actions without logging passwords, session identifiers, secrets,
  full uploaded content, or unnecessary personal data.

## Docker and deployment

- Everything in the application stack runs in Docker: Astro runtime, Django runtime, PostgreSQL,
  and the container gateway/static-media server. Host Nginx remains the only host-level service
  and the public TLS/security boundary.
- Expose only one gateway port to `127.0.0.1` on the host. Frontend, backend, and database services
  stay on private Compose networks without public host bindings.
- Use multi-stage, pinned, minimal images; run application processes as non-root; add health
  checks; and use read-only filesystems with explicit writable volumes where practical.
- Keep PostgreSQL and media on named persistent volumes or documented external storage. Never
  bake mutable data or secrets into images.
- Production images and public output must not contain environment files, source maps, source
  content files, Git metadata, development fixtures, or the brand-book PDF.
- Run database migrations as an explicit deploy step with a documented rollback strategy, not as
  an uncontrolled side effect in every application replica.
- Preserve real HTTP status codes through both proxy layers. Document proxy headers, request-size
  limits, upload routing, static/media caching, health checks, backup, restore, deployment, and
  rollback.

## Validation rules

- `npm run build` remains the frontend baseline. Run `npm run test:e2e` for behavior,
  navigation, accessibility, or responsive changes; `npm run test:visual` for visual changes;
  and `npm run audit:lighthouse` for performance, accessibility, best-practice, or SEO changes.
- Add and document backend formatting, linting, Django system/deployment checks, unit tests, API
  tests, migration checks, and security-focused tests. Run them before declaring a backend phase
  complete.
- Test anonymous/staff boundaries, draft leakage, request-user attribution, upload validation,
  event selection/fallback logic, localized detail routes, dynamic metadata/sitemap output, and
  real 404 behavior.
- For container or deployment changes, build all images, recreate the stack, confirm health,
  verify representative routes through the gateway, confirm the loopback-only host binding, and
  test a real 404.
- Visually review the event hero, card deck, page-title treatment, and reduced-motion state at
  desktop and at 390 px and 320 px mobile widths. Resolve overlap, clipping, focus, tap, and text
  readability defects rather than merely updating snapshots.
- Do not manually edit generated build output, test reports, screenshots, migrations after they
  have run in production, favicon derivatives, or processed media derivatives. Run the documented
  asset-generation command after an approved brand source changes.

## Documentation map

- `README.md`: current implemented state and routine commands. Update it as Phase 2 capabilities
  actually land; do not describe planned services as already deployed.
- `docs/PHASE_2_IMPLEMENTATION_BRIEF.md`: active approved Phase 2 product, design, architecture,
  security, delivery, and acceptance specification.
- `docs/PHASE_1_IMPLEMENTATION_BRIEF.md`: historical Phase 1 specification and rationale.
- `docs/IMPLEMENTATION_DECISIONS.md`: accepted implementation decisions and deviations from the
  active brief.
- `docs/CONTENT_TODOS.md`: unresolved owner, event-content, accessibility, and legal inputs.
- `docs/BRAND_ASSET_TODOS.md`: missing production assets and licensing approvals.
- `docs/DEPLOYMENT.md`: current deployment, verification, backup, restoration, and rollback
  procedures.
- `docs/SEO_LAUNCH_CHECKLIST.md`: production-domain SEO checks.
- `docs/VALIDATION_REPORT.md`: latest recorded release evidence; update only after rerunning the
  relevant checks.
