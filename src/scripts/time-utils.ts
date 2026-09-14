import {
  type DateParts,
  InvalidCivilTimeError,
  isInvalidCivilTimeError,
  dateToDatePartsInTimezone,
  parseDateOnly,
  formatDateOnly,
  isValidDateOnly,
  addCalendarDays,
  formatDateLabel,
  formatInvalidCivilTimeMessage,
  getTodayDateParts,
  datePartsToInstant,
  serializeDateParam,
  parseDateParamWithFallback
} from './core/date-only.ts';

import {
  isValidIanaTimezone,
  getTimezoneOffsetMinutes,
  getRelativeOffsetHours,
  getLocalTimeForDateParts,
  formatOffset,
  formatUtcOffset
} from './core/timezone-engine.ts';

import {
  type ParticipantWorkHours,
  type MeetingSlotInput,
  type ParticipantSlotRating,
  type EvaluatedSlot,
  categorizeLocalMinute,
  getIntervalParticipantStatus,
  evaluateMeetingSlot,
  calculateBestMeetingSlots
} from './core/meeting-intelligence.ts';

/**
 * Calculate timezone offset in minutes for a specific IANA timezone at a given Date or DateParts.
 * Handles Daylight Saving Time (DST) changes dynamically using browser Intl API.
 */
export function getTimezoneOffset(timezone: string, date: Date | DateParts = new Date()): number {
  return getTimezoneOffsetMinutes(timezone, date);
}

export {
  formatOffset,
  formatUtcOffset,
  type DateParts,
  InvalidCivilTimeError,
  isInvalidCivilTimeError,
  parseDateOnly,
  formatDateOnly,
  isValidDateOnly,
  addCalendarDays,
  formatDateLabel,
  formatInvalidCivilTimeMessage,
  getTodayDateParts,
  datePartsToInstant,
  dateToDatePartsInTimezone,
  serializeDateParam,
  parseDateParamWithFallback,
  isValidIanaTimezone,
  getTimezoneOffsetMinutes,
  getRelativeOffsetHours,
  getLocalTimeForDateParts,
  type ParticipantWorkHours,
  type MeetingSlotInput,
  type ParticipantSlotRating,
  type EvaluatedSlot,
  categorizeLocalMinute,
  getIntervalParticipantStatus,
  evaluateMeetingSlot,
  calculateBestMeetingSlots
};

/**
 * Get category of standard working hours:
 * - 08:00 - 18:00 -> Working (Green)
 * - 06:00 - 08:00, 18:00 - 22:00 -> Border (Amber)
 * - 22:00 - 06:00 -> Sleep / Unavailable (Red)
 */
export function getHourCategory(hour: number): 'working' | 'border' | 'sleep' {
  if (hour >= 8 && hour < 18) return 'working';
  if ((hour >= 6 && hour < 8) || (hour >= 18 && hour < 22)) return 'border';
  return 'sleep';
}

/**
 * Evaluates a timezone's status for the duration of a meeting block.
 */
export function getParticipantStatusForMeeting(
  timezone: string,
  selectedDate: Date | DateParts,
  startHour: number,
  durationMinutes: number,
  baseTimezone: string
): 'working' | 'border' | 'sleep' {
  const dateParts = 'year' in selectedDate ? selectedDate : dateToDatePartsInTimezone(selectedDate, baseTimezone);
  return getIntervalParticipantStatus(
    timezone,
    baseTimezone,
    dateParts,
    startHour * 60,
    durationMinutes
  );
}

export interface OverlapSlot {
  homeHour: number;
  score: number;
  ratings: Record<string, 'working' | 'border' | 'sleep'>;
}

/**
 * Evaluates the overlap scores for all 24 hours of a day, incorporating meeting duration.
 * Returns an array of slot details sorted by score (highest to lowest compatibility).
 */
export function calculateOverlap(
  selectedDate: Date | DateParts,
  homeTimezone: string,
  cityTimezones: string[],
  durationMinutes: number = 60
): OverlapSlot[] {
  const slots: OverlapSlot[] = [];
  const dateParts = 'year' in selectedDate ? selectedDate : dateToDatePartsInTimezone(selectedDate, homeTimezone);
  const allTzs = Array.from(new Set([homeTimezone, ...cityTimezones]));

  for (let h = 0; h < 24; h++) {
    const ratings: Record<string, 'working' | 'border' | 'sleep'> = {};
    let totalScore = 0;

    for (const tz of allTzs) {
      const status: ParticipantSlotRating = getIntervalParticipantStatus(
        tz,
        homeTimezone,
        dateParts,
        h * 60,
        durationMinutes
      );
      ratings[tz] = status;
      totalScore += status === 'working' ? 10 : status === 'border' ? 4 : -10;
    }

    slots.push({
      homeHour: h,
      score: totalScore,
      ratings
    });
  }

  return slots;
}

/**
 * Format date to standard ISO 8601 UTC string for calendar events (YYYYMMDDTHHMMSSZ)
 */
export function formatCalendarDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

/**
 * Formats a Date to Outlook datetime string
 */
export function formatOutlookDate(date: Date): string {
  return date.toISOString().split('.')[0] + 'Z';
}

export interface CalendarDetails {
  title: string;
  startDate: Date;
  durationMinutes: number;
  description: string;
}

/**
 * Generate Google Calendar add event URL
 */
export function generateGoogleCalendarUrl(details: CalendarDetails): string {
  const start = formatCalendarDate(details.startDate);
  const endDate = new Date(details.startDate.getTime() + details.durationMinutes * 60000);
  const end = formatCalendarDate(endDate);
  
  const url = new URL('https://calendar.google.com/calendar/render');
  url.searchParams.append('action', 'TEMPLATE');
  url.searchParams.append('text', details.title);
  url.searchParams.append('dates', `${start}/${end}`);
  url.searchParams.append('details', details.description);
  
  return url.toString();
}

/**
 * Generate Outlook Web Calendar add event URL
 */
export function generateOutlookCalendarUrl(details: CalendarDetails): string {
  const start = formatOutlookDate(details.startDate);
  const endDate = new Date(details.startDate.getTime() + details.durationMinutes * 60000);
  const end = formatOutlookDate(endDate);
  
  const url = new URL('https://outlook.live.com/calendar/0/deeplink/compose');
  url.searchParams.append('path', '/calendar/action/compose');
  url.searchParams.append('rru', 'addevent');
  url.searchParams.append('subject', details.title);
  url.searchParams.append('startdt', start);
  url.searchParams.append('enddt', end);
  url.searchParams.append('body', details.description);
  
  return url.toString();
}

/**
 * Escapes RFC 5545 TEXT values. Newlines are represented as literal `\\n`
 * sequences so user-controlled text cannot create additional iCalendar fields.
 */
export function escapeIcsText(value: string): string {
  if (typeof value !== 'string') return '';

  const slash = String.fromCharCode(92);
  const lineFeed = String.fromCharCode(10);
  const carriageReturn = String.fromCharCode(13);
  const filtered = Array.from(value)
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join('');

  return filtered
    .split(slash).join(slash + slash)
    .split(',').join(slash + ',')
    .split(';').join(slash + ';')
    .split(carriageReturn + lineFeed).join(slash + 'n')
    .split(carriageReturn).join(slash + 'n')
    .split(lineFeed).join(slash + 'n');
}


/**
 * Generate ICS (iCalendar) text string for file downloads
 */
export function generateIcsContent(details: CalendarDetails): string {
  const start = formatCalendarDate(details.startDate);
  const endDate = new Date(details.startDate.getTime() + details.durationMinutes * 60000);
  const end = formatCalendarDate(endDate);
  const stamp = formatCalendarDate(new Date());

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//RealTimeZones//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:rtz-${Date.now()}@realtimezones.com`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${start}`,
    `DTEND:${end}`,
    `SUMMARY:${escapeIcsText(details.title)}`,
    `DESCRIPTION:${escapeIcsText(details.description)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}

export { sanitizeCalendarFilename } from './core/calendar-filename.ts';
