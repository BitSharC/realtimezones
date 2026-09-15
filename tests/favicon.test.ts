import { describe, it } from 'node:test';
import assert from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const layoutSource = readFileSync(resolve(process.cwd(), 'src/layouts/Layout.astro'), 'utf8');
const faviconBytes = readFileSync(resolve(process.cwd(), 'public/favicon.ico'));
const headerSource = readFileSync(resolve(process.cwd(), 'src/components/Header.astro'), 'utf8');
const workspaceSource = readFileSync(resolve(process.cwd(), 'src/components/desktop/ChronosWorkspace.astro'), 'utf8');
const menuBarSource = readFileSync(resolve(process.cwd(), 'src/components/desktop/ChronosMenuBar.astro'), 'utf8');

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

  it('uses the static favicon for every RealTimeZones brand emblem', () => {
    const brandSources = [headerSource, workspaceSource, menuBarSource];
    const faviconEmblems = brandSources.flatMap(
      source => source.match(/<img\b[^>]*data-brand-favicon[^>]*>/g) ?? []
    );

    assert.strictEqual(faviconEmblems.length, 5);
    faviconEmblems.forEach(emblem => assert.match(emblem, /src="\/favicon\.ico"/));

    const combinedBrandSource = brandSources.join('\n');
    assert.doesNotMatch(combinedBrandSource, /group-hover:rotate-\[360deg\]/);
    assert.doesNotMatch(combinedBrandSource, /animate-intro-(?:circle|hands)/);
    assert.doesNotMatch(combinedBrandSource, /@keyframes intro(?:CircleDraw|HandsSweep)/);
  });
});
