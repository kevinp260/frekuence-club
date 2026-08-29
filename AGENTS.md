# Repository instructions

## Project contract

- This repository is the bilingual, fully static Astro website for Frekuence Club. Keep it
  static unless the owner explicitly approves a new phase and its infrastructure.
- Albanian (`sq-AL`) is served at `/`; English is served under `/en/`. Preserve equivalent
  routes, content-key parity, reciprocal hreflang links, and trailing-slash canonicals.
- Do not add a backend, database, forms, accounts, payments, reservation flows, analytics,
  tracking, third-party embeds, autoplay media, or a CMS without explicit approval.
- Never invent events, artists, prices, opening hours, contacts, legal identities, venue
  accessibility claims, testimonials, or operational policies. Record unresolved owner inputs
  in the appropriate TODO document instead.

## Architecture and content

- Use strict TypeScript, native Astro components, semantic HTML, plain CSS, and the smallest
  practical progressive-enhancement scripts. Do not introduce a client framework without a
  concrete requirement.
- Keep confirmed venue data, routes, and translations centralized under `src/data/`. Reuse
  shared layouts, views, and components rather than duplicating localized markup.
- Maintain translation parity between Albanian and English. A visible content or navigation
  change normally requires both locales.
- Events live in the Astro content collection defined by `src/content.config.ts`. Draft events
  must not be published. The empty collection and its build warning are intentional until a
  real event is supplied.
- External ticket URLs are denied by default. Add only owner-approved HTTPS hostnames to
  `src/data/tickets.ts` before publishing an external ticket link.
- Use the pinned `@lucide/astro` components for interface icons. Icons should render as inline
  SVG at build time; do not add an icon font, CDN, or client-side icon runtime.

## Brand and interface

- Treat `BrandBook_FREKUENCE_Compressed.pdf` as the visual authority. Never redraw, trace,
  distort, recolor, rotate, outline, animate, or rearrange the logo.
- The files under `src/assets/brand/temporary/` are approved temporary bitmap exports. Keep
  them isolated and replace them only with owner-approved originals.
- Do not use stock nightclub photography or AI-generated crowd imagery. Do not introduce
  yellow/amber as a UI color until its status is approved.
- Preserve keyboard access, visible focus, semantic landmarks, reduced-motion behavior, WCAG
  2.2 AA contrast, and layouts without horizontal overflow at 320 px and above.
- Do not create dead links, `href="#"`, fake buttons, or unavailable actions styled as
  interactive controls.

## SEO, security, and deployment

- Preserve unique localized metadata, same-language canonicals, reciprocal hreflang links,
  sitemap and robots output, the real branded 404, and truthful structured data. Do not emit
  Event JSON-LD for nonexistent events.
- Avoid third-party scripts and inline executable code. The host Nginx CSP permits the venue
  JSON-LD block by an exact hash; recompute and review it if structured data changes.
- External links opened in a new tab must include safe `rel` values.
- Production output and the runtime image must not contain secrets, environment files, source
  maps, source Markdown, Git metadata, or the brand-book PDF.
- Keep the runtime unprivileged and minimal, the filesystem read-only where configured, and
  the published application port bound only to loopback. Host Nginx remains the TLS and public
  security-header boundary.

## Working and validation rules

- Inspect the current worktree before editing and preserve unrelated user changes.
- Pin direct dependencies exactly and update `package-lock.json` with dependency changes.
- Do not manually edit `dist/`, `.astro/`, test reports, screenshots, or generated favicon and
  social-image derivatives. Run `npm run assets:generate` after approved brand source exports
  change.
- Validate in proportion to the change. `npm run build` is the baseline for code or content
  changes. Run `npm run test:e2e` for behavior, navigation, accessibility, or responsive
  changes; `npm run test:visual` for visual changes; and `npm run audit:lighthouse` for changes
  that may affect performance, accessibility, best practices, or SEO.
- For container or deployment changes, rebuild the image, recreate the service, confirm
  health, verify representative routes and a real 404, and confirm the loopback-only binding.

## Documentation map

- `README.md`: project overview and routine commands.
- `docs/PHASE_1_IMPLEMENTATION_BRIEF.md`: historical Phase 1 specification and original
  acceptance criteria; use it for rationale, not as an instruction to reimplement completed
  work.
- `docs/IMPLEMENTATION_DECISIONS.md`: current architectural and product decisions.
- `docs/CONTENT_TODOS.md`: unresolved owner, content, accessibility, and legal inputs.
- `docs/BRAND_ASSET_TODOS.md`: missing production brand assets and licensing approvals.
- `docs/DEPLOYMENT.md`: deployment, verification, staging, and rollback procedures.
- `docs/SEO_LAUNCH_CHECKLIST.md`: production-domain SEO checks.
- `docs/VALIDATION_REPORT.md`: latest recorded release evidence; update it only after rerunning
  the relevant checks.
