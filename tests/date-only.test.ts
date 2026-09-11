import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  type DateParts,
  parseDateOnly,
  formatDateOnly,
  isValidDateOnly,
  addCalendarDays,
  formatDateLabel,
  formatInvalidCivilTimeMessage,
  isInvalidCivilTimeError,
  getTodayDateParts,
  areDatePartsEqual,
  datePartsToInstant,
  dateToDatePartsInTimezone,
  serializeDateParam,
  parseDateParamWithFallback
} from '../src/scripts/core/date-only.ts';

describe('Date-Only Core Engine', () => {
  it('parses valid ISO YYYY-MM-DD date-only strings into exact DateParts without UTC/local time shifting', () => {
    const parsed = parseDateOnly('2026-12-25');
    assert.deepStrictEqual(parsed, { year: 2026, month: 12, day: 25 });
  });

  it('formats DateParts back to YYYY-MM-DD string exactly', () => {
    const formatted = formatDateOnly({ year: 2026, month: 12, day: 25 });
    assert.strictEqual(formatted, '2026-12-25');
  });

  it('produces identical round-trip serialization and reload idempotence', () => {
    const initial = '2026-12-25';
    const parts1 = parseDateParamWithFallback(initial);
    const param1 = serializeDateParam(parts1);
    const parts2 = parseDateParamWithFallback(param1);
    const param2 = serializeDateParam(parts2);

    assert.strictEqual(param1, initial);
    assert.strictEqual(param2, initial);
    assert.deepStrictEqual(parts1, parts2);
  });

  it('generates accurate visible date label matching the civil date', () => {
    const parts: DateParts = { year: 2026, month: 12, day: 25 };
    const label = formatDateLabel(parts);
    // 2026-12-25 is a Friday
    assert.ok(label.includes('Friday'));
    assert.ok(label.includes('Dec'));
    assert.ok(label.includes('25'));
    assert.ok(label.includes('2026'));
  });

  it('correctly handles month and year boundaries with addCalendarDays', () => {
    const newYearsEve: DateParts = { year: 2026, month: 12, day: 31 };
    const newYearsDay = addCalendarDays(newYearsEve, 1);
    assert.deepStrictEqual(newYearsDay, { year: 2027, month: 1, day: 1 });

    const prevDay = addCalendarDays(newYearsDay, -1);
    assert.deepStrictEqual(prevDay, newYearsEve);

    const feb28NonLeap: DateParts = { year: 2026, month: 2, day: 28 };
    const mar1 = addCalendarDays(feb28NonLeap, 1);
    assert.deepStrictEqual(mar1, { year: 2026, month: 3, day: 1 });

    const backToFeb28 = addCalendarDays(mar1, -1);
    assert.deepStrictEqual(backToFeb28, feb28NonLeap);
  });

  it('correctly handles leap days in leap years and rejects non-leap year Feb 29', () => {
    // 2024 is a leap year
    assert.strictEqual(isValidDateOnly('2024-02-29'), true);
    const leapDayParts = parseDateOnly('2024-02-29');
    assert.deepStrictEqual(leapDayParts, { year: 2024, month: 2, day: 29 });
    const march1_2024 = addCalendarDays(leapDayParts!, 1);
    assert.deepStrictEqual(march1_2024, { year: 2024, month: 3, day: 1 });

    // 2026 is NOT a leap year
    assert.strictEqual(isValidDateOnly('2026-02-29'), false);
    assert.strictEqual(parseDateOnly('2026-02-29'), null);
  });

  it('rejects invalid dates or safely falls back to today', () => {
    assert.strictEqual(isValidDateOnly('invalid'), false);
    assert.strictEqual(isValidDateOnly('2026-13-45'), false);
    assert.strictEqual(isValidDateOnly('2026-04-31'), false); // April has 30 days
    assert.strictEqual(isValidDateOnly(''), false);

    const fallback = parseDateParamWithFallback('invalid-date');
    const today = getTodayDateParts();
    assert.deepStrictEqual(fallback, today);
  });

  it('converts civil date to an exact instant in given timezone without date shifting', () => {
    const parts: DateParts = { year: 2026, month: 12, day: 25 };

    // In UTC at 12:00
    const utcInstant = datePartsToInstant(parts, 12, 0, 'UTC');
    const utcParts = dateToDatePartsInTimezone(utcInstant, 'UTC');
    assert.deepStrictEqual(utcParts, parts);

    // In Asia/Kolkata (IST +5:30) at 12:00 local
    const istInstant = datePartsToInstant(parts, 12, 0, 'Asia/Kolkata');
    const istParts = dateToDatePartsInTimezone(istInstant, 'Asia/Kolkata');
    assert.deepStrictEqual(istParts, parts);

    // In America/Los_Angeles (PST -8:00) at 12:00 local
    const pstInstant = datePartsToInstant(parts, 12, 0, 'America/Los_Angeles');
    const pstParts = dateToDatePartsInTimezone(pstInstant, 'America/Los_Angeles');
    assert.deepStrictEqual(pstParts, parts);
  });

  it('rejects a nonexistent spring-forward local time', () => {
    assert.throws(
      () => datePartsToInstant({ year: 2026, month: 3, day: 8 }, 2, 0, 'America/New_York'),
      RangeError
    );
  });

  it('rejects an ambiguous fall-back local time', () => {
    assert.throws(
      () => datePartsToInstant({ year: 2026, month: 11, day: 1 }, 1, 30, 'America/New_York'),
      RangeError
    );
  });

  it('recognizes invalid civil-time errors across module or realm boundaries', () => {
    const foreignError = Object.assign(new RangeError('invalid local time'), {
      name: 'InvalidCivilTimeError'
    });

    assert.strictEqual(isInvalidCivilTimeError(foreignError), true);
    assert.strictEqual(isInvalidCivilTimeError(new RangeError('other range error')), false);
  });

  it('describes invalid DST civil times without claiming an ambiguous time does not exist', () => {
    const message = formatInvalidCivilTimeMessage(
      { year: 2026, month: 11, day: 1 },
      1,
      30,
      'America/New_York'
    );

    assert.ok(message.includes('Sunday, Nov 1, 2026 at 01:30'));
    assert.ok(message.includes('is unavailable in America/New_York'));
    assert.ok(message.includes('nonexistent or ambiguous'));
    assert.ok(!message.includes('does not exist'));
  });

  it('checks equality of DateParts accurately', () => {
    assert.strictEqual(areDatePartsEqual({ year: 2026, month: 12, day: 25 }, { year: 2026, month: 12, day: 25 }), true);
    assert.strictEqual(areDatePartsEqual({ year: 2026, month: 12, day: 25 }, { year: 2026, month: 12, day: 24 }), false);
  });
});
