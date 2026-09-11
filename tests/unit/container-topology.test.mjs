import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const [compose, gatewayConfig, hostConfig, gatewayDockerfile, deployment] = await Promise.all([
  readFile(new URL('../../compose.yaml', import.meta.url), 'utf8'),
  readFile(new URL('../../deploy/nginx/container.conf', import.meta.url), 'utf8'),
  readFile(new URL('../../deploy/nginx/frekuence.club.conf.example', import.meta.url), 'utf8'),
  readFile(new URL('../../Dockerfile.gateway', import.meta.url), 'utf8'),
  readFile(new URL('../../docs/DEPLOYMENT.md', import.meta.url), 'utf8'),
]);

function serviceBlock(name) {
  const match = compose.match(
    new RegExp(`^  ${name}:\\n([\\s\\S]*?)(?=^  [a-z][a-z-]*:|^volumes:|^networks:)`, 'm'),
  );
  assert.ok(match, `missing ${name} service`);
  return match[1];
}

function locationBlock(pathPattern) {
  const match = gatewayConfig.match(
    new RegExp(`location \\^~ ${pathPattern} \\{([\\s\\S]*?)^    \\}`, 'm'),
  );
  assert.ok(match, `missing ${pathPattern} location`);
  return match[1];
}

function documentationSection(heading, nextHeading) {
  const start = deployment.indexOf(heading);
  const end = deployment.indexOf(nextHeading, start + heading.length);
  assert.notEqual(start, -1, `missing ${heading}`);
  assert.notEqual(end, -1, `missing ${nextHeading}`);
  return deployment.slice(start, end);
}

test('only the unprivileged pinned gateway publishes a loopback port', () => {
  const gateway = serviceBlock('gateway');
  assert.match(gateway, /'127\.0\.0\.1:\$\{FREKUENCE_GATEWAY_PORT:-3010\}:8080'/);
  for (const service of ['web', 'backend', 'db']) {
    assert.doesNotMatch(serviceBlock(service), /^ {4}ports:/m);
  }
  assert.equal((compose.match(/^ {4}ports:/gm) ?? []).length, 1);
  assert.match(
    gatewayDockerfile,
    /^FROM nginxinc\/nginx-unprivileged:[^\s]+@sha256:[a-f0-9]{64}$/m,
  );
  assert.match(gatewayDockerfile, /^USER 101:101$/m);
});

test('application and database networks keep the gateway away from PostgreSQL', () => {
  assert.match(serviceBlock('gateway'), /networks:\n {6}- application/);
  assert.doesNotMatch(serviceBlock('gateway'), /- database/);
  assert.match(serviceBlock('web'), /networks:\n {6}- application/);
  assert.match(serviceBlock('backend'), /networks:\n {6}- application\n {6}- database/);
  assert.match(serviceBlock('db'), /networks:\n {6}- database/);
  assert.match(compose, /^ {2}database:\n {4}internal: true$/m);
});

test('gateway owns routing and limits without replacing the Astro CSP', () => {
  assert.match(gatewayConfig, /location \^~ \/api\//);
  assert.match(gatewayConfig, /location \^~ \/staff\//);
  assert.match(gatewayConfig, /location \^~ \/static\//);
  assert.match(gatewayConfig, /location \^~ \/media\/events\/derivatives\//);
  assert.match(gatewayConfig, /location \^~ \/media\/ \{\n {8}return 404;/);
  assert.match(gatewayConfig, /client_max_body_size 16m/);
  assert.match(gatewayConfig, /proxy_set_header X-Forwarded-Proto \$frekuence_original_scheme/);
  assert.match(gatewayConfig, /default \$remote_addr;/);
  assert.match(gatewayConfig, /proxy_set_header X-Forwarded-For \$frekuence_client_address/);
  assert.doesNotMatch(gatewayConfig, /proxy_add_x_forwarded_for/);
  assert.doesNotMatch(gatewayConfig, /add_header Content-Security-Policy/i);

  for (const pathPattern of ['/staff/', '/_astro/']) {
    const location = locationBlock(pathPattern);
    for (const header of [
      'X-Frame-Options',
      'X-Content-Type-Options',
      'Referrer-Policy',
      'Permissions-Policy',
      'Cross-Origin-Opener-Policy',
      'Strict-Transport-Security',
    ]) {
      assert.match(location, new RegExp(`proxy_hide_header ${header};`));
    }
  }
});

test('host Nginx overwrites forwarded headers and passes application CSP through', () => {
  assert.match(hostConfig, /proxy_pass http:\/\/127\.0\.0\.1:3010/);
  assert.match(hostConfig, /proxy_set_header X-Forwarded-For \$remote_addr/);
  assert.match(hostConfig, /proxy_set_header X-Forwarded-Proto \$scheme/);
  assert.match(hostConfig, /client_max_body_size 16m/);
  assert.doesNotMatch(hostConfig, /add_header Content-Security-Policy/i);
});

test('migration and static collection remain explicit profile jobs', () => {
  assert.match(serviceBlock('backend-migrate'), /profiles: \['tools'\]/);
  assert.match(serviceBlock('backend-migrate'), /manage\.py', 'migrate'/);
  assert.match(serviceBlock('backend-static'), /profiles: \['tools'\]/);
  assert.match(serviceBlock('backend-static'), /manage\.py', 'collectstatic'/);
  for (const service of ['gateway', 'web', 'backend']) {
    assert.doesNotMatch(serviceBlock(service), /manage\.py.*(?:migrate|collectstatic)/);
  }
});

test('deployment commands keep one immutable release tag set in scope', () => {
  const section = documentationSection(
    '## Production deployment order',
    '## Gateway routes, limits, and headers',
  );
  for (const variable of ['FREKUENCE_GATEWAY_TAG', 'FREKUENCE_WEB_TAG', 'FREKUENCE_BACKEND_TAG']) {
    assert.match(section, new RegExp(`export ${variable}=`));
  }
  assert.match(serviceBlock('gateway'), /image: frekuence-gateway:\$\{FREKUENCE_GATEWAY_TAG/);
  assert.match(serviceBlock('web'), /image: frekuence-website:\$\{FREKUENCE_WEB_TAG/);
  for (const service of ['backend', 'backend-migrate', 'backend-static']) {
    assert.match(serviceBlock(service), /image: frekuence-backend:\$\{FREKUENCE_BACKEND_TAG/);
  }
});

test('restore commands retain isolated project, random port, and compatible tags', () => {
  const section = documentationSection('## Matched backup and isolated restoration', '## Rollback');
  assert.match(section, /export COMPOSE_PROJECT_NAME=frekuence-restore-check/);
  assert.match(section, /export FREKUENCE_GATEWAY_PORT=0/);
  for (const variable of ['FREKUENCE_GATEWAY_TAG', 'FREKUENCE_WEB_TAG', 'FREKUENCE_BACKEND_TAG']) {
    assert.match(section, new RegExp(`export ${variable}=COMPATIBLE_`));
  }
  const collectStatic = section.indexOf('docker compose --profile tools run --rm backend-static');
  const restoredStartup = section.indexOf(
    'docker compose up -d --no-build --wait backend web gateway',
  );
  assert.notEqual(collectStatic, -1, 'restore does not collect static files');
  assert.notEqual(restoredStartup, -1, 'restore does not start the application stack');
  assert.ok(collectStatic < restoredStartup, 'restore starts gateway before collecting static');
  assert.doesNotMatch(section, /^COMPOSE_PROJECT_NAME=.*docker compose/gm);
});
