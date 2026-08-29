# Frekuence Club website

Phase 1 is a bilingual, fully static Astro site for Frekuence Club in Tirana. Albanian is
served at the root and English under `/en/`. There is no backend, form, account, payment,
reservation flow, analytics, or third-party embed.

## Local commands

```sh
npm ci
npm run dev
npm run check
npm run build
npm run test:e2e
npm run test:visual
npm run audit:lighthouse
```

`npm run build` runs formatting, linting, Astro diagnostics, unit checks, the static build,
and production-output validation. Browser tests use the local Google Chrome installation by
default; set `CHROME_PATH` when Chrome is installed elsewhere. The Lighthouse command starts
and stops its own loopback preview server, then enforces the documented score and Core Web
Vitals thresholds.

The checked-in favicons and social image are derivatives of the temporary, approved brand
exports. Regenerate them with `npm run assets:generate` after changing those source exports.

## Production signoff

The implementation is deployable, but final public-launch approval remains blocked by the
owner inputs listed in [docs/CONTENT_TODOS.md](docs/CONTENT_TODOS.md) and the original assets
listed in [docs/BRAND_ASSET_TODOS.md](docs/BRAND_ASSET_TODOS.md).

The latest local release evidence is recorded in
[docs/VALIDATION_REPORT.md](docs/VALIDATION_REPORT.md).
