import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const report = JSON.parse(
  await readFile(process.env.LIGHTHOUSE_REPORT_PATH || 'lighthouse-report.json', 'utf8'),
);
const scores = Object.fromEntries(
  Object.entries(report.categories).map(([key, value]) => [key, Math.round(value.score * 100)]),
);
const metrics = {
  cls: report.audits['cumulative-layout-shift'].numericValue,
  lcp: report.audits['largest-contentful-paint'].numericValue,
};

assert.ok(scores.performance >= 90, `Performance score ${scores.performance} is below 90.`);
assert.ok(scores.accessibility >= 95, `Accessibility score ${scores.accessibility} is below 95.`);
assert.ok(
  scores['best-practices'] >= 95,
  `Best Practices score ${scores['best-practices']} is below 95.`,
);
assert.ok(scores.seo >= 95, `SEO score ${scores.seo} is below 95.`);
assert.ok(metrics.lcp < 2500, `LCP ${Math.round(metrics.lcp)} ms is not below 2500 ms.`);
assert.ok(metrics.cls < 0.1, `CLS ${metrics.cls} is not below 0.1.`);

console.log(
  `Lighthouse passed${process.env.LIGHTHOUSE_ROUTE ? ` for ${process.env.LIGHTHOUSE_ROUTE}` : ''}: performance ${scores.performance}, accessibility ${scores.accessibility}, best-practices ${scores['best-practices']}, SEO ${scores.seo}, LCP ${Math.round(metrics.lcp)} ms, CLS ${metrics.cls}.`,
);
