# Phase 1 implementation decisions

- The repository began as a clean slate containing only the implementation brief and brand
  book; there was no Git repository or existing application to adapt. The original brief is
  preserved in `docs/PHASE_1_IMPLEMENTATION_BRIEF.md` as historical context.
- Astro 7.2.4 is pinned with static directory-format output and trailing-slash canonicals.
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
