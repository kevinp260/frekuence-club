#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repository_root}"

smoke_project="frekuence-checkpoint6-smoke-${$}"
compose=(docker compose --project-name "${smoke_project}")

export FREKUENCE_WEB_TAG="checkpoint6-production-smoke"
export FREKUENCE_BACKEND_TAG="checkpoint6-production-smoke"
export FREKUENCE_EVENT_API_ORIGIN="http://backend:8000"
export FREKUENCE_EVENT_API_TIMEOUT_MS=2000
export DJANGO_ENVIRONMENT=production
export DJANGO_SECRET_KEY="checkpoint6-production-smoke-application-key-9Jz7pQ4vN8xR2mK6"
export DJANGO_DEBUG=false
export DJANGO_ALLOWED_HOSTS="backend,localhost,127.0.0.1"
export DJANGO_CSRF_TRUSTED_ORIGINS="https://backend"
export DJANGO_SECURE_SSL_REDIRECT=true
export DJANGO_SECURE_COOKIES=true
export POSTGRES_DB="frekuence_checkpoint6_smoke"
export POSTGRES_USER="frekuence_checkpoint6_smoke_user"
export POSTGRES_PASSWORD="checkpoint6-production-smoke-database-password-4vN8xR2mK6"

cleanup() {
  status=$?
  trap - EXIT
  if ((status != 0)); then
    "${compose[@]}" logs --no-color backend web || true
  fi
  "${compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  exit "${status}"
}
trap cleanup EXIT

echo "Starting isolated production-configured PostgreSQL..."
"${compose[@]}" up --detach --build --wait db

echo "Applying migrations as an explicit production deploy step..."
"${compose[@]}" --profile tools run --rm --build backend-migrate

echo "Starting production-configured Django and Astro services..."
"${compose[@]}" up --detach --build --wait backend web

echo "Creating one unmistakably synthetic published event..."
"${compose[@]}" exec --no-TTY backend python manage.py shell -c \
  'import io; from datetime import timedelta; from django.core.files.uploadedfile import SimpleUploadedFile; from django.utils import timezone; from PIL import Image; from events.models import Event; output = io.BytesIO(); image = Image.new("RGB", (120, 150), "#ff3737"); image.save(output, format="PNG"); image.close(); start = timezone.now() + timedelta(days=7); Event.objects.create(slug="checkpoint6-synthetic-smoke-not-real", title_sq="CHECKPOINT 6 SYNTHETIC SMOKE - JO EVENT REAL", title_en="CHECKPOINT 6 SYNTHETIC SMOKE - NOT A REAL EVENT", summary_sq="Te dhena sintetike vetem per proven e integrimit.", summary_en="Synthetic data used only by the production integration smoke.", description_sq="Ky eshte nje event sintetik dhe nuk eshte event real.", description_en="This is a synthetic event and is not a real event.", starts_at=start, ends_at=start + timedelta(hours=6), doors_at=start - timedelta(hours=1), lineup=[], poster=SimpleUploadedFile("checkpoint6-synthetic-smoke.png", output.getvalue(), content_type="image/png"), poster_alt_sq="", poster_alt_en="", publication_status=Event.PublicationStatus.PUBLISHED)'

echo "Verifying Astro routes and empty optional fields..."
"${compose[@]}" exec --no-TTY web node -e \
  'const checks = [["/", "CHECKPOINT 6 SYNTHETIC SMOKE"], ["/events/", "CHECKPOINT 6 SYNTHETIC SMOKE"], ["/sitemap.xml", "/events/checkpoint6-synthetic-smoke-not-real/"], ["/events/checkpoint6-synthetic-smoke-not-real/", "CHECKPOINT 6 SYNTHETIC SMOKE"], ["/en/events/checkpoint6-synthetic-smoke-not-real/", "NOT A REAL EVENT"]]; const hasEmptyLineupMarkup = (body) => body.includes(`<p class="next-signal__lineup">`) || body.includes(`<p class=next-signal__lineup>`) || body.includes(`<p class="event-card__lineup">`) || body.includes(`<p class=event-card__lineup>`) || body.includes(`id="event-lineup-title"`) || body.includes(`id=event-lineup-title`); for (const [path, marker] of checks) { const response = await fetch(`http://127.0.0.1:8080${path}`, { redirect: "manual" }); const body = await response.text(); if (response.status !== 200 || !body.includes(marker)) throw new Error(`${path} failed: ${response.status}`); if (path !== "/sitemap.xml" && hasEmptyLineupMarkup(body)) throw new Error(`${path} rendered empty lineup markup`); console.log(`${path} ${response.status}`); }'

echo "Verifying ordinary private HTTP still redirects without the trusted proxy header..."
"${compose[@]}" exec --no-TTY web node -e \
  'const response = await fetch("http://backend:8000/api/v1/events/?locale=sq&when=upcoming&limit=1&offset=0", { redirect: "manual" }); const location = response.headers.get("location") ?? ""; if (response.status !== 301 || !location.startsWith("https://backend:8000/")) throw new Error(`Expected HTTPS redirect, received ${response.status} ${location}`); console.log(`direct Django HTTP ${response.status} -> ${location}`);'

echo "Production integration smoke passed."
