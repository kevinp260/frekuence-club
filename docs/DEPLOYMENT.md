# Deployment and rollback

## Current checkpoint topology

Public traffic terminates at the host's existing Nginx installation, which proxies to the Astro
Node container through a loopback-only port. At checkpoint 6 Astro reads published event data from
private Django while PostgreSQL remains private:

```text
Internet → host Nginx/TLS → 127.0.0.1:3010 → Astro Node:8080
                                                ↓ private HTTP
                                           Django:8000 → PostgreSQL:5432
```

The Astro and Django containers run as unprivileged users, drop all Linux capabilities, and use
read-only filesystems with explicit tmpfs/volumes. Django and PostgreSQL publish no host ports.
This is deliberately an intermediate review topology. The final single-gateway routing, processed
media serving, `/staff/` routing, and host Nginx integration remain checkpoint 7; do not expose
Django directly or add a checkpoint 6 proxy shortcut.

PostgreSQL data, processed poster media, and collected staff static files use the named
`postgres_data`, `backend_media`, and `backend_static` volumes. The application never migrates or
creates accounts as a startup side effect.

## Environment and secrets

Copy `.env.example` to ignored `.env` for local development and replace every relevant placeholder.
Production values must be injected at runtime from the deployment environment or secret manager,
not committed, passed as Docker build arguments, or stored in frontend `PUBLIC_*` variables.

Production requires:

- `DJANGO_ENVIRONMENT=production` and `DJANGO_DEBUG=false`;
- a unique high-entropy `DJANGO_SECRET_KEY` of at least 32 characters;
- exact `DJANGO_ALLOWED_HOSTS` and HTTPS `DJANGO_CSRF_TRUSTED_ORIGINS` values;
- `DJANGO_SECURE_SSL_REDIRECT=true` and `DJANGO_SECURE_COOKIES=true`;
- unique PostgreSQL credentials.
- `FREKUENCE_EVENT_API_ORIGIN=http://backend:8000` (or the exact private service origin) and an
  integer `FREKUENCE_EVENT_API_TIMEOUT_MS` from 250 through 5,000, normally `2000`.

The Astro API origin and timeout are server runtime configuration. Never place the origin,
credentials, or another secret in a `PUBLIC_*` variable. The API is anonymous in this phase and
requires no credential; do not add one to browser JavaScript or a build argument.

Django accepts only `development`, `test`, or `production` as the environment name and fails closed
for any other value. It refuses to start in production with debug, insecure cookies, HTTPS redirect
configured incorrectly, an empty PostgreSQL password, or either documented development/default
PostgreSQL password. The Compose defaults are visibly development-only and must never be used for a
public deployment.

## Backend build, migration, and checks

All backend application processes and maintenance commands run in containers:

```sh
docker compose --profile tools run --rm --build backend-check
docker compose --profile tools run --rm --build backend-migrate
docker compose --profile tools run --rm --build backend-static
docker compose up -d --build backend
docker compose ps
```

`backend-check` runs Ruff formatting/lint, pending-migration detection, Django system and deployment
checks, all migrations against PostgreSQL, the backend test suite, and the installed-environment
dependency audit. `backend-migrate` is the explicit migration job. Review the migration plan and
take a matched database/media backup before applying a new production migration. The long-running
backend process never runs `migrate` itself.

Backend health can be checked from its private network without adding a host port:

```sh
docker compose exec backend python -c "import os, urllib.request; host = os.environ['DJANGO_ALLOWED_HOSTS'].split(',')[0].strip(); request = urllib.request.Request('http://127.0.0.1:8000/healthz/', headers={'Host': host, 'X-Forwarded-Proto': 'https'}); print(urllib.request.urlopen(request).status)"
```

The probe uses the first exact configured allowed host and marks the private HTTP hop as HTTPS at
the trusted proxy boundary. The command must print `200`; an otherwise identical public HTTP
request without that trusted header still redirects to HTTPS. `docker compose ps` must show only
the Astro `web` service with a loopback host binding; Django and PostgreSQL must show only their
private container ports.

## Private event API verification

The checkpoint 5 API exists inside Django but is not routed through the public Astro container or
host Nginx. Verify it from the private Compose network only; do not add a temporary host port:

```sh
docker compose exec backend python -c "import json, os, urllib.request; host = os.environ['DJANGO_ALLOWED_HOSTS'].split(',')[0].strip(); request = urllib.request.Request('http://127.0.0.1:8000/api/v1/events/?locale=sq&when=upcoming&limit=6', headers={'Host': host, 'X-Forwarded-Proto': 'https'}); response = urllib.request.urlopen(request); print(response.status, response.headers['ETag']); print(json.load(response)['count'])"
```

The response must be `200`, include an ETag, and contain only intentionally published records.
Supported read contracts are:

- `/api/v1/events/?locale=sq|en&when=upcoming|recent&limit=1..20&offset=0..10000`;
- `/api/v1/events/{slug}/?locale=sq|en`.

Albanian, `upcoming`, a six-item limit, and offset zero are the list defaults. Offsets above 10,000
are rejected with 400 before database slicing. Send the returned ETag in `If-None-Match` to verify a
`304` response. Unknown and unpublished detail slugs share the same non-disclosing 404. Original
media is never an API asset; only managed derivatives are serialized. Public API routing,
derivative media serving, proxy limits, and cache handling at the gateway remain checkpoint 7
work. Astro now consumes the API privately for on-demand event pages.

## Staff accounts and TOTP

There is no public signup. Create a named staff account interactively, assign it to the migrated
`Event editors` group, then provision a TOTP device. Use a private absolute directory outside this
repository and outside Django media/static roots for the QR output:

```sh
docker compose --profile tools run --rm backend-migrate python manage.py createsuperuser
docker compose --profile tools run --rm --volume /absolute/private-directory:/private \
  backend-migrate python manage.py provision_totp STAFF_USERNAME --output /private/staff-totp.png
```

The QR file is created mode `0600`; its secret and enrollment URI are never printed. Transfer it
securely, enroll it immediately, confirm an authenticated staff session, and delete the file. Do not
share staff accounts. Day-to-day staff should use the `Event editors` group rather than a
superuser. Production account recipients, TOTP recovery, and emergency-account ownership remain a
launch TODO.

## Development fixture and staff visual review

The fixture command is absent from the production backend image. In an ignored local `.env`, set a
development-only username, a unique password, a random 40-character hexadecimal TOTP key, and the
host UID/GID used to own screenshots. Then run:

```sh
docker compose --profile fixtures run --rm --build backend-fixtures
docker compose --profile tools run --rm --build backend-static
docker compose up -d --build backend
docker compose --profile tools run --rm --build staff-visual
```

This creates only an unmistakably labelled draft and writes the desktop/laptop evidence under
`docs/review/phase-2-backend-foundation/`. It never reads candidate posters and refuses to proceed
without the explicit fixture profile/opt-in.

## Backend backup and restoration

Back up PostgreSQL and media as one release operation. The final destination, retention, owner, and
automation remain production launch TODOs. A manual checkpoint backup can use:

```sh
docker compose exec -T db pg_dump --username=frekuence --dbname=frekuence \
  --format=custom --file=/tmp/frekuence.dump
docker cp frekuence-website-db-1:/tmp/frekuence.dump /absolute/backup-directory/frekuence.dump
docker compose --profile tools run --rm --no-deps \
  --volume /absolute/backup-directory:/backup backend-migrate \
  tar -C /vol/media -czf /backup/frekuence-media.tar.gz .
```

Use the configured database/user names rather than the development defaults. Store the two files
together, encrypted and access-controlled. Test restoration into an isolated Compose project—never
over live data—by restoring the database with the pinned PostgreSQL image and expanding the media
archive into that isolated project's media volume. Then run `migrate --check`, Django system checks,
count draft/published records, verify processed-image files, and sign in with a designated test
account. A database-only or media-only restore is incomplete.

For checkpoint 5 rollback, deploy the previous backend image while retaining the named data/media
volumes. Checkpoint 5 adds no database migration, so no schema reversal is required. Do not reverse
the checkpoint 4 Event migration in place: that would drop data. The Astro image and public routing
remain unchanged throughout this rollback.

For checkpoint 6 rollback, deploy the previous static frontend image and retain the backend and
named data/media volumes. Checkpoint 6 adds no database migration. Astro and any future checkpoint
7 proxy configuration must always be rolled back as one compatible unit.

## Before launch

1. Resolve the launch blockers in `CONTENT_TODOS.md` and `BRAND_ASSET_TODOS.md`.
2. Point the apex DNS record to the host and allow inbound HTTP and HTTPS on ports 80 and 443.
3. Install Certbot and its Nginx plugin using the instructions for the host operating system.
4. Review `deploy/nginx/frekuence.club.conf.example` against the host's existing default-host,
   logging, and include conventions. The example is an HTTP bootstrap configuration; do not
   copy it blindly.
5. Confirm the public Astro application port. The default is `3010`; set `FREKUENCE_WEB_PORT` to another
   loopback port if needed.
6. Complete checkpoint 7 before public deployment. It must replace the former static JSON-LD hash
   policy with preservation of Astro's per-response nonce policy and must not add competing CSP
   headers.

## Build and verify

Use an immutable deployment tag, such as a release number or commit identifier:

```sh
FREKUENCE_WEB_TAG=2026-08-29.1 docker compose build --pull web
FREKUENCE_WEB_TAG=2026-08-29.1 docker compose up -d --no-deps web
docker compose ps
curl --fail --show-error http://127.0.0.1:3010/about/
curl --fail --show-error http://127.0.0.1:3010/
curl --fail --show-error http://127.0.0.1:3010/en/
curl --silent --output /dev/null --write-out '%{http_code}\n' http://127.0.0.1:3010/not-found-check/
```

The final command must print `404`. Also verify that the published socket is
`127.0.0.1:<port>`, never `0.0.0.0:<port>`. At checkpoint 6 the root and event routes require a
healthy private Django API; `/about/` is the frontend health target because it isolates frontend
process health from backend readiness.

Verify the dynamic boundary directly on the loopback port:

```sh
curl --fail --show-error http://127.0.0.1:3010/
curl --fail --show-error http://127.0.0.1:3010/events/
curl --fail --show-error http://127.0.0.1:3010/sitemap.xml
curl --silent --output /dev/null --write-out '%{http_code}\n' \
  http://127.0.0.1:3010/events/not-a-published-event/
```

The last command must print `404`. Each dynamic HTML response must contain a request-specific CSP
nonce and must not contain `unsafe-inline` or `unsafe-eval`. Managed poster URLs are same-origin
`/media/` paths but are not publicly served until the checkpoint 7 gateway mounts the media volume.

Run the checkpoint 6 production integration smoke after frontend/backend changes:

```sh
npm run smoke:production-integration
```

The command starts a separate Compose project with production Django HTTPS/cookie settings and
non-default smoke-only credentials, migrates a fresh PostgreSQL volume, and publishes one clearly
synthetic event with empty optional poster alt text and lineup. It checks the homepage, event index,
sitemap, and both localized details through Astro, confirms direct Django HTTP still redirects when
the trusted proxy header is absent, and removes its project-scoped containers and volumes.

## Configure host Nginx and TLS

Install the reviewed HTTP bootstrap configuration through the host's normal Nginx process,
then validate and reload Nginx:

```sh
sudo nginx -t
sudo systemctl reload nginx
curl --fail --show-error http://frekuence.club/about/
```

The HTTP site must be reachable publicly on port 80 before using Certbot's Nginx HTTP-01
workflow. Obtain and install the apex certificate, and have Certbot enable the HTTPS redirect:

```sh
sudo certbot --nginx -d frekuence.club --redirect
sudo nginx -t
sudo certbot renew --dry-run
```

The supplied template intentionally covers only the canonical apex domain. If
`www.frekuence.club` is required, point its DNS record to the host, add a dedicated canonical
redirect virtual host, and include `-d www.frekuence.club` when requesting the certificate.
Do not request that name until its public DNS record resolves to this host.

After Certbot succeeds, verify HTTPS, the HTTP-to-HTTPS redirect, response headers,
canonicals, both languages, the sitemap, and a real unknown URL from outside the host.

Do not enable HSTS until the HTTPS deployment and included subdomains are known to work.

## Staging indexing protection

Set `PUBLIC_NOINDEX=true` when creating a non-production build. Production builds must
omit that variable. The output validator rejects accidental `noindex` on canonical routes.

## Rollback

Keep the last known-good image tag. To roll back, select that exact tag and start it without a
rebuild:

```sh
FREKUENCE_WEB_TAG=2026-08-20.1 docker compose up -d --no-build --no-deps web
docker compose ps
curl --fail --show-error http://127.0.0.1:3010/about/
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
docker compose --profile tools run --rm --build frontend-check
docker compose --profile tools run --rm --build backend-check
docker compose build web backend
docker compose up -d web backend
```

The asset-generation step is needed only after temporary source exports change and requires a
local Chromium-compatible browser. All first-party browser assets are committed, so ordinary
production builds do not fetch fonts or imagery. The browser and Lighthouse commands each
manage their own loopback preview server. `frontend-check` is the Docker equivalent of the frontend
build plus e2e suite; `backend-check` is the complete Docker-only backend gate.
