import { describe, it } from 'node:test';
import assert from 'node:assert';
import { type DateParts } from '../src/scripts/core/date-only.ts';
import {
  getTimezoneOffsetMinutes,
  getRelativeOffsetHours,
  formatOffset,
  formatUtcOffset,
  isValidIanaTimezone,
  getLocalTimeForDateParts
} from '../src/scripts/core/timezone-engine.ts';
import {
  getCityLocalTimeForBaseMinutes,
  getCityOffsetBadgeForBaseMinutes,
  getManualDateSelectionState,
  type CityTime
} from '../src/scripts/chronos-interactions.ts';

describe('Timezone Engine & DST Propagation', () => {
  const janDate: DateParts = { year: 2026, month: 1, day: 15 };
  const julDate: DateParts = { year: 2026, month: 7, day: 15 };

  it('calculates distinct DST offsets for London in January (GMT 0) vs July (BST +60)', () => {
    const londonJan = getTimezoneOffsetMinutes('Europe/London', janDate, 12 * 60, 'Europe/London');
    const londonJul = getTimezoneOffsetMinutes('Europe/London', julDate, 12 * 60, 'Europe/London');

    assert.strictEqual(londonJan, 0, 'London in January must be GMT (+0)');
    assert.strictEqual(londonJul, 60, 'London in July must be BST (+60 minutes)');
  });

  it('calculates distinct DST offsets for New York in January (EST -300) vs July (EDT -240)', () => {
    const nyJan = getTimezoneOffsetMinutes('America/New_York', janDate, 12 * 60, 'America/New_York');
    const nyJul = getTimezoneOffsetMinutes('America/New_York', julDate, 12 * 60, 'America/New_York');

    assert.strictEqual(nyJan, -300, 'New York in January must be EST (-300 minutes)');
    assert.strictEqual(nyJul, -240, 'New York in July must be EDT (-240 minutes)');
  });

  it('maintains constant offsets for non-DST zones in January vs July (Mumbai, Tokyo, Dubai)', () => {
    // Mumbai (Asia/Kolkata: +330 min)
    const mumbaiJan = getTimezoneOffsetMinutes('Asia/Kolkata', janDate, 12 * 60, 'Asia/Kolkata');
    const mumbaiJul = getTimezoneOffsetMinutes('Asia/Kolkata', julDate, 12 * 60, 'Asia/Kolkata');
    assert.strictEqual(mumbaiJan, 330);
    assert.strictEqual(mumbaiJul, 330);

    // Tokyo (Asia/Tokyo: +540 min)
    const tokyoJan = getTimezoneOffsetMinutes('Asia/Tokyo', janDate, 12 * 60, 'Asia/Tokyo');
    const tokyoJul = getTimezoneOffsetMinutes('Asia/Tokyo', julDate, 12 * 60, 'Asia/Tokyo');
    assert.strictEqual(tokyoJan, 540);
    assert.strictEqual(tokyoJul, 540);

    // Dubai (Asia/Dubai: +240 min)
    const dubaiJan = getTimezoneOffsetMinutes('Asia/Dubai', janDate, 12 * 60, 'Asia/Dubai');
    const dubaiJul = getTimezoneOffsetMinutes('Asia/Dubai', julDate, 12 * 60, 'Asia/Dubai');
    assert.strictEqual(dubaiJan, 240);
    assert.strictEqual(dubaiJul, 240);
  });

  it('computes exact fractional offsets for half-hour and quarter-hour zones', () => {
    // Kathmandu (+345 min = +5:45)
    const ktm = getTimezoneOffsetMinutes('Asia/Kathmandu', janDate, 12 * 60, 'Asia/Kathmandu');
    assert.strictEqual(ktm, 345);

    // Mumbai (+330 min = +5:30)
    const bom = getTimezoneOffsetMinutes('Asia/Kolkata', janDate, 12 * 60, 'Asia/Kolkata');
    assert.strictEqual(bom, 330);

    // Relative offset: Kathmandu vs Mumbai = +15 minutes = +0.25 hours
    const relOffset = getRelativeOffsetHours('Asia/Kathmandu', 'Asia/Kolkata', janDate, 12 * 60);
    assert.strictEqual(relOffset, 0.25);
  });

  it('evaluates relative offsets between London and Mumbai accurately across seasons', () => {
    // In Jan: London is GMT (0), Mumbai is IST (+5.5) -> London relative to Mumbai is -5.5
    const janRel = getRelativeOffsetHours('Europe/London', 'Asia/Kolkata', janDate, 12 * 60);
    assert.strictEqual(janRel, -5.5);

    // In July: London is BST (+1), Mumbai is IST (+5.5) -> London relative to Mumbai is -4.5
    const julRel = getRelativeOffsetHours('Europe/London', 'Asia/Kolkata', julDate, 12 * 60);
    assert.strictEqual(julRel, -4.5);
  });

  it('computes local time and date shift across timezones correctly', () => {
    // When it is 2026-12-25 23:00 in London (GMT 0), what time is it in Tokyo (JST +9)?
    // 23:00 + 9h = 08:00 on Dec 26 (+1 day)
    const dec25: DateParts = { year: 2026, month: 12, day: 25 };
    const tokyoLocal = getLocalTimeForDateParts('Asia/Tokyo', 'Europe/London', dec25, 23 * 60);

    assert.strictEqual(tokyoLocal.hour, 8);
    assert.strictEqual(tokyoLocal.minute, 0);
    assert.strictEqual(tokyoLocal.dayShift, 1);
    assert.deepStrictEqual(tokyoLocal.date, { year: 2026, month: 12, day: 26 });
  });

  it('projects each base hour through New York spring-forward without a phantom 02:00', () => {
    const transitionDate: DateParts = { year: 2026, month: 3, day: 8 };
    const beforeTransition = getLocalTimeForDateParts('America/New_York', 'UTC', transitionDate, 6 * 60);
    const afterTransition = getLocalTimeForDateParts('America/New_York', 'UTC', transitionDate, 7 * 60);

    assert.strictEqual(beforeTransition.hour, 1);
    assert.strictEqual(afterTransition.hour, 3);
    assert.notStrictEqual(afterTransition.hour, 2);
  });

  it('uses the exact base-zone instant for Chronos local projections', () => {
    const baseCity: CityTime = {
      id: 'utc',
      name: 'UTC',
      country: 'UTC',
      flag: '🌐',
      timezone: 'UTC',
      offsetHours: 0,
      badge: 'Base',
      statusLabel: 'UTC',
      isBase: true
    };
    const newYork: CityTime = {
      id: 'nyc',
      name: 'New York',
      country: 'United States',
      flag: '🇺🇸',
      timezone: 'America/New_York',
      offsetHours: 0,
      badge: '-5h',
      statusLabel: 'EST'
    };
    const transitionDate: DateParts = { year: 2026, month: 3, day: 8 };

    assert.strictEqual(getCityLocalTimeForBaseMinutes(newYork, baseCity, transitionDate, 6 * 60).hour, 1);
    assert.strictEqual(getCityLocalTimeForBaseMinutes(newYork, baseCity, transitionDate, 7 * 60).hour, 3);
  });

  it('formats offset labels with standard and mathematical minus symbols', () => {
    assert.strictEqual(formatOffset(330), '+05:30');
    assert.strictEqual(formatOffset(-300), '-05:00');
    assert.strictEqual(formatOffset(0), '+00:00');

    assert.strictEqual(formatUtcOffset(330), 'UTC+05:30');
    assert.strictEqual(formatUtcOffset(-300), 'UTC−05:00');
  });

  it('validates IANA timezones accurately', () => {
    assert.strictEqual(isValidIanaTimezone('Europe/London'), true);
    assert.strictEqual(isValidIanaTimezone('Asia/Kolkata'), true);
    assert.strictEqual(isValidIanaTimezone('America/New_York'), true);
    assert.strictEqual(isValidIanaTimezone('Invalid/Zone'), false);
    assert.strictEqual(isValidIanaTimezone('America/Quito'), false); // Rejected by Intl in current runtime
    assert.strictEqual(isValidIanaTimezone('America/Guayaquil'), true); // Canonical Ecuador timezone
  });

  it('keeps a manually selected civil date and exits live sync', () => {
    const selected = getManualDateSelectionState({ year: 2026, month: 3, day: 8 });

    assert.deepStrictEqual(selected.dateParts, { year: 2026, month: 3, day: 8 });
    assert.strictEqual(selected.isLiveSync, false);
    assert.strictEqual(selected.displayDate.getFullYear(), 2026);
    assert.strictEqual(selected.displayDate.getMonth(), 2);
    assert.strictEqual(selected.displayDate.getDate(), 8);
  });

  it('renders a safe unavailable badge for a nonexistent base-zone focus time', () => {
    const baseCity: CityTime = {
      id: 'ny-base',
      name: 'New York',
      country: 'Test',
      flag: '🌐',
      timezone: 'America/New_York',
      offsetHours: 0,
      badge: 'Base',
      statusLabel: 'EST',
      isBase: true
    };
    const london: CityTime = {
      id: 'lon',
      name: 'London',
      country: 'United Kingdom',
      flag: '🇬🇧',
      timezone: 'Europe/London',
      offsetHours: 0,
      badge: '+0h',
      statusLabel: 'GMT'
    };

    assert.strictEqual(
      getCityOffsetBadgeForBaseMinutes(
        london,
        baseCity,
        { year: 2026, month: 3, day: 8 },
        2 * 60
      ),
      'DST unavailable'
    );
  });
});
