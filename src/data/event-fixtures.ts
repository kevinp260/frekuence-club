export const EVENT_FIXTURE_ENV = 'FREKUENCE_EVENT_FIXTURES';

export function eventFixturesEnabled(
  environment: Record<string, string | undefined> = process.env,
): boolean {
  return environment[EVENT_FIXTURE_ENV] === 'true';
}

export function eventContentPattern(fixturesEnabled = eventFixturesEnabled()): string {
  return fixturesEnabled ? '{events,event-fixtures}/**/*.{md,mdx}' : 'events/**/*.{md,mdx}';
}
