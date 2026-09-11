#!/usr/bin/env bash
set -euo pipefail

repository_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${repository_root}"

source_project="frekuence-checkpoint8-source-${$}"
restore_project="frekuence-checkpoint8-restore-${$}"
source_compose=(docker compose --project-name "${source_project}")
restore_compose=(docker compose --project-name "${restore_project}")
backup_directory="$(mktemp -d /tmp/frekuence-checkpoint8-backup.XXXXXX)"
chmod 700 "${backup_directory}"
umask 077

export FREKUENCE_GATEWAY_TAG="checkpoint8-integrated-qa-${$}"
export FREKUENCE_WEB_TAG="checkpoint8-integrated-qa-${$}"
export FREKUENCE_BACKEND_TAG="checkpoint8-integrated-qa-${$}"
export FREKUENCE_GATEWAY_PORT=0
export FREKUENCE_EVENT_API_ORIGIN="http://backend:8000"
export FREKUENCE_EVENT_API_TIMEOUT_MS=2000
export DJANGO_ENVIRONMENT=production
export DJANGO_SECRET_KEY="checkpoint8-integrated-qa-application-key-7Pq4vN8xR2mK6wC3"
export DJANGO_DEBUG=false
export DJANGO_ALLOWED_HOSTS="frekuence.club,backend,localhost,127.0.0.1"
export DJANGO_CSRF_TRUSTED_ORIGINS="https://frekuence.club,https://backend"
export DJANGO_SECURE_SSL_REDIRECT=true
export DJANGO_SECURE_COOKIES=true
export POSTGRES_DB="frekuence_checkpoint8_qa"
export POSTGRES_USER="frekuence_checkpoint8_qa_user"
export POSTGRES_PASSWORD="checkpoint8-integrated-qa-database-password-7Pq4vN8xR2"

staff_username="checkpoint8-qa-editor"
staff_password="Checkpoint8-QA-editor-password-783"
nonstaff_username="checkpoint8-qa-nonstaff"
nonstaff_password="Checkpoint8-QA-nonstaff-password-783"
totp_key="3132333435363738393031323334353637383930"

fail() {
  echo "Integrated QA smoke failed: $*" >&2
  exit 1
}

cleanup() {
  status=$?
  trap - EXIT
  if ((status != 0)); then
    "${source_compose[@]}" logs --no-color gateway web backend db || true
    "${restore_compose[@]}" logs --no-color gateway web backend db || true
  fi
  [[ "${source_project}" == frekuence-checkpoint8-source-* ]] || exit 1
  [[ "${restore_project}" == frekuence-checkpoint8-restore-* ]] || exit 1
  "${source_compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  "${restore_compose[@]}" down --volumes --remove-orphans >/dev/null 2>&1 || true
  if [[ "${backup_directory}" == /tmp/frekuence-checkpoint8-backup.* ]]; then
    find "${backup_directory}" -mindepth 1 -delete >/dev/null 2>&1 || true
    rmdir "${backup_directory}" >/dev/null 2>&1 || true
  fi
  exit "${status}"
}
trap cleanup EXIT

for project in "${source_project}" "${restore_project}"; do
  [[ "${project}" != "frekuence-website" && "${project}" != "frekuence" ]] || \
    fail "refusing to use a non-disposable Compose project"
done

echo "Building the immutable checkpoint 8 image set once..."
"${source_compose[@]}" config --quiet
"${source_compose[@]}" build gateway web backend
"${source_compose[@]}" run --rm --no-deps gateway nginx -t

echo "Deploying the disposable source stack with explicit jobs..."
"${source_compose[@]}" up --detach --wait db
"${source_compose[@]}" --profile tools run --rm backend-migrate
"${source_compose[@]}" --profile tools run --rm backend-static
"${source_compose[@]}" up --detach --no-build --wait backend web gateway

echo "Seeding the synthetic event-state and staff matrix..."
fixture_output="$(
  "${source_compose[@]}" --profile tools run --rm --no-deps \
    --volume "${repository_root}/scripts/seed-integrated-qa.py:/tmp/seed-integrated-qa.py:ro" \
    backend-migrate python manage.py shell -c \
    'exec(compile(open("/tmp/seed-integrated-qa.py", encoding="utf-8").read(), "/tmp/seed-integrated-qa.py", "exec"))'
)"
fixture_json="$(printf '%s\n' "${fixture_output}" | tail -n 1)"
original_path="$(printf '%s\n' "${fixture_json}" | sed -n 's/.*"original": "\([^"]*\)".*/\1/p')"
staff_device="$(printf '%s\n' "${fixture_json}" | sed -n 's/.*"staff_device": "\([^"]*\)".*/\1/p')"
nonstaff_device="$(printf '%s\n' "${fixture_json}" | sed -n 's/.*"nonstaff_device": "\([^"]*\)".*/\1/p')"
[[ "${original_path}" == events/originals/* ]] || fail "synthetic original path is invalid"
[[ -n "${staff_device}" && -n "${nonstaff_device}" ]] || fail "synthetic TOTP devices are missing"

echo "Checking container identities, restrictions, topology, and production image contents..."
for service in gateway web backend db; do
  container_id="$("${source_compose[@]}" ps --quiet "${service}")"
  [[ -n "${container_id}" ]] || fail "${service} is not running"
  [[ "$(docker inspect --format '{{.State.Health.Status}}' "${container_id}")" == "healthy" ]] || \
    fail "${service} is not healthy"
done
for service in gateway web backend; do
  [[ "$("${source_compose[@]}" exec --no-TTY "${service}" id -u)" != "0" ]] || \
    fail "${service} is running as root"
done
database_processes="$("${source_compose[@]}" exec --no-TTY db ps -o user=,comm=)"
printf '%s\n' "${database_processes}" | awk '
  $2 == "postgres" {
    found = 1
    if ($1 != "postgres") {
      invalid_owner = 1
      printf "PostgreSQL server process is owned by %s, expected postgres\n", $1 > "/dev/stderr"
    }
  }
  END { exit !found || invalid_owner }
' || fail "PostgreSQL server process ownership check failed"
for service in gateway web backend; do
  container_id="$("${source_compose[@]}" ps --quiet "${service}")"
  [[ "$(docker inspect --format '{{.HostConfig.ReadonlyRootfs}}' "${container_id}")" == "true" ]] || \
    fail "${service} root filesystem is writable"
  cap_drop="$(docker inspect --format '{{json .HostConfig.CapDrop}}' "${container_id}")"
  [[ "${cap_drop}" == *"ALL"* ]] || fail "${service} has not dropped all capabilities"
done

source_binding="$("${source_compose[@]}" port gateway 8080)"
[[ "${source_binding}" == 127.0.0.1:* ]] || fail "source gateway is not loopback-bound"
for service in web backend db; do
  container_id="$("${source_compose[@]}" ps --quiet "${service}")"
  bindings="$(docker inspect --format '{{json .HostConfig.PortBindings}}' "${container_id}")"
  [[ "${bindings}" == "null" || "${bindings}" == "{}" ]] || fail "${service} is host-exposed"
done

"${source_compose[@]}" run --rm --no-deps --entrypoint sh web -eu -c '
  test "$(id -u)" != 0
  test ! -e /app/src
  test ! -e /app/tests
  test ! -e /app/.git
  test ! -e /app/BrandBook_FREKUENCE_Compressed.pdf
  test -z "$(find /app -type f \( -name "*.map" -o -name ".env" -o -name ".env.*" -o -name "*.pdf" \) -print -quit)"
  ! grep -R -F "visual-fixture-featured-field" /app/dist >/dev/null 2>&1
'
"${source_compose[@]}" run --rm --no-deps --entrypoint sh backend -eu -c '
  test "$(id -u)" != 0
  test ! -e /app/tests
  test ! -e /app/events/management/commands/seed_dev_data.py
  test ! -e /app/.git
  test -z "$(find /app -type f \( -name "*.map" -o -name ".env" -o -name ".env.*" -o -name "*.pdf" \) -print -quit)"
  ! grep -R -F "$DJANGO_SECRET_KEY" /app /venv >/dev/null 2>&1
  ! grep -R -F "$POSTGRES_PASSWORD" /app /venv >/dev/null 2>&1
'

run_gateway_verifier() {
  local mode="$1"
  local compose_name="$2"
  shift 2
  local -a compose_command=("$@")
  "${compose_command[@]}" exec --no-TTY \
    --env "INTEGRATED_QA_MODE=${mode}" \
    --env "INTEGRATED_QA_BASE_URL=http://gateway:8080" \
    --env "INTEGRATED_QA_ORIGINAL_URL=/media/${original_path}" \
    --env "INTEGRATED_QA_STAFF_USERNAME=${staff_username}" \
    --env "INTEGRATED_QA_STAFF_PASSWORD=${staff_password}" \
    --env "INTEGRATED_QA_STAFF_DEVICE=${staff_device}" \
    --env "INTEGRATED_QA_NONSTAFF_USERNAME=${nonstaff_username}" \
    --env "INTEGRATED_QA_NONSTAFF_PASSWORD=${nonstaff_password}" \
    --env "INTEGRATED_QA_NONSTAFF_DEVICE=${nonstaff_device}" \
    --env "INTEGRATED_QA_TOTP_KEY=${totp_key}" \
    web node --input-type=module < "${repository_root}/scripts/verify-integrated-gateway.mjs"
  echo "${compose_name} gateway verification completed."
}

echo "Running the complete integrated route, event, metadata, API, and security matrix..."
run_gateway_verifier source "${source_project}" "${source_compose[@]}"

echo "Creating a matched database/media backup in the private disposable directory..."
"${source_compose[@]}" exec --no-TTY db \
  pg_dump --username="${POSTGRES_USER}" --dbname="${POSTGRES_DB}" --format=custom \
  > "${backup_directory}/frekuence.dump"
"${source_compose[@]}" --profile tools run --rm --no-deps --no-TTY backend-migrate \
  tar -C /vol/media -czf - . > "${backup_directory}/frekuence-media.tar.gz"
[[ -s "${backup_directory}/frekuence.dump" ]] || fail "database backup is empty"
[[ -s "${backup_directory}/frekuence-media.tar.gz" ]] || fail "media backup is empty"
sha256sum "${backup_directory}/frekuence.dump" "${backup_directory}/frekuence-media.tar.gz"

echo "Restoring into a different disposable Compose project and isolated volumes..."
"${restore_compose[@]}" config --quiet
"${restore_compose[@]}" up --detach --wait db
"${restore_compose[@]}" exec --no-TTY db \
  pg_restore --clean --if-exists --no-owner --username="${POSTGRES_USER}" \
  --dbname="${POSTGRES_DB}" < "${backup_directory}/frekuence.dump"
"${restore_compose[@]}" --profile tools run --rm --no-deps --no-TTY backend-migrate \
  tar -C /vol/media -xzf - < "${backup_directory}/frekuence-media.tar.gz"
"${restore_compose[@]}" --profile tools run --rm backend-migrate python manage.py migrate --check
"${restore_compose[@]}" --profile tools run --rm backend-static
"${restore_compose[@]}" up --detach --no-build --wait backend web gateway

restore_binding="$("${restore_compose[@]}" port gateway 8080)"
[[ "${restore_binding}" == 127.0.0.1:* && "${restore_binding}" != "${source_binding}" ]] || \
  fail "restore gateway did not receive a separate random loopback port"

source_database_volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$("${source_compose[@]}" ps --quiet db)")"
restore_database_volume="$(docker inspect --format '{{range .Mounts}}{{if eq .Destination "/var/lib/postgresql/data"}}{{.Name}}{{end}}{{end}}' "$("${restore_compose[@]}" ps --quiet db)")"
[[ -n "${source_database_volume}" && -n "${restore_database_volume}" ]] || fail "database volumes are missing"
[[ "${source_database_volume}" != "${restore_database_volume}" ]] || fail "restore reused the source database volume"

for service in gateway web backend; do
  source_image="$(docker inspect --format '{{.Config.Image}}' "$("${source_compose[@]}" ps --quiet "${service}")")"
  restore_image="$(docker inspect --format '{{.Config.Image}}' "$("${restore_compose[@]}" ps --quiet "${service}")")"
  [[ "${source_image}" == "${restore_image}" ]] || fail "${service} restore image tag differs"
done

restored_count="$("${restore_compose[@]}" exec --no-TTY backend python manage.py shell -c 'from events.models import Event; print(Event.objects.count())' | tail -n 1)"
[[ "${restored_count}" == "8" ]] || fail "restored event count is ${restored_count}, expected 8"
restored_original_path="$("${restore_compose[@]}" exec --no-TTY backend python manage.py shell -c 'from events.models import Event; print(Event.objects.get(slug="checkpoint8-current-postponed").poster.name)' | tail -n 1)"
[[ "${restored_original_path}" == "${original_path}" ]] || fail "restored original metadata differs"
staff_device="$("${restore_compose[@]}" exec --no-TTY backend python manage.py shell -c 'from django_otp.plugins.otp_totp.models import TOTPDevice; print(TOTPDevice.objects.get(user__username="checkpoint8-qa-editor").persistent_id)' | tail -n 1)"
nonstaff_device="$("${restore_compose[@]}" exec --no-TTY backend python manage.py shell -c 'from django_otp.plugins.otp_totp.models import TOTPDevice; print(TOTPDevice.objects.get(user__username="checkpoint8-qa-nonstaff").persistent_id)' | tail -n 1)"

run_gateway_verifier restore "${restore_project}" "${restore_compose[@]}"

for compose_reference in source_compose restore_compose; do
  declare -n active_compose="${compose_reference}"
  for service in gateway web backend db; do
    container_id="$("${active_compose[@]}" ps --quiet "${service}")"
    [[ "$(docker inspect --format '{{.State.Health.Status}}' "${container_id}")" == "healthy" ]] || \
      fail "${compose_reference} ${service} is not healthy"
  done
done

echo "Checkpoint 8 integrated QA and isolated backup/restore smoke passed."
