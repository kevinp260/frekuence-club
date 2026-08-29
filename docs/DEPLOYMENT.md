# Deployment and rollback

## Topology

Public traffic terminates at the host's existing Nginx installation, which proxies to the
single static web container through a loopback-only port:

```text
Internet → host Nginx/TLS → 127.0.0.1:3010 → container Nginx:8080 → Astro dist
```

The container runs as an unprivileged user, drops all Linux capabilities, uses a read-only
filesystem with an explicit `/tmp` tmpfs, and contains only Nginx plus generated output.

## Before launch

1. Resolve the launch blockers in `CONTENT_TODOS.md` and `BRAND_ASSET_TODOS.md`.
2. Point the apex DNS record to the host. Configure `www` only if its redirect is required.
3. Obtain and verify TLS certificates outside this repository.
4. Review `deploy/nginx/frekuence.club.conf.example` against the host's existing default-host,
   logging, certificate, and include conventions. Do not copy it blindly.
5. Confirm the application port. The default is `3010`; set `FREKUENCE_WEB_PORT` to another
   loopback port if needed.
6. Recompute the JSON-LD CSP hash whenever structured data changes, then update and review the
   host example.

## Build and verify

Use an immutable deployment tag, such as a release number or commit identifier:

```sh
FREKUENCE_WEB_TAG=2026-08-29.1 docker compose build --pull web
FREKUENCE_WEB_TAG=2026-08-29.1 docker compose up -d --no-deps web
docker compose ps
curl --fail --show-error http://127.0.0.1:3010/healthz
curl --fail --show-error http://127.0.0.1:3010/
curl --fail --show-error http://127.0.0.1:3010/en/
curl --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:3010/not-found-check/
```

The final command must print `404`. Also verify that the published socket is
`127.0.0.1:<port>`, never `0.0.0.0:<port>`.

After host Nginx is reviewed and reloaded through the host's normal operational process,
verify HTTP-to-HTTPS and `www` redirects, response headers, canonicals, both languages, the
sitemap, and a real unknown URL from outside the host.

Do not enable HSTS until the HTTPS deployment and included subdomains are known to work.

## Staging indexing protection

Set `PUBLIC_NOINDEX=true` when creating a non-production static build. Production builds must
omit that variable. The output validator rejects accidental `noindex` on canonical routes.

## Rollback

Keep the last known-good image tag. To roll back, select that exact tag and start it without a
rebuild:

```sh
FREKUENCE_WEB_TAG=2026-08-20.1 docker compose up -d --no-build --no-deps web
docker compose ps
curl --fail --show-error http://127.0.0.1:3010/healthz
```

Then verify representative Albanian and English routes and an unknown route before declaring
the rollback complete. Image retention and cleanup should follow the host's existing policy;
this document intentionally contains no destructive cleanup command.

## Local release validation

```sh
npm ci
npm run assets:generate
npm run build
npm run test:e2e
npm run test:visual
npm run audit:lighthouse
docker compose build web
docker compose up -d web
```

The asset-generation step is needed only after temporary source exports change and requires a
local Chromium-compatible browser. All first-party browser assets are committed, so ordinary
production builds do not fetch fonts or imagery. The browser and Lighthouse commands each
manage their own loopback preview server.
