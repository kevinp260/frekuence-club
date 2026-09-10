import { spawn } from 'node:child_process';
import { get } from 'node:http';
import { join } from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

const root = process.cwd();
const host = '127.0.0.1';
const port = Number(process.env.LIGHTHOUSE_PORT || 4324);
const apiPort = Number(process.env.LIGHTHOUSE_API_PORT || 4314);
const origin = `http://${host}:${port}`;
const chromePath = process.env.CHROME_PATH || '/usr/bin/google-chrome';
const reportPath =
  process.env.LIGHTHOUSE_REPORT_PATH ||
  (process.env.FREKUENCE_LIGHTHOUSE_FIXTURES === 'true'
    ? './lighthouse-fixtures-report.json'
    : './lighthouse-report.json');
const scenario = process.env.FREKUENCE_LIGHTHOUSE_FIXTURES === 'true' ? 'events' : 'empty';

function run(command, argumentsList, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, argumentsList, { stdio: 'inherit', ...options });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolve();
      else reject(new Error(`${command} exited with ${code ?? signal}.`));
    });
  });
}

async function waitFor(url, processName, child) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) {
      throw new Error(`${processName} exited with ${child.exitCode} before becoming ready.`);
    }
    const ready = await new Promise((resolve) => {
      const request = get(url, (response) => {
        response.resume();
        resolve(response.statusCode === 200);
      });
      request.once('error', () => resolve(false));
    });
    if (ready) return;
    await delay(200);
  }
  throw new Error(`${processName} did not become ready at ${url}.`);
}

const api = spawn(process.execPath, [join(root, 'scripts/mock-events-api.mjs')], {
  stdio: 'inherit',
  env: { ...process.env, MOCK_API_PORT: String(apiPort), MOCK_API_SCENARIO: scenario },
});
const server = spawn(process.execPath, [join(root, 'dist/server/entry.mjs')], {
  stdio: 'inherit',
  env: {
    ...process.env,
    FREKUENCE_EVENT_API_ORIGIN: `http://${host}:${apiPort}`,
    HOST: host,
    PORT: String(port),
  },
});

try {
  await waitFor(`http://${host}:${apiPort}/healthz/`, 'Mock events API', api);
  await waitFor(`${origin}/`, 'Astro preview', server);
  await run(process.execPath, [
    join(root, 'node_modules/lighthouse/cli/index.js'),
    `${origin}/`,
    `--chrome-path=${chromePath}`,
    '--output=json',
    `--output-path=${reportPath}`,
    '--only-categories=performance,accessibility,best-practices,seo',
    '--quiet',
  ]);
  await run(process.execPath, [join(root, 'scripts/validate-lighthouse.mjs')], {
    env: { ...process.env, LIGHTHOUSE_REPORT_PATH: reportPath },
  });
} finally {
  if (server.exitCode === null) server.kill('SIGTERM');
  if (api.exitCode === null) api.kill('SIGTERM');
}
