# Local release validation

Validated on 2026-08-29 against the Phase 1 implementation in this workspace.

## Automated gates

| Gate                                              | Result                                                                                                                                                           |
| ------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run build`                                   | Passed: formatting, ESLint, Astro diagnostics, unit checks, 11-page static build, and production-output validation                                               |
| Astro diagnostics                                 | Passed: 0 errors, 0 warnings, 0 hints across 41 files                                                                                                            |
| Production-output validator                       | Passed: 10 localized canonical routes and 36 generated files                                                                                                     |
| `PUBLIC_NOINDEX=true` staging build and validator | Passed: staging routes emitted indexing protection without weakening production validation                                                                       |
| `npm run test:e2e`                                | Passed: 20 functional, accessibility, navigation, 404, security-link, reduced-motion, and responsive-overflow checks; 15 opt-in visual tests skipped as designed |
| `npm run test:visual`                             | Passed: 15 screenshots captured                                                                                                                                  |
| `npm run audit:lighthouse`                        | Passed: Performance 100, Accessibility 100, Best Practices 100, SEO 100, LCP 1,744 ms, CLS 0                                                                     |
| `npm audit --omit=dev`                            | Passed: 0 vulnerabilities                                                                                                                                        |
| `npm audit`                                       | Passed: 0 vulnerabilities                                                                                                                                        |

The event collection is intentionally empty in Phase 1. Astro's message that no event Markdown
files were found is expected; the rendered site shows the localized empty state and emits no
invented Event structured data.

## Responsive and visual review

Homepages were captured in Albanian and English at 390×844, 768×1024, and 1440×1000. Every
inner page and the bilingual 404 were captured at 1440×1000. The final review found no clipped
copy, overlapping controls, broken hierarchy, or unintended horizontal overflow. Automated
overflow checks also pass at 320, 390, 768, and 1440 px.

The local evidence is in `screenshots/` and is regenerated with `npm run test:visual`:

- `home-{sq,en}-{390x844,768x1024,1440x1000}.png`
- `{events,policy,visit,privacy}-{sq,en}-1440x1000.png`
- `404-bilingual-1440x1000.png`

## Container verification

The final local image is
`sha256:6e7f8c378321c521947ef3d4a7c077eac56bf38a3e19275808bc1ef10d19ec65`.
The recreated container reported healthy and published only
`127.0.0.1:3010 → 8080`.

- Runtime identity: `uid=101(nginx) gid=101(nginx)` / image user `101:101`
- Read-only root filesystem: enabled
- Linux capabilities: all dropped
- Privilege escalation: disabled with `no-new-privileges:true`
- Writable runtime storage: explicit 16 MB `/tmp` tmpfs only
- `/`, `/events/`, `/en/`, and `/healthz`: HTTP 200
- Unknown route: branded document with HTTP 404
- HTML and 404 caching: `no-cache`
- Fingerprinted asset caching: `public, max-age=31536000, immutable`
- Server header: `nginx` without a version token
- Runtime file inventory: generated HTML, sitemap/robots, web manifest, icons/social image,
  fonts, styles, JavaScript, and optimized WebP assets only; no source Markdown, source maps,
  environment files, brand PDF, or stock Nginx pages

## Remaining launch blockers

The implementation is locally deployable, but final public-launch signoff still requires the
owner-approved content and legal inputs in `CONTENT_TODOS.md` and original production brand
assets in `BRAND_ASSET_TODOS.md`. The policy and privacy pages remain visibly labeled drafts
until those inputs are supplied.
