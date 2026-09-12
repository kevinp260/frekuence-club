# Deployment and rollback

## Completed Phase 2 production topology

The completed Phase 2 implementation uses the production container topology specified in the
active brief:

```text
Internet → host Nginx/TLS → 127.0.0.1:3010 → gateway Nginx:8080
                                                   ├─ Astro Node web:8080
                                                   ├─ Django:8000
                                                   ├─ collected static (read-only)
                                                   └─ derivatives (read-only)
                                                          ↓
                                      Django → PostgreSQL:5432 on database network
```

`gateway` is the only service with a host binding. It shares the `application` network with Astro
and Django but is absent from the internal `database` network. Django is the only application
service on both networks. PostgreSQL, Astro, and Django have no host ports.

Long-running application containers run with dropped capabilities and no-new-privileges; gateway,
Astro, and Django use read-only root filesystems and explicit tmpfs paths. Gateway, Astro, Django,
and PostgreSQL have health checks, restart policies, init handling, and bounded graceful shutdown.
The pinned unprivileged gateway image runs as UID/GID 101. Named `postgres_data`, `backend_media`,
and `backend_static` volumes persist independently of normal container recreation. Gateway mounts
media and static read-only.

The root `compose.yaml` orchestrates first-party images from `services/frontend/`,
`services/backend/`, and `services/gateway/`. The host-managed Nginx example remains under
`deploy/nginx/`; cross-service deployment and smoke scripts remain under root `scripts/`.

## Environment and secrets

Copy `.env.example` to ignored `.env` for local development and replace its placeholders.
Production values must come from the runtime environment or a protected secret manager—never
source control, build arguments, frontend `PUBLIC_*` variables, fixtures, image layers, or logs.

Production requires:

- `FREKUENCE_GATEWAY_PORT=3010` or another unused loopback port;
- immutable `FREKUENCE_GATEWAY_TAG`, `FREKUENCE_WEB_TAG`, and `FREKUENCE_BACKEND_TAG` values;
- `FREKUENCE_EVENT_API_ORIGIN=http://backend:8000` and a 250–5,000 ms integer API timeout;
- `DJANGO_ENVIRONMENT=production`, `DJANGO_DEBUG=false`, secure cookies, and HTTPS redirect;
- a unique high-entropy `DJANGO_SECRET_KEY` containing at least 32 characters;
- exact public and private-request hosts, normally `DJANGO_ALLOWED_HOSTS=frekuence.club,backend`;
- `DJANGO_CSRF_TRUSTED_ORIGINS=https://frekuence.club`;
- unique non-default PostgreSQL database, user, and password values.

Django rejects unknown environment names, insecure production cookie/redirect settings, and empty
or documented development PostgreSQL passwords. Astro's API origin and timeout are server-only.
The API is anonymous/read-only and requires no credential.

## Development lifecycle

Run all database and application processes in Compose. Apply migrations and collect static files
before starting the long-running services:

```sh
docker compose config
docker compose --profile tools run --rm --build backend-migrate
docker compose --profile tools run --rm --build backend-static
docker compose up -d --build --wait db backend web gateway
docker compose ps
docker compose port gateway 8080
```

The last command must show `127.0.0.1:<port>`. `docker compose port web 8080`, `docker compose port
backend 8000`, and `docker compose port db 5432` must return no binding. Normal `up`, restart, and
recreate operations never migrate, collect static files, create staff accounts, or load fixtures.

Stop the local stack without deleting persistent data:

```sh
docker compose down
```

Do not add `--volumes` to routine stop/recreate commands. That flag deletes project-scoped data and
is reserved for disposable test projects such as the production smoke.

## Production deployment order

Use immutable tags, take a matched database/media backup, and review the migration plan before
changing running containers:

```sh
export FREKUENCE_GATEWAY_TAG=2026-09-10.1
export FREKUENCE_WEB_TAG=2026-09-10.1
export FREKUENCE_BACKEND_TAG=2026-09-10.1

docker compose build --pull gateway web backend
docker compose --profile tools run --rm backend-migrate python manage.py showmigrations --plan
docker compose run --rm --no-deps gateway nginx -t
docker compose up -d --wait db
docker compose --profile tools run --rm backend-migrate
docker compose --profile tools run --rm backend-static
docker compose up -d --no-build --wait backend web gateway
docker compose ps
```

The migration and static jobs use the same immutable backend tag as the application. Never run
multiple migration jobs concurrently. If a migration is not backward-compatible, deploy a
reviewed expand/migrate/contract sequence instead of starting old and new code against an
incompatible schema.

## Gateway routes, limits, and headers

Gateway routes are deliberately narrow:

| Path                         | Destination / behavior                                                                 |
| ---------------------------- | -------------------------------------------------------------------------------------- |
| `/` and public routes        | Astro Node; GET and HEAD only                                                          |
| `/_astro/`                   | Astro versioned assets; immutable one-year cache                                       |
| `/api/`                      | Django read-only API; Django retains ETag, 304, cache, OPTIONS, HEAD, and 405 behavior |
| `/staff/`                    | Django Admin; normal form methods and CSRF; response cache forced to `no-store`        |
| `/static/`                   | read-only collected Django static volume; one-hour public cache                        |
| `/media/events/derivatives/` | read-only randomized WebP derivatives; immutable one-year cache                        |
| every other `/media/` path   | 404, including real managed original paths                                             |
| `/healthz`                   | gateway-local health response; `no-store`                                              |

The default body limit is 1 MiB. `/staff/` accepts at most 16 MiB total, leaving bounded multipart
overhead above Django's 15 MiB poster-file limit; Django independently verifies file bytes,
decoded pixels, and content. Gateway connect timeout is 5 seconds; normal upstream reads/sends are
35 seconds and staff reads/sends are 60 seconds.

Host Nginx is the public TLS boundary and overwrites client-supplied forwarding headers. Gateway
accepts only a single syntactically plausible IPv4/IPv6 value, never appends a forwarding chain,
and falls back to its trusted socket peer for absent, multi-value, or malformed input. Django's
django-axes resolver then validates and canonicalizes the single address with Python's `ipaddress`
module, falling back to a valid socket address or no address. The resolved value supplies Axes'
combined username/address lockout key and its access records. Gateway also emits one normalized
host, scheme, and port value, and clears generic `Forwarded`, request CSP, and request nonce
headers. An exact inbound `https` scheme from the loopback host boundary is sent to Django as
HTTPS. Other/missing values become HTTP, so `SECURE_SSL_REDIRECT` remains effective.

Astro owns its dynamic per-response Content Security Policy and nonce. Gateway and host Nginx do
not add, hide, or replace CSP response headers. Gateway normalizes one frame, MIME-sniffing,
referrer, permissions, cross-origin-opener, and scheme-aware HSTS policy so upstream duplicates do
not conflict. Upstream redirects are not rewritten, and applications receive the public `Host`,
preventing private service names in redirects or response content.

## Health and route verification

Verify all four health checks and the public boundary:

```sh
docker compose ps
docker compose exec gateway wget -q -O - http://127.0.0.1:8080/healthz
docker compose exec web node -e "fetch('http://127.0.0.1:8080/about/').then(r=>{console.log(r.status);process.exit(r.ok?0:1)}).catch(()=>process.exit(1))"
docker compose exec backend python -c "import os,urllib.request; host=os.environ['DJANGO_ALLOWED_HOSTS'].split(',')[0].strip(); request=urllib.request.Request('http://127.0.0.1:8000/healthz/',headers={'Host':host,'X-Forwarded-Proto':'https'}); print(urllib.request.urlopen(request,timeout=2).status)"
docker compose exec db pg_isready --username="$POSTGRES_USER" --dbname="$POSTGRES_DB"
```

Verify representative routes on the loopback boundary while reproducing the headers the host TLS
proxy sends:

```sh
curl --fail --show-error -H 'Host: frekuence.club' -H 'X-Forwarded-Proto: https' http://127.0.0.1:3010/
curl --fail --show-error -H 'Host: frekuence.club' -H 'X-Forwarded-Proto: https' http://127.0.0.1:3010/en/
curl --fail --show-error -H 'Host: frekuence.club' -H 'X-Forwarded-Proto: https' http://127.0.0.1:3010/events/
curl --fail --show-error -H 'Host: frekuence.club' -H 'X-Forwarded-Proto: https' http://127.0.0.1:3010/sitemap.xml
curl --silent --output /dev/null --write-out '%{http_code}\n' -H 'Host: frekuence.club' -H 'X-Forwarded-Proto: https' http://127.0.0.1:3010/not-found-check/
```

The last command must print `404`. Verify an actual published event detail and derivative only
after staff intentionally publish confirmed content. Never use a candidate poster as evidence of
publication.

For API conditional behavior:

```sh
curl --dump-header /tmp/frekuence-api.headers --output /tmp/frekuence-api.json \
  -H 'Host: frekuence.club' -H 'X-Forwarded-Proto: https' \
  'http://127.0.0.1:3010/api/v1/events/?locale=sq&when=upcoming&limit=6&offset=0'
```

Read the returned `ETag`, then resend it in `If-None-Match`; the response must be 304 with no body.
Do not record private API hostnames or runtime secrets in deployment evidence.

## Host Nginx and Certbot

`deploy/nginx/frekuence.club.conf.example` is an HTTP bootstrap template, not a file to copy over an
unknown host configuration blindly. It proxies every request only to the loopback gateway. It
overwrites `Host`, client IP, forwarding chain, scheme, and port, clears generic `Forwarded` and
request nonce headers, and does not emit a CSP. Its 16 MiB outer request limit permits the bounded
staff upload through to gateway; gateway still enforces the smaller route-specific/public limits.

Review the template against the host's logging/default-site conventions, install it through the
host's normal sites workflow, validate, and reload:

```sh
sudo cp deploy/nginx/frekuence.club.conf.example /etc/nginx/sites-available/frekuence.club.conf
sudo ln -s /etc/nginx/sites-available/frekuence.club.conf /etc/nginx/sites-enabled/frekuence.club.conf
sudo nginx -t
sudo systemctl reload nginx
curl --fail --show-error http://frekuence.club/about/
```

If the symlink or destination already exists, edit/review the existing file instead of overwriting
it. Once DNS and HTTP reachability are confirmed, use Certbot's Nginx integration:

```sh
sudo certbot --nginx -d frekuence.club --redirect
sudo nginx -t
sudo systemctl reload nginx
sudo certbot renew --dry-run
```

Do not request `www.frekuence.club` until its DNS and canonical redirect are approved. Certbot owns
certificate paths and the HTTP-to-HTTPS redirect. Do not add another CSP or weaken Astro's nonce
policy while adapting the generated TLS server.

## Staff accounts and TOTP

There is no public signup. Bootstrap the first named superuser as an explicit one-off operation:

```sh
docker compose --profile tools run --rm backend-migrate python manage.py createsuperuser
```

Sign in at `/staff/` with that account. TOTP is optional per account: a user with no confirmed
authenticator signs in with a password, while a user who enables it receives a separate
authenticator-code step after the password succeeds. Five rejected authenticator codes discard the
partial sign-in and require the password step again. **Account security** in the staff header lets
the current user enable TOTP by scanning a QR code, or disable it by confirming both the account
password and a current code. Disabling changes the password hash and invalidates other sessions.

Staff access uses one role selector backed by Django permissions:

| Role          | Event access                       | Staff-account access                       |
| ------------- | ---------------------------------- | ------------------------------------------ |
| Event viewer  | Read events                        | None                                       |
| Event editor  | Read, create, and edit drafts      | None                                       |
| Event manager | Manage drafts and published events | None                                       |
| Staff manager | Full event management              | Create/edit/deactivate ordinary staff      |
| Superuser     | Full event management              | Manage all staff and grant elevated access |

Event publishing, featuring, unpublishing, and deletion require Event manager access or higher.
Event editors can still read published records, but cannot modify them. Staff managers cannot see,
change, or reset another Staff manager or a Superuser and cannot assign either of those roles; only
a Superuser can grant or maintain equal or higher administrative access. Accounts are deactivated
instead of deleted so event-creator/updater audit history remains intact.

Superusers and Staff managers provision users from **Staff accounts → Add staff account**. The new
account has no usable password and cannot be used until the recipient completes the generated setup
link. The raw bearer token is shown once in the URL fragment, is stored only as a digest, expires
after 24 hours, and is accepted once. Send the complete link through a private channel. The
recipient chooses a strong password and may connect an authenticator immediately or explicitly
skip it. No email is sent by the application.

If a user loses a device, another authorized account manager can open that staff account and choose
**Reset access**. The manager must re-enter their own password and, if enabled on their account, a
current authenticator code. Reset access invalidates the target password and sessions, removes the
target authenticator, and returns a new one-time setup link. A Staff manager cannot reset another
Staff manager or a Superuser, and nobody can reset their own account through this flow; operator
ownership of an emergency superuser remains required.

The `provision_totp` command remains an operator-only recovery/bootstrap fallback. If it is needed,
use a private absolute directory outside the repository and media/static storage:

```sh
docker compose --profile tools run --rm --volume /absolute/private-directory:/private \
  backend-migrate python manage.py provision_totp STAFF_USERNAME --output /private/staff-totp.png
```

The fallback QR is mode `0600`; its secret is never printed. Transfer it securely and delete it
after enrollment. Day-to-day staff use the lowest suitable named role, not shared superuser accounts.
Production recipients, credential custody, and emergency-account ownership remain owner/operator
TODOs. Because TOTP is now an owner-approved optional control rather than a production requirement,
the operator should record which production accounts enable it as part of access review.

## Development fixtures

Fixtures are opt-in, draft-only, and unavailable in the production image. After setting unique
development-only credentials in ignored `.env`:

```sh
docker compose --profile fixtures run --rm --build backend-fixtures
docker compose --profile tools run --rm --build backend-static
docker compose up -d --build --wait backend web gateway
docker compose --profile tools run --rm --build staff-visual
```

The fixture workflow never publishes an event and never reads candidate poster artwork.

## Matched backup and isolated restoration

Back up PostgreSQL and media under the same release/timestamp. Replace placeholders with configured
names and a private encrypted destination:

```sh
mkdir -p /absolute/private-backup/2026-09-10T2000Z
docker compose exec -T db pg_dump --username=PRODUCTION_DB_USER \
  --dbname=PRODUCTION_DB_NAME --format=custom \
  > /absolute/private-backup/2026-09-10T2000Z/frekuence.dump
docker compose --profile tools run --rm --no-deps \
  --volume /absolute/private-backup/2026-09-10T2000Z:/backup backend-migrate \
  tar -C /vol/media -czf /backup/frekuence-media.tar.gz .
```

The final encrypted destination, retention, backup owner, automation, and alerting remain owner
inputs. A database-only or media-only backup is incomplete.

Test restoration in a separately named Compose project with isolated volumes and a non-production
port. Never restore over live volumes:

```sh
export COMPOSE_PROJECT_NAME=frekuence-restore-check
export FREKUENCE_GATEWAY_PORT=0
export FREKUENCE_GATEWAY_TAG=COMPATIBLE_GATEWAY_TAG
export FREKUENCE_WEB_TAG=COMPATIBLE_WEB_TAG
export FREKUENCE_BACKEND_TAG=COMPATIBLE_BACKEND_TAG

docker compose up -d --wait db
cat /absolute/private-backup/2026-09-10T2000Z/frekuence.dump | \
  docker compose exec -T db \
  pg_restore --clean --if-exists --no-owner --username=PRODUCTION_DB_USER \
  --dbname=PRODUCTION_DB_NAME
docker compose --profile tools run --rm --no-deps \
  --volume /absolute/private-backup/2026-09-10T2000Z:/backup backend-migrate \
  tar -C /vol/media -xzf /backup/frekuence-media.tar.gz
docker compose --profile tools run --rm backend-migrate \
  python manage.py migrate --check
docker compose --profile tools run --rm backend-static
docker compose up -d --no-build --wait backend web gateway
```

The exported project name isolates every container, network, and named volume from the live stack;
the random host port remains active when gateway starts. The three explicit compatible tags apply
to the restore jobs and long-running services for the full exercise. The explicit `backend-static`
job populates the new isolated static volume before gateway starts; normal application startup
still performs no collection. Run the workflow in a fresh shell and close that shell when finished
so none of these restore-scoped values affect later production commands.

Then verify event counts, managed derivative files, staff login with a designated test account,
API/public routes, and a real 404 before recording the restore exercise. End the isolated exercise
according to the operator's data-retention policy; this document intentionally provides no
destructive volume-removal command. Checkpoint 8's integrated smoke proves a matched logical
database/media restoration in disposable isolated volumes, but it does not prove the operator's
encrypted destination or a restoration of production data.

## Rollback

For an application release rollback, select the previous compatible gateway/frontend/backend
image tags and proxy configuration while retaining named volumes:

```sh
FREKUENCE_GATEWAY_TAG=PREVIOUS_GATEWAY_TAG \
FREKUENCE_WEB_TAG=PREVIOUS_WEB_TAG \
FREKUENCE_BACKEND_TAG=PREVIOUS_BACKEND_TAG \
docker compose up -d --no-build --wait backend web gateway
docker compose ps
```

Rollback gateway, Astro, and host Nginx as one compatible unit. Validate the previous host config
with `sudo nginx -t` before reloading. Do not reverse checkpoint 4's Event migration in place; it
would drop data. For a future schema rollback, use the migration's reviewed reverse operation only
when proven data-preserving, otherwise restore the matched database/media backup into an isolated
environment and deploy compatible code.

## Validation and remaining launch work

Run the container gates before deployment:

```sh
docker compose config
docker compose --profile tools run --rm --build backend-check
docker compose --profile tools run --rm --build frontend-check
docker compose run --rm --no-deps gateway nginx -t
npm run smoke:production-topology
npm run smoke:integrated-qa
npm run audit:lighthouse:integrated
git diff --check
```

`npm run smoke:production-integration` remains the narrower checkpoint 6 Django/Astro test. The
checkpoint 7 smoke creates an unmistakably synthetic event only inside disposable project-scoped
volumes, verifies the full proxy and persistence boundary, and removes those resources afterward.

The checkpoint 8 integrated smoke creates only synthetic records in a uniquely named source
project, backs up its PostgreSQL and media volumes into a private temporary directory, and restores
them into a second uniquely named project with separate volumes and a separate random loopback
port. It verifies restored records, derivatives, TOTP staff access, public/API routes, a real 404,
container restrictions, production-image exclusions, and health before deleting only those two
validated disposable projects. This demonstrates the repository procedure; it does not prove the
operator's encrypted production destination, retention, monitoring, or real credentials.

## Operator-dependent production signoff

Repository validation did not access the real host, DNS, TLS certificates, encrypted backup
destination, monitoring, or owner credentials. An authorized operator must run these checks on the
deployment host after replacing the example values:

```sh
dig +short A frekuence.club
sudo nginx -t
sudo certbot certificates
sudo certbot renew --dry-run
curl --fail --show-error --head https://frekuence.club/
curl --fail --show-error --head https://frekuence.club/en/
curl --silent --output /dev/null --write-out '%{http_code}\n' \
  https://frekuence.club/operator-real-404-check/
docker compose ps
```

DNS must return the approved public host, both localized requests must succeed over a valid TLS
chain, the deliberate unknown path must print `404`, Nginx and renewal tests must succeed, and all
four Compose services must report healthy. Then use the matched backup and isolated-restoration
commands above with an access-controlled encrypted destination, record checksums and retention,
and confirm restored staff TOTP login plus a published event/API pair without modifying live
volumes. Monitoring must independently alert on gateway, frontend, backend, and database health;
its provider, destinations, and test procedure remain owner/operator inputs.

Owner staff must also complete a real two-factor login at `/staff/` using individually provisioned
credentials and confirm only the intended event permissions. Do not place credentials, QR codes,
session cookies, backup keys, or monitoring tokens in command history, repository files, reports,
or logs. Final event publication, legal/contact inputs, and approved source brand assets remain in
`CONTENT_TODOS.md` and `BRAND_ASSET_TODOS.md`. Phase 2 implementation handoff is complete, but
production launch remains unsigned until these checks and owner inputs are resolved; see
`PHASE_2_HANDOFF.md` for the concise responsibility and scope summary.
