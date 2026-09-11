import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [packageJson, frontendPackageJson, smoke, verifier, fixture, lighthouse] = await Promise.all([
  readFile(new URL('../../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../../services/frontend/package.json', import.meta.url), 'utf8').then(
    JSON.parse,
  ),
  readFile(new URL('../../scripts/smoke-integrated-qa.sh', import.meta.url), 'utf8'),
  readFile(new URL('../../scripts/verify-integrated-gateway.mjs', import.meta.url), 'utf8'),
  readFile(new URL('../../scripts/seed-integrated-qa.py', import.meta.url), 'utf8'),
  readFile(new URL('../../services/frontend/scripts/run-lighthouse.mjs', import.meta.url), 'utf8'),
]);

test('root commands delegate to the independently locked frontend package', () => {
  assert.equal(packageJson.scripts.setup, 'npm ci --prefix services/frontend');
  for (const command of ['dev', 'build', 'check', 'test:e2e', 'test:visual', 'audit:lighthouse']) {
    assert.match(packageJson.scripts[command], /services\/frontend/);
  }
  assert.equal(packageJson.dependencies, undefined);
  assert.equal(packageJson.devDependencies, undefined);
  assert.equal(frontendPackageJson.name, '@frekuence/frontend');
  assert.equal(frontendPackageJson.dependencies.astro, '7.2.8');
});

test('integrated QA backup and restore stay in distinct disposable projects', () => {
  assert.match(smoke, /source_project="frekuence-checkpoint8-source-\$\{\$\}"/);
  assert.match(smoke, /restore_project="frekuence-checkpoint8-restore-\$\{\$\}"/);
  assert.match(smoke, /mktemp -d \/tmp\/frekuence-checkpoint8-backup\.XXXXXX/);
  assert.match(smoke, /export FREKUENCE_GATEWAY_PORT=0/);
  assert.match(smoke, /pg_dump[\s\S]+frekuence\.dump/);
  assert.match(smoke, /tar -C \/vol\/media -czf - \./);
  assert.match(smoke, /pg_restore --clean --if-exists --no-owner/);
  assert.match(smoke, /tar -C \/vol\/media -xzf -/);
  assert.match(smoke, /source_database_volume[\s\S]+restore_database_volume/);
  assert.match(smoke, /source_database_volume}" != "\$\{restore_database_volume/);
  assert.equal(packageJson.scripts['smoke:integrated-qa'], './scripts/smoke-integrated-qa.sh');
});

test('restored services start only after migration and static checks', () => {
  const restoreStart = smoke.indexOf(
    '"${restore_compose[@]}" up --detach --no-build --wait backend web gateway',
  );
  const migrationCheck = smoke.indexOf(
    '"${restore_compose[@]}" --profile tools run --rm backend-migrate python manage.py migrate --check',
  );
  const collectStatic = smoke.indexOf(
    '"${restore_compose[@]}" --profile tools run --rm backend-static',
  );
  assert.ok(migrationCheck > -1 && collectStatic > migrationCheck && restoreStart > collectStatic);
  assert.match(smoke, /source_image[\s\S]+restore_image/);
  assert.match(smoke, /source_image}" == "\$\{restore_image/);
});

test('integrated QA checks every PostgreSQL server process owner from parsed ps columns', () => {
  assert.match(smoke, /ps -o user=,comm=/);
  assert.match(smoke, /\$2 == "postgres"/);
  assert.match(smoke, /if \(\$1 != "postgres"\)/);
  assert.match(smoke, /END \{ exit !found \|\| invalid_owner \}/);
  assert.doesNotMatch(smoke, /postgres postgres/);
  assert.doesNotMatch(smoke, /root {2,}postgres/);
});

test('integrated fixtures and assertions cover the approved event and security matrix', () => {
  for (const slug of [
    'checkpoint8-current-postponed',
    'checkpoint8-earliest-upcoming',
    'checkpoint8-cancelled-notice',
    'checkpoint8-featured-upcoming',
    'checkpoint8-later-upcoming',
    'checkpoint8-past-event',
    'checkpoint8-draft-private',
    'checkpoint8-intentionally-unpublished',
  ]) {
    assert.match(fixture, new RegExp(slug));
    assert.match(verifier, new RegExp(slug));
  }
  assert.match(verifier, /Password-only staff login created a session/);
  assert.match(verifier, /Non-staff user reached the staff session boundary/);
  assert.match(verifier, /csrfmiddlewaretoken/);
  assert.match(verifier, /content-security-policy/);
  assert.match(verifier, /unsafe-inline/);
  assert.match(verifier, /If-None-Match/);
});

test('integrated Lighthouse audits both locales and a localized event detail', () => {
  const command = frontendPackageJson.scripts['audit:lighthouse:integrated'];
  assert.match(command, /LIGHTHOUSE_ROUTES=/);
  assert.match(command, /\/en\//);
  assert.match(command, /\/events\/visual-fixture-featured-field\//);
  assert.match(command, /\/en\/events\/visual-fixture-featured-field\//);
  assert.match(lighthouse, /same-origin absolute paths/);
  assert.match(lighthouse, /test-results\/lighthouse/);
});
