# Phase 2 checkpoint 3 validation

Validated on 2026-09-09 against `feat/phase-2-foundation` after completing Phase 2 checkpoints
1–3 only.

## Pre-change baseline

- `npm run build` stopped at `format:check` because the newly merged
  `docs/PHASE_2_IMPLEMENTATION_BRIEF.md` did not match Prettier formatting. The brief was formatted
  without changing its meaning before final validation.
- `npm run test:e2e` passed 20 functional, accessibility, navigation, 404, external-link,
  reduced-motion, and responsive-overflow tests; 15 opt-in visual tests were skipped as designed.
- `npm run test:visual` passed and captured the existing 15-image Phase 1 review set.
- `npm run audit:lighthouse` passed with Performance 99, Accessibility 100, Best Practices 100,
  SEO 100, LCP 1,812 ms, and CLS 0.01155.
- The baseline dependency audit later identified critical advisory `GHSA-26w7-cxv4-gfx2` in
  Astro 7.2.4. The exact Astro pin was updated to the patched 7.2.8 release and all final gates were
  rerun.

## Final automated gates

| Gate                       | Result                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`            | Passed: formatting, ESLint, Astro diagnostics, unit parity test, 13-page static build, sitemap, and production-output validation |
| Astro diagnostics          | Passed: 0 errors, 0 warnings, 0 hints across 47 files                                                                            |
| Production validator       | Passed: 12 localized canonical routes and 38 generated files; About routes, links, metadata, hreflang, sitemap, and 404 verified |
| `npm run test:e2e`         | Passed: 24 functional, axe, navigation, editorial, 404, external-link, reduced-motion, and responsive-overflow tests; 21 skipped |
| `npm run test:visual`      | Passed: 21 desktop, intermediate, mobile, minimum-width, inner-page, and 404 screenshots captured                                |
| `npm run audit:lighthouse` | Passed: Performance 100, Accessibility 100, Best Practices 100, SEO 100, LCP 1,659 ms, CLS 0.00013                               |
| `npm audit`                | Passed: 0 known vulnerabilities after the exact Astro 7.2.8 security update                                                      |

The empty Astro event collection warning remains intentional. No event facts were inferred from
the candidate poster artwork, no Event JSON-LD is emitted, and `assets/posters/` and
`assets/inspiration/` are absent from the generated public output.

## Responsive and visual review

The final review checked the event-led empty-state homepage and localized About page at desktop,
intermediate, mobile, and minimum widths. It found and fixed an existing CSS override that made the
enhanced mobile menu visible despite its `hidden` state. The final captures have a collapsed menu,
no page-level horizontal overflow, no clipped titles, no overlapping controls, and readable text
over stable surfaces. The frequency field is decorative and ignored by assistive technology; its
motion resolves to a designed static state under reduced-motion preferences.

The local review evidence is regenerated with `npm run test:visual` and lives in the ignored
`screenshots/` directory:

- `home-{sq,en}-{320x900,390x844,1024x900,1440x1000}.png`
- `about-{sq,en}-{390x844,1440x1000}.png`
- `{events,policy,visit,privacy}-{sq,en}-1440x1000.png`
- `404-bilingual-1440x1000.png`

## Checkpoint boundary and remaining work

This checkpoint intentionally retains static Astro output. It does not install the Node adapter,
Django, PostgreSQL, Django Admin, MFA, poster processing, or an event API. Container and deployment
files were not changed, so the container rebuild/recreate checks required for topology changes were
not rerun. Phase 1 container evidence remains historical rather than evidence for this frontend
commit.

Checkpoint 4 must not begin until the owner has visually reviewed checkpoints 1–3. Production
event publication remains blocked by the event metadata, translation, poster-rights, staff-access,
backup, legal, and final signal-token inputs recorded in `docs/CONTENT_TODOS.md` and
`docs/BRAND_ASSET_TODOS.md`.
