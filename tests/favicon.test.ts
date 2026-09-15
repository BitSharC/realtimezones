import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layoutSource = readFileSync(resolve(process.cwd(), 'src/layouts/Layout.astro'), 'utf8');
const faviconBytes = readFileSync(resolve(process.cwd(), 'public/favicon.ico'));

function parseAttributes(tag: string): Record<string, string> {
  return Object.fromEntries(
    [...tag.matchAll(/([\w:-]+)="([^"]*)"/g)].map(([, name, value]) => [name, value])
  );
}

describe('Global favicon configuration', () => {
  it('uses only the branded ICO favicon for browser tabs across the shared layout', () => {
    const tabIconLinks = (layoutSource.match(/<link\b[^>]*>/g) ?? [])
      .map(parseAttributes)
      .filter(({ rel }) => rel === 'icon' || rel === 'shortcut icon');

    assert.deepStrictEqual(tabIconLinks, [{
      rel: 'icon',
      type: 'image/x-icon',
      href: '/favicon.ico'
    }]);
    assert.doesNotMatch(layoutSource, /rel="icon"[^>]+favicon\.svg/);
    assert.doesNotMatch(layoutSource, /rel="icon"[^>]+favicon-96x96\.png/);
  });

  it('keeps the referenced branded favicon as a valid multi-image ICO resource', () => {
    assert.deepStrictEqual([...faviconBytes.subarray(0, 4)], [0, 0, 1, 0]);
    assert.strictEqual(faviconBytes.readUInt16LE(4), 3);
  });
});
