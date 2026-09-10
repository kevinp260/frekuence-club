#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repository_root}"

smoke_project="frekuence-checkpoint7-smoke-${$}"
compose=(docker compose --project-name "${smoke_project}")

export FREKUENCE_GATEWAY_TAG="checkpoint7-production-smoke"
export FREKUENCE_WEB_TAG="checkpoint7-production-smoke"
export FREKUENCE_BACKEND_TAG="checkpoint7-production-smoke"
export FREKUENCE_GATEWAY_PORT=0
export FREKUENCE_EVENT_API_ORIGIN="http://backend:8000"
export FREKUENCE_EVENT_API_TIMEOUT_MS=2000
export DJANGO_ENVIRONMENT=production
export DJANGO_SECRET_KEY="checkpoint7-production-smoke-application-key-7Pq4vN8xR2mK6wC3"
export DJANGO_DEBUG=false
export DJANGO_ALLOWED_HOSTS="frekuence.club,backend,localhost,127.0.0.1"
export DJANGO_CSRF_TRUSTED_ORIGINS="https://frekuence.club,https://backend"
export DJANGO_SECURE_SSL_REDIRECT=true
export DJANGO_SECURE_COOKIES=true
export POSTGRES_DB="frekuence_checkpoint7_smoke"
export POSTGRES_USER="frekuence_checkpoint7_smoke_user"
export POSTGRES_PASSWORD="checkpoint7-production-smoke-database-password-7Pq4vN8xR2"

fail() {
  echo "Production topology smoke failed: $*" >&2
  exit 1
}

cleanup() {
  status=$?
  trap - EXIT
  if ((status != 0)); then
    "${compose[@]}" logs --no-color gateway web backend db || true
  fi
  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  exit "${status}"
}
trap cleanup EXIT

echo "Validating the resolved Compose topology..."
"${compose[@]}" config --quiet

echo "Building and validating the pinned gateway image..."
"${compose[@]}" build gateway
"${compose[@]}" run --rm --no-deps gateway nginx -t

echo "Starting an isolated production PostgreSQL service..."
"${compose[@]}" up --detach --wait db

echo "Applying migrations and collecting static files as explicit one-off jobs..."
"${compose[@]}" --profile tools run --rm --build backend-migrate
"${compose[@]}" --profile tools run --rm --build backend-static

echo "Starting the production application and gateway services..."
"${compose[@]}" up --detach --build --wait backend web gateway

gateway_binding="$("${compose[@]}" port gateway 8080)"
[[ "${gateway_binding}" == 127.0.0.1:* ]] || fail "gateway binding is not loopback-only: ${gateway_binding}"
for service in web backend db; do
  container_id="$("${compose[@]}" ps --quiet "${service}")"
  bindings="$(docker inspect --format '{{json .HostConfig.PortBindings}}' "${container_id}")"
  [[ "${bindings}" == "null" || "${bindings}" == "{}" ]] || fail "${service} has a host binding: ${bindings}"
done
echo "Only gateway is host-bound at ${gateway_binding}."

gateway_id="$("${compose[@]}" ps --quiet gateway)"
gateway_networks="$(docker inspect --format '{{range $name, $_ := .NetworkSettings.Networks}}{{$name}} {{end}}' "${gateway_id}")"
[[ "${gateway_networks}" == *"${smoke_project}_application"* ]] || fail "gateway is not on the application network"
[[ "${gateway_networks}" != *"${smoke_project}_database"* ]] || fail "gateway can reach the database network"
gateway_mounts="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/srv/media"}}media={{.RW}} {{end}}{{if eq .Destination "/srv/static"}}static={{.RW}} {{end}}{{end}}' "${gateway_id}")"
[[ "${gateway_mounts}" == *"media=false"* && "${gateway_mounts}" == *"static=false"* ]] || fail "gateway media/static mounts are not read-only: ${gateway_mounts}"
[[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "${gateway_id}")" == "true" ]] || fail "gateway root filesystem is writable"
[[ "$("${compose[@]}" exec --no-TTY gateway id -u)" == "101" ]] || fail "gateway is not running as UID 101"

for service in gateway web backend db; do
  container_id="$("${compose[@]}" ps --quiet "${service}")"
  health="$(docker inspect --format '{{.State.Health.Status}}' "${container_id}")"
  [[ "${health}" == "healthy" ]] || fail "${service} health is ${health}"
done

echo "Creating one unmistakably synthetic published event in isolated storage..."
"${compose[@]}" exec --no-TTY backend python manage.py shell -c \
  'import io; from datetime import timedelta; from django.core.files.uploadedfile import SimpleUploadedFile; from django.utils import timezone; from PIL import Image; from events.models import Event; output = io.BytesIO(); image = Image.new("RGB", (120, 180), "#ff3737"); image.save(output, format="PNG"); image.close(); start = timezone.now() + timedelta(days=7); Event.objects.create(slug="checkpoint7-synthetic-smoke-not-real", title_sq="CHECKPOINT 7 SYNTHETIC SMOKE - JO EVENT REAL", title_en="CHECKPOINT 7 SYNTHETIC SMOKE - NOT A REAL EVENT", summary_sq="Te dhena sintetike vetem per proven e topologjise.", summary_en="Synthetic data used only by the production topology smoke.", description_sq="Ky eshte nje event sintetik dhe nuk eshte event real.", description_en="This is a synthetic event and is not a real event.", starts_at=start, ends_at=start + timedelta(hours=6), doors_at=start - timedelta(hours=1), lineup=[], poster=SimpleUploadedFile("checkpoint7-synthetic-smoke.png", output.getvalue(), content_type="image/png"), poster_alt_sq="", poster_alt_en="", publication_status=Event.PublicationStatus.PUBLISHED)'

original_path="$("${compose[@]}" exec --no-TTY backend python manage.py shell -c 'from events.models import Event; print(Event.objects.get(slug="checkpoint7-synthetic-smoke-not-real").poster.name)' | tail -n 1)"
[[ "${original_path}" == events/originals/* ]] || fail "could not resolve the managed original path"

echo "Verifying public, API, staff, static, media, HTTPS, CSP, and error behavior through gateway..."
"${compose[@]}" exec --no-TTY --env "SMOKE_ORIGINAL_URL=/media/${original_path}" web node -e '
  const http = await import("node:http");
  const base = "http://gateway:8080";
  const publicHeaders = { Host: "frekuence.club", "X-Forwarded-For": "198.51.100.24", "X-Forwarded-Proto": "https" };
  const privateMarkers = ["backend:8000", "web:8080", "db:5432", "gateway:8080", "Traceback", "EventApiUnavailableError"];
  const request = (path, { method = "GET", headers = publicHeaders, body } = {}) => new Promise((resolve, reject) => {
    const requestHeaders = { ...headers };
    if (body && requestHeaders["Content-Length"] === undefined) requestHeaders["Content-Length"] = String(body.length);
    const outgoing = http.request(`${base}${path}`, { method, headers: requestHeaders }, (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.on("end", () => resolve({ status: incoming.statusCode, headers: new Headers(incoming.headers), rawHeaders: incoming.rawHeaders, buffer: Buffer.concat(chunks) }));
    });
    outgoing.on("error", reject);
    outgoing.end(body);
  });
  const read = async (path, options = {}) => {
    const response = await request(path, options);
    const body = response.buffer.toString("utf8");
    const combined = `${body}\n${Array.from(response.headers.entries()).flat().join("\n")}`;
    for (const marker of privateMarkers) if (combined.includes(marker)) throw new Error(`${path} leaked ${marker}`);
    return { response, body };
  };

  const routes = [
    ["/", 200, "CHECKPOINT 7 SYNTHETIC SMOKE"],
    ["/en/", 200, "NOT A REAL EVENT"],
    ["/events/", 200, "CHECKPOINT 7 SYNTHETIC SMOKE"],
    ["/events/checkpoint7-synthetic-smoke-not-real/", 200, "CHECKPOINT 7 SYNTHETIC SMOKE"],
    ["/en/events/checkpoint7-synthetic-smoke-not-real/", 200, "NOT A REAL EVENT"],
    ["/sitemap.xml", 200, "/events/checkpoint7-synthetic-smoke-not-real/"],
    ["/definitely-not-a-real-route/", 404, "404"],
  ];
  for (const [path, expectedStatus, marker] of routes) {
    const { response, body } = await read(path);
    if (response.status !== expectedStatus || !body.includes(marker)) throw new Error(`${path} returned ${response.status}`);
    console.log(`${path} ${response.status}`);
  }

  const firstHome = await read("/");
  const secondHome = await read("/");
  const firstPolicy = firstHome.response.headers.get("content-security-policy") ?? "";
  const secondPolicy = secondHome.response.headers.get("content-security-policy") ?? "";
  const noncePattern = new RegExp("script-src \\x27self\\x27 \\x27nonce-([^\\x27]+)\\x27");
  const firstNonce = firstPolicy.match(noncePattern)?.[1];
  const secondNonce = secondPolicy.match(noncePattern)?.[1];
  if (!firstNonce || !secondNonce || firstNonce === secondNonce) throw new Error("CSP nonce is missing or reused");
  const cspHeaderCount = firstHome.response.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === "content-security-policy").length;
  if (cspHeaderCount !== 1 || firstPolicy.includes(",") || firstPolicy.includes("unsafe-inline") || firstPolicy.includes("unsafe-eval")) throw new Error("CSP was duplicated or weakened");
  if (!firstHome.body.includes(`nonce="${firstNonce}"`)) throw new Error("CSP nonce does not match rendered markup");

  const api = await read("/api/v1/events/?locale=sq&when=upcoming&limit=1&offset=0");
  const etag = api.response.headers.get("etag");
  const apiPayload = JSON.parse(api.body);
  if (api.response.status !== 200 || !etag || apiPayload.results.length !== 1) throw new Error("API response or ETag is invalid");
  const conditional = await read("/api/v1/events/?locale=sq&when=upcoming&limit=1&offset=0", { headers: { ...publicHeaders, "If-None-Match": etag } });
  if (conditional.response.status !== 304 || conditional.body !== "") throw new Error(`conditional API returned ${conditional.response.status}`);

  const staff = await read("/staff/");
  if (staff.response.status !== 302 || !(staff.response.headers.get("location") ?? "").startsWith("/staff/login/")) throw new Error("anonymous staff boundary is incorrect");
  if (staff.response.headers.get("cache-control") !== "no-store") throw new Error("staff response is cacheable");
  for (const header of ["x-frame-options", "x-content-type-options", "referrer-policy", "permissions-policy", "cross-origin-opener-policy", "strict-transport-security"]) {
    const count = staff.response.rawHeaders.filter((value, index) => index % 2 === 0 && value.toLowerCase() === header).length;
    if (count !== 1) throw new Error(`staff response emitted ${count} ${header} headers`);
  }
  const login = await read("/staff/login/");
  const cookie = login.response.headers.get("set-cookie") ?? "";
  if (login.response.status !== 200 || !cookie.includes("Secure") || !cookie.includes("HttpOnly")) throw new Error("secure staff CSRF cookie is missing");

  const adminStatic = await read("/static/admin/css/base.css");
  if (adminStatic.response.status !== 200 || !adminStatic.body.includes("--primary")) throw new Error("Django Admin static asset was not served");

  const derivativeUrl = apiPayload.results[0].poster.sources[0]?.url;
  if (!derivativeUrl?.startsWith("/media/events/derivatives/")) throw new Error("managed derivative URL is missing");
  const derivative = await read(derivativeUrl);
  if (derivative.response.status !== 200 || derivative.response.headers.get("content-type") !== "image/webp" || !(derivative.response.headers.get("cache-control") ?? "").includes("immutable")) throw new Error("managed derivative was not served safely");
  const original = await read(process.env.SMOKE_ORIGINAL_URL);
  if (original.response.status !== 404) throw new Error("managed original is publicly accessible");

  const plainHttp = await request("/api/v1/events/?locale=sq", { headers: { Host: "frekuence.club" } });
  if (plainHttp.status !== 301 || plainHttp.headers.get("location") !== "https://frekuence.club/api/v1/events/?locale=sq") throw new Error("Django HTTPS redirect was weakened");
  if (!firstHome.response.headers.get("strict-transport-security")) throw new Error("HTTPS response lost HSTS");

  const oversizedBody = Buffer.alloc(17 * 1024 * 1024);
  const oversized = await request("/staff/login/", { method: "POST", headers: { ...publicHeaders, "Content-Type": "application/octet-stream" }, body: oversizedBody });
  if (oversized.status !== 413) throw new Error(`oversized request returned ${oversized.status}`);

  const unsafePublic = await request("/", { method: "POST", headers: publicHeaders, body: Buffer.from("x") });
  if (unsafePublic.status !== 405) throw new Error(`unsafe public method returned ${unsafePublic.status}`);

  console.log("Gateway route and security checks passed.");
'

echo "Recreating all long-running containers without rerunning deployment jobs..."
"${compose[@]}" up --detach --force-recreate --wait db backend web gateway

for service in gateway web backend db; do
  container_id="$("${compose[@]}" ps --quiet "${service}")"
  health="$(docker inspect --format '{{.State.Health.Status}}' "${container_id}")"
  [[ "${health}" == "healthy" ]] || fail "${service} health after recreation is ${health}"
done

"${compose[@]}" exec --no-TTY web node -e '
  const http = await import("node:http");
  const headers = { Host: "frekuence.club", "X-Forwarded-For": "198.51.100.24", "X-Forwarded-Proto": "https" };
  const request = (path) => new Promise((resolve, reject) => {
    http.get(`http://gateway:8080${path}`, { headers }, (incoming) => {
      const chunks = [];
      incoming.on("data", (chunk) => chunks.push(chunk));
      incoming.on("end", () => resolve({ status: incoming.statusCode, headers: new Headers(incoming.headers), buffer: Buffer.concat(chunks) }));
    }).on("error", reject);
  });
  const api = await request("/api/v1/events/?locale=sq&when=upcoming&limit=1&offset=0");
  const payload = JSON.parse(api.buffer.toString("utf8"));
  if (api.status !== 200 || payload.results[0]?.slug !== "checkpoint7-synthetic-smoke-not-real") throw new Error("database state did not survive recreation");
  const media = await request(payload.results[0].poster.sources[0].url);
  if (media.status !== 200 || media.headers.get("content-type") !== "image/webp") throw new Error("processed media did not survive recreation");
  const staticAsset = await request("/static/admin/css/base.css");
  if (staticAsset.status !== 200) throw new Error("collected static state did not survive recreation");
  console.log("Database, processed media, and static volumes survived recreation.");
'

for job in backend-migrate backend-static; do
  if "${compose[@]}" ps --all --services | grep -Fxq "${job}"; then
    fail "explicit job ${job} remained as a startup service"
  fi
done

echo "Checkpoint 7 production topology smoke passed."
