import { Temporal } from '@js-temporal/polyfill';

/**
 * Core Date-Only Pure Module
 * 
 * Provides pure civil date arithmetic (YYYY-MM-DD) independent of browser APIs,
 * avoiding JavaScript Date UTC/local time shifts.
 */

export interface DateParts {
  year: number;
  month: number; // 1-12
  day: number;   // 1-31
}

export class InvalidCivilTimeError extends RangeError {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCivilTimeError';
  }
}

export function isInvalidCivilTimeError(error: unknown): error is InvalidCivilTimeError {
  return error instanceof InvalidCivilTimeError || (
    error instanceof Error && error.name === 'InvalidCivilTimeError'
  );
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

export function getDaysInMonth(year: number, month: number): number {
  if (month < 1 || month > 12) return 0;
  const days = [31, isLeapYear(year) ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
  return days[month - 1];
}

export function isValidDateParts(parts: { year: number; month: number; day: number }): boolean {
  const { year, month, day } = parts;
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) {
    return false;
  }
  if (year < 1000 || year > 9999) return false;
  if (month < 1 || month > 12) return false;
  const maxDays = getDaysInMonth(year, month);
  return day >= 1 && day <= maxDays;
}

export function isValidDateOnly(value: string | null | undefined): boolean {
  if (!value || typeof value !== 'string') return false;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  return isValidDateParts({ year, month, day });
}

export function parseDateOnly(value: string | null | undefined): DateParts | null {
  if (!value || typeof value !== 'string') return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;

  const year = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const day = parseInt(match[3], 10);

  if (!isValidDateParts({ year, month, day })) {
    return null;
  }

  return { year, month, day };
}

export function formatDateOnly(parts: DateParts): string {
  const y = String(parts.year).padStart(4, '0');
  const m = String(parts.month).padStart(2, '0');
  const d = String(parts.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function areDatePartsEqual(a: DateParts, b: DateParts): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day;
}

export function compareDateParts(a: DateParts, b: DateParts): number {
  if (a.year !== b.year) return a.year - b.year;
  if (a.month !== b.month) return a.month - b.month;
  return a.day - b.day;
}

export function addCalendarDays(parts: DateParts, amount: number): DateParts {
  if (amount === 0) return { ...parts };

  // Use UTC Date at noon (12:00) to perform day arithmetic without DST edge cases
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  utcDate.setUTCDate(utcDate.getUTCDate() + amount);

  return {
    year: utcDate.getUTCFullYear(),
    month: utcDate.getUTCMonth() + 1,
    day: utcDate.getUTCDate()
  };
}

export function formatDateLabel(parts: DateParts): string {
  // Format using UTC noon to guarantee zero shift in day/weekday/month
  const utcDate = new Date(Date.UTC(parts.year, parts.month - 1, parts.day, 12, 0, 0));
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'UTC',
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
  return formatter.format(utcDate);
}

export function formatInvalidCivilTimeMessage(
  parts: DateParts,
  hour: number,
  minute: number,
  timezone: string
): string {
  const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
  return `${formatDateLabel(parts)} at ${startTime} is unavailable in ${timezone} because it is nonexistent or ambiguous during a daylight-saving transition.`;
}

export function getTodayDateParts(timezone?: string): DateParts {
  const now = new Date();
  const tz = timezone || Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  return dateToDatePartsInTimezone(now, tz);
}

export function dateToDatePartsInTimezone(date: Date, timezone: string): DateParts {
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric'
    });
    const parts = formatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    return {
      year: parseInt(partMap.year, 10),
      month: parseInt(partMap.month, 10),
      day: parseInt(partMap.day, 10)
    };
  } catch (_) {
    // Fallback to UTC if timezone is invalid
    return {
      year: date.getUTCFullYear(),
      month: date.getUTCMonth() + 1,
      day: date.getUTCDate()
    };
  }
}

/**
 * Converts a civil date + local hour/minute in a specific timezone into a precise UTC Date instant.
 * Rejects nonexistent and ambiguous local times instead of silently shifting them.
 */
export function datePartsToInstant(
  parts: DateParts,
  hour: number,
  minute: number,
  timezone: string
): Date {
  const normHour = Math.floor(hour);
  const normMin = Math.floor(minute);

  if (!isValidDateParts(parts) || normHour < 0 || normHour > 23 || normMin < 0 || normMin > 59) {
    throw new InvalidCivilTimeError(`Invalid local time in ${timezone}`);
  }

  try {
    const zonedDateTime = Temporal.ZonedDateTime.from(
      {
        timeZone: timezone,
        calendar: 'iso8601',
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: normHour,
        minute: normMin,
        second: 0,
        millisecond: 0,
        microsecond: 0,
        nanosecond: 0
      },
      { disambiguation: 'reject' }
    );

    return new Date(Number(zonedDateTime.epochMilliseconds));
  } catch (error) {
    if (error instanceof RangeError) {
      throw new InvalidCivilTimeError(
        `Invalid or ambiguous local time in ${timezone}: ` +
        `${formatDateOnly(parts)} ${String(normHour).padStart(2, '0')}:${String(normMin).padStart(2, '0')}`
      );
    }
    throw error;
  }
}

export function serializeDateParam(parts: DateParts): string {
  return formatDateOnly(parts);
}

export function parseDateParamWithFallback(param: string | null | undefined, fallbackTz?: string): DateParts {
  const parsed = parseDateOnly(param);
  if (parsed) return parsed;
  return getTodayDateParts(fallbackTz);
}
