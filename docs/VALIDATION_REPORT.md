# Phase 2 checkpoint 3 validation

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
| `npm run build`                     | Passed: formatting, ESLint, Astro diagnostics, 10 unit assertions, 13-page production build, sitemap, and production-output validation                |
| Astro diagnostics                   | Passed: 0 errors, 0 warnings, 0 hints across 59 files                                                                                                 |
| Production validator                | Passed: 12 localized canonical routes and 43 generated files; fixture names/routes absent; internal links, metadata, hreflang, sitemap, and 404 valid |
| `npm run test:e2e`                  | Passed: 37 functional/browser tests; 26 opt-in visual tests skipped                                                                                   |
| `npm run test:visual`               | Passed: 26 screenshots, including the five committed PR review captures                                                                               |
| `npm run audit:lighthouse`          | Passed: Performance 100, Accessibility 100, Best Practices 100, SEO 100; LCP 1,658 ms; CLS 0                                                          |
| `npm run audit:lighthouse:fixtures` | Passed: Performance 98, Accessibility 100, Best Practices 100, SEO 100; LCP 2,342 ms; CLS 0.00013                                                     |
| `npm audit`                         | Passed: 0 known vulnerabilities                                                                                                                       |

## Event behavior covered

- Valid featured-event priority and earliest-upcoming fallback.
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
