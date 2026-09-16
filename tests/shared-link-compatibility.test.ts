import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  PLANNER_QUERY_PARAMS,
  hasPlannerParams,
  buildPlannerUrl,
  getPlannerCompatibilityRedirect
} from '../src/scripts/core/route-compatibility.ts';
import { parseSharedCityNames, parseBoundedInteger } from '../src/scripts/core/url-input.ts';
import { parseDateParamWithFallback } from '../src/scripts/time-utils.ts';

describe('Shared Link & Route Compatibility — Phase 1', () => {
  it('identifies recognized planner query parameters', () => {
    assert.deepStrictEqual([...PLANNER_QUERY_PARAMS], [
      'cities',
      'focus',
      'date',
      'duration',
      'format'
    ]);
  });

  it('detects planner parameters in query strings and full URLs', () => {
    assert.strictEqual(hasPlannerParams('?cities=London'), true);
    assert.strictEqual(hasPlannerParams('?focus=12'), true);
    assert.strictEqual(hasPlannerParams('?date=2026-09-15'), true);
    assert.strictEqual(hasPlannerParams('?duration=60'), true);
    assert.strictEqual(hasPlannerParams('?format=24h'), true);
    assert.strictEqual(hasPlannerParams('https://realtimezones.com/?cities=London%2CTokyo'), true);
    assert.strictEqual(hasPlannerParams('?unrelated=123'), false);
    assert.strictEqual(hasPlannerParams(''), false);
  });

  it('preserves query strings literally when building /planner destination', () => {
    const rawQuery = '?cities=London%2CTokyo&focus=14&date=2026-09-15&duration=60&format=24h';
    const result = buildPlannerUrl(`/${rawQuery}`);
    assert.strictEqual(result, `/planner${rawQuery}`);

    const fullUrl = `https://realtimezones.com/${rawQuery}`;
    const fullResult = buildPlannerUrl(fullUrl);
    assert.strictEqual(fullResult, `https://realtimezones.com/planner${rawQuery}`);
  });

  it('does not silently normalize or corrupt encoded city names', () => {
    // City names with percent encoding, commas, and unicode accents
    const specialQuery = '?cities=New%20York%2CS%C3%A3o%20Paulo%2CTokyo';
    const redirected = buildPlannerUrl(`/${specialQuery}`);
    
    assert.strictEqual(redirected, `/planner${specialQuery}`);
    
    // Validate decoding matches intended names
    const url = new URL(`https://realtimezones.com${redirected}`);
    const decodedCities = parseSharedCityNames(url.searchParams.get('cities'));
    assert.deepStrictEqual(decodedCities, ['New York', 'São Paulo', 'Tokyo']);
  });

  it('preserves unknown query parameters without destructive removal', () => {
    const queryWithExtras = '?cities=London%2CTokyo&utm_source=newsletter&utm_medium=email&custom_ref=abc123';
    const result = buildPlannerUrl(`/${queryWithExtras}`);
    
    assert.strictEqual(result, `/planner${queryWithExtras}`);
    assert.ok(result.includes('utm_source=newsletter'));
    assert.ok(result.includes('utm_medium=email'));
    assert.ok(result.includes('custom_ref=abc123'));
  });

  it('provides safe compatibility redirect helper for root-level planner links', () => {
    // Root URL with planner params -> redirects to /planner
    const rootSearch = '?cities=London%2CTokyo&focus=14';
    assert.strictEqual(
      getPlannerCompatibilityRedirect('/', rootSearch),
      `/planner${rootSearch}`
    );

    // Planner URL already at /planner -> no redirect
    assert.strictEqual(
      getPlannerCompatibilityRedirect('/planner', rootSearch),
      null
    );

    // Root URL without planner params -> no redirect
    assert.strictEqual(
      getPlannerCompatibilityRedirect('/', '?unrelated=param'),
      null
    );
    assert.strictEqual(
      getPlannerCompatibilityRedirect('/', ''),
      null
    );

    // Desktop URL -> no redirect
    assert.strictEqual(
      getPlannerCompatibilityRedirect('/desktop', rootSearch),
      null
    );
  });

  it('correctly parses all 5 parameters from both root and /planner shared URLs', () => {
    const urls = [
      'https://realtimezones.com/?cities=London%2CTokyo&focus=14&date=2026-09-15&duration=60&format=24h',
      'https://realtimezones.com/planner?cities=London%2CTokyo&focus=14&date=2026-09-15&duration=60&format=24h'
    ];

    for (const urlStr of urls) {
      const parsed = new URL(urlStr);
      const cities = parseSharedCityNames(parsed.searchParams.get('cities'));
      const focus = parseBoundedInteger(parsed.searchParams.get('focus'), 0, 23);
      const dateParts = parseDateParamWithFallback(parsed.searchParams.get('date'), 'UTC');
      const duration = parseBoundedInteger(parsed.searchParams.get('duration'), 15, 1440);
      const format = parsed.searchParams.get('format');

      assert.deepStrictEqual(cities, ['London', 'Tokyo']);
      assert.strictEqual(focus, 14);
      assert.deepStrictEqual(dateParts, { year: 2026, month: 9, day: 15 });
      assert.strictEqual(duration, 60);
      assert.strictEqual(format, '24h');
    }
  });
});
