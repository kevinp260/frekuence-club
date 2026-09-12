import assert from 'node:assert/strict';
import { test } from 'node:test';

import { translations } from '../../src/data/i18n.ts';
import { pageKeys, routes } from '../../src/data/routes.ts';

function leafPaths(value, prefix = '') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => leafPaths(item, `${prefix}[${index}]`));
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).flatMap(([key, child]) =>
      leafPaths(child, prefix ? `${prefix}.${key}` : key),
    );
  }

  return [prefix];
}

test('Albanian and English dictionaries have identical leaf keys', () => {
  assert.deepEqual(leafPaths(translations.sq).sort(), leafPaths(translations.en).sort());
});

test('every indexable page has reciprocal localized routes', () => {
  assert.deepEqual(Object.keys(routes).sort(), [...pageKeys].sort());

  for (const page of pageKeys) {
    assert.match(routes[page].sq, /^\/(?:[a-z-]+\/)?$/);
    assert.match(routes[page].en, /^\/en\/(?:[a-z-]+\/)?$/);
    assert.notEqual(routes[page].sq, routes[page].en);
  }
});

test('localized SEO metadata is unique and bounded', () => {
  for (const locale of ['sq', 'en']) {
    const metadata = Object.values(translations[locale].seo);
    const titles = metadata.map(({ title }) => title);
    const descriptions = metadata.map(({ description }) => description);

    assert.equal(new Set(titles).size, pageKeys.length);
    assert.equal(new Set(descriptions).size, pageKeys.length);

    for (const { title, description } of metadata) {
      assert.ok(title.length >= 20 && title.length <= 70, `Unexpected title length: ${title}`);
      assert.ok(
        description.length >= 70 && description.length <= 170,
        `Unexpected description length: ${description}`,
      );
    }
  }
});
