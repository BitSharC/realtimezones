/**
 * Core Timezone Engine Pure Module
 * 
 * Provides high-precision IANA timezone calculations, DST-aware offsets,
 * and fractional timezone arithmetic without DOM dependencies.
 */

import { type DateParts, datePartsToInstant, compareDateParts } from './date-only.ts';

/**
 * Validates if an identifier is recognized as a valid IANA timezone by Intl.DateTimeFormat.
 */
export function isValidIanaTimezone(timezone: string): boolean {
  if (!timezone || typeof timezone !== 'string') return false;
  try {
    Intl.DateTimeFormat(undefined, { timeZone: timezone });
    return true;
  } catch (_) {
    return false;
  }
}

/**
 * Calculates the timezone offset in minutes for a specific timezone at a given instant or civil date.
 * Handles DST shifts accurately by formatting an explicit instant.
 */
export function getTimezoneOffsetMinutes(
  timezone: string,
  dateOrParts: Date | DateParts = new Date(),
  startMinutes: number = 12 * 60,
  baseTimezone?: string
): number {
  let instant: Date;

  if (dateOrParts instanceof Date) {
    instant = dateOrParts;
  } else {
    // Resolve civil date + startMinutes in baseTimezone (or target timezone) into an exact UTC instant
    const tzForInstant = baseTimezone || timezone;
    const hour = Math.floor(startMinutes / 60);
    const minute = startMinutes % 60;
    instant = datePartsToInstant(dateOrParts, hour, minute, tzForInstant);
  }

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(instant);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    const year = parseInt(partMap.year, 10);
    const month = parseInt(partMap.month, 10) - 1;
    const day = parseInt(partMap.day, 10);
    const rawHour = parseInt(partMap.hour, 10);
    const hour = rawHour === 24 ? 0 : rawHour;
    const minute = parseInt(partMap.minute, 10);
    const second = parseInt(partMap.second, 10);

    const localTimeAsUTC = Date.UTC(year, month, day, hour, minute, second);
    const utcTime = Date.UTC(
      instant.getUTCFullYear(),
      instant.getUTCMonth(),
      instant.getUTCDate(),
      instant.getUTCHours(),
      instant.getUTCMinutes(),
      instant.getUTCSeconds()
    );

    return Math.round((localTimeAsUTC - utcTime) / 60000);
  } catch (_) {
    return 0;
  }
}

/**
 * Returns the relative offset in hours between city timezone and base timezone:
 * (cityOffsetMinutes - baseOffsetMinutes) / 60
 */
export function getRelativeOffsetHours(
  cityTimezone: string,
  baseTimezone: string,
  dateOrParts: Date | DateParts = new Date(),
  startMinutes: number = 12 * 60
): number {
  if (!cityTimezone || !baseTimezone || cityTimezone === baseTimezone) {
    return 0;
  }

  const cityOffset = getTimezoneOffsetMinutes(cityTimezone, dateOrParts, startMinutes, baseTimezone);
  const baseOffset = getTimezoneOffsetMinutes(baseTimezone, dateOrParts, startMinutes, baseTimezone);

  return (cityOffset - baseOffset) / 60;
}

/**
 * Calculates local time and civil date for a target city timezone based on a base city's civil date and time.
 */
export function getLocalTimeForDateParts(
  cityTimezone: string,
  baseTimezone: string,
  baseDate: DateParts,
  baseMinutes: number
): { date: DateParts; hour: number; minute: number; dayShift: number } {
  const baseHour = Math.floor(baseMinutes / 60);
  const baseMin = baseMinutes % 60;
  const instant = datePartsToInstant(baseDate, baseHour, baseMin, baseTimezone);

  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: cityTimezone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false
    });
    const parts = formatter.formatToParts(instant);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));

    const year = parseInt(partMap.year, 10);
    const month = parseInt(partMap.month, 10);
    const day = parseInt(partMap.day, 10);
    const rawHour = parseInt(partMap.hour, 10);
    const hour = rawHour === 24 ? 0 : rawHour;
    const minute = parseInt(partMap.minute, 10);

    const cityDate: DateParts = { year, month, day };
    const dayShift = compareDateParts(cityDate, baseDate);

    return {
      date: cityDate,
      hour,
      minute,
      dayShift
    };
  } catch (_) {
    return {
      date: { ...baseDate },
      hour: baseHour,
      minute: baseMin,
      dayShift: 0
    };
  }
}

/**
 * Returns formatted offset label e.g., "+05:30" or "-05:00"
 */
export function formatOffset(offsetMinutes: number): string {
  const absOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

/**
 * Returns formatted offset label e.g., "UTC+05:30" or "UTC−05:00" using mathematical minus character "−"
 */
export function formatUtcOffset(offsetMinutes: number): string {
  const absOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  const sign = offsetMinutes >= 0 ? '+' : '−'; // unicode mathematical minus
  return `UTC${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}
