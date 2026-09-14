import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  MAX_WORKSPACE_JSON_BYTES,
  parseAndValidateWorkspaceJson,
  validateWorkspaceData
} from '../src/scripts/core/workspace-validator.ts';
import {
  APP_STORAGE_KEYS,
  MAX_STORAGE_VALUE_LENGTH,
  createSafeStorage,
  clearAppStorage
} from '../src/scripts/core/safe-storage.ts';
import {
  MAX_SHARED_CITY_COUNT,
  parseBoundedInteger,
  parseSharedCityNames
} from '../src/scripts/core/url-input.ts';
import { MAX_CITY_SEARCH_LENGTH, searchCities } from '../src/scripts/city-db.ts';
import {
  escapeIcsText,
  generateIcsContent
} from '../src/scripts/time-utils.ts';
import {
  isSafeCalendarFilename,
  sanitizeCalendarFilename
} from '../src/scripts/core/calendar-filename.ts';
import { isAllowedExternalCalendarUrl } from '../src/scripts/core/external-url.ts';

const repoRoot = path.resolve(import.meta.dirname, '..');
const readRepoFile = (relativePath: string) =>
  fs.readFileSync(path.join(repoRoot, relativePath), 'utf8');

describe('Phase 3C security and privacy hardening', () => {
  it('rejects oversized workspace JSON before parsing', () => {
    const oversized = ' '.repeat(MAX_WORKSPACE_JSON_BYTES + 1);
    const result = parseAndValidateWorkspaceJson(oversized);

    assert.strictEqual(result.success, false);
    assert.match(result.error ?? '', /maximum size/i);
  });

  it('rejects control characters in imported workspace names and IDs', () => {
    const controlName = validateWorkspaceData([{
      id: 'ws-safe\n-id',
      name: 'Team\r\nInjected',
      cities: [{ id: 'lon', name: 'London', timezone: 'Europe/London' }]
    }]);

    assert.strictEqual(controlName.success, false);
    assert.match(controlName.error ?? '', /control|invalid/i);
  });

  it('keeps storage values bounded and clears only RealTimeZones keys', () => {
    const values = new Map<string, string>([
      ['workspace', '{"safe":true}'],
      ['unrelated-app-data', 'must remain'],
      ['rtz-setting-autostart', 'true']
    ]);
    const rawStorage = {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); }
    };
    const storage = createSafeStorage(rawStorage);

    assert.strictEqual(storage.setItem('workspace', 'x'.repeat(MAX_STORAGE_VALUE_LENGTH + 1)), false);
    assert.strictEqual(storage.getItem('workspace'), '{"safe":true}');
    clearAppStorage(storage);

    for (const key of APP_STORAGE_KEYS) {
      assert.strictEqual(values.has(key), false, `app key should be cleared: ${key}`);
    }
    assert.strictEqual(values.get('unrelated-app-data'), 'must remain');
  });

  it('ignores malformed, oversized, and excessive shared-city URL input', () => {
    assert.deepStrictEqual(parseSharedCityNames('London,%E0%A4%A'), ['London']);
    assert.deepStrictEqual(parseSharedCityNames('London%20City,Tokyo'), ['London City', 'Tokyo']);
    assert.deepStrictEqual(
      parseSharedCityNames(Array.from({ length: MAX_SHARED_CITY_COUNT + 1 }, () => 'London').join(',')),
      []
    );
    assert.deepStrictEqual(parseSharedCityNames('A'.repeat(4097)), []);
    assert.strictEqual(parseBoundedInteger('12abc', 0, 23), null);
    assert.strictEqual(parseBoundedInteger('23', 0, 23), 23);
  });

  it('bounds the client-side city search surface', () => {
    assert.deepStrictEqual(searchCities('x'.repeat(MAX_CITY_SEARCH_LENGTH + 1)), []);
    assert.ok(searchCities('London').length > 0);
  });

  it('escapes ICS text without allowing line/property injection', () => {
    assert.strictEqual(
      escapeIcsText('Title\\part,one;two\r\nX-ATTACK: yes'),
      'Title\\\\part\\,one\\;two\\nX-ATTACK: yes'
    );

    const content = generateIcsContent({
      title: 'Title\r\nX-Injected: yes',
      startDate: new Date('2026-07-16T10:00:00.000Z'),
      durationMinutes: 60,
      description: 'a\\b,c;d\nnext'
    });

    assert.match(content, /SUMMARY:Title\\nX-Injected: yes/);
    assert.match(content, /DESCRIPTION:a\\\\b\\,c\\;d\\nnext/);
    assert.strictEqual(content.includes('SUMMARY:Title\r\nX-Injected'), false);
  });

  it('sanitizes filenames against traversal, device names, and shell metacharacters', () => {
    for (const filename of [
      '../escape.ics',
      'meeting|&.ics',
      'CON.ics',
      'meeting.ics\nattack'
    ]) {
      assert.strictEqual(isSafeCalendarFilename(filename), false, filename);
      assert.strictEqual(isSafeCalendarFilename(sanitizeCalendarFilename(filename)), true);
    }
    assert.strictEqual(isSafeCalendarFilename('team-sync.ics'), true);
  });

  it('allows only the intended HTTPS calendar providers', () => {
    assert.strictEqual(
      isAllowedExternalCalendarUrl('https://calendar.google.com/calendar/render?action=TEMPLATE'),
      true
    );
    assert.strictEqual(
      isAllowedExternalCalendarUrl('https://outlook.live.com/calendar/0/deeplink/compose?subject=Sync'),
      true
    );
    for (const url of [
      'javascript:alert(1)',
      'https://attacker.example/calendar/render',
      'http://calendar.google.com/calendar/render',
      'https://calendar.google.com.evil.example/calendar/render',
      'https://user:pass@calendar.google.com/calendar/render'
    ]) {
      assert.strictEqual(isAllowedExternalCalendarUrl(url), false, url);
    }
  });


  it('ships strict privacy/security boundaries and no unsolicited Google tracking', () => {
    const layout = readRepoFile('src/layouts/Layout.astro');
    const homePage = readRepoFile('src/pages/index.astro');
    const app = readRepoFile('src/scripts/app.ts');
    const headers = readRepoFile('public/_headers');
    const serviceWorker = readRepoFile('public/sw.js');
    const native = readRepoFile('src-tauri/src/lib.rs');
    const capability = readRepoFile('src-tauri/capabilities/default.json');
    const chronos = readRepoFile('src/scripts/chronos-interactions.ts');

    assert.doesNotMatch(layout, /googletagmanager|G-815BVENSYJ|fonts\.googleapis|fonts\.gstatic/i);
    assert.doesNotMatch(layout, /<script\s+is:inline\s+async/i);
    assert.match(layout, /theme-init\.js/);
    assert.match(layout, /register-sw\.js/);
    assert.doesNotMatch(homePage, /Quick footer helper trigger bindings/);
    assert.match(app, /trigger-keyboard-help-footer/);

    for (const header of [
      'Content-Security-Policy:',
      'X-Content-Type-Options: nosniff',
      'Referrer-Policy:',
      'Permissions-Policy:',
      'X-Frame-Options: DENY',
      'Cross-Origin-Opener-Policy: same-origin',
      'Cache-Control: public, max-age=0, must-revalidate, no-transform'
    ]) {
      assert.match(headers, new RegExp(header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
    }
    assert.doesNotMatch(serviceWorker, /fonts\.googleapis|fonts\.gstatic/i);
    assert.match(serviceWorker, /url\.search/);
    assert.match(serviceWorker, /response\.type\s*===\s*['"]basic['"]/);

    assert.match(chronos, /MAX_WORKSPACE_JSON_BYTES/);
    assert.match(chronos, /file\.size/);
    assert.match(chronos, /escapeIcsText/);
    assert.match(native, /validate_ics_content/);
    assert.match(native, /explorer\.exe/);
    assert.doesNotMatch(native, /Command::new\("cmd"\)/);
    assert.match(capability, /opener:allow-open-url/);
    assert.doesNotMatch(capability, /opener:default/);
  });
});
