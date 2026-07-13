/**
 * Calculate timezone offset in minutes for a specific IANA timezone at a given Date.
 * Handles Daylight Saving Time (DST) changes dynamically using browser Intl API.
 */
export function getTimezoneOffset(timezone: string, date: Date = new Date()): number {
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
    const parts = formatter.formatToParts(date);
    const partMap = Object.fromEntries(parts.map(p => [p.type, p.value]));
    
    const year = parseInt(partMap.year);
    const month = parseInt(partMap.month) - 1;
    const day = parseInt(partMap.day);
    // Handle edge case of hour = 24 depending on locale
    const rawHour = parseInt(partMap.hour);
    const hour = rawHour === 24 ? 0 : rawHour;
    const minute = parseInt(partMap.minute);
    const second = parseInt(partMap.second);
    
    const localTimeAsUTC = Date.UTC(year, month, day, hour, minute, second);
    const utcTime = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate(),
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds()
    );
    
    return Math.round((localTimeAsUTC - utcTime) / 60000);
  } catch (e) {
    console.error(`Error calculating offset for ${timezone}:`, e);
    // Fallback to local system offset if formatting fails
    return -date.getTimezoneOffset();
  }
}

/**
 * Returns formatted offset label e.g., "+05:30" or "-08:00"
 */
export function formatOffset(offsetMinutes: number): string {
  const absOffset = Math.abs(offsetMinutes);
  const hours = Math.floor(absOffset / 60);
  const minutes = absOffset % 60;
  const sign = offsetMinutes >= 0 ? '+' : '-';
  return `${sign}${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

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

export interface OverlapSlot {
  homeHour: number;
  score: number;
  ratings: Record<string, 'working' | 'border' | 'sleep'>;
}

/**
 * Evaluates the overlap scores for all 24 hours of a day.
 * Returns an array of slot details sorted by score (highest to lowest compatibility).
 */
export function calculateOverlap(
  selectedDate: Date,
  homeTimezone: string,
  cityTimezones: string[]
): OverlapSlot[] {
  const slots: OverlapSlot[] = [];
  
  // Set date to 00:00:00 of local day in Home timezone
  const baseDate = new Date(selectedDate);
  
  for (let h = 0; h < 24; h++) {
    // Construct exact time for this home hour
    const dateAtHour = new Date(baseDate);
    dateAtHour.setHours(h, 0, 0, 0);

    const ratings: Record<string, 'working' | 'border' | 'sleep'> = {};
    let totalScore = 0;

    // Evaluate home zone
    const homeOffset = getTimezoneOffset(homeTimezone, dateAtHour);
    const homeLocalTime = new Date(dateAtHour.getTime() + homeOffset * 60000);
    const homeLocalHour = homeLocalTime.getUTCHours();
    const homeCat = getHourCategory(homeLocalHour);
    ratings[homeTimezone] = homeCat;
    
    // Scoring logic
    totalScore += homeCat === 'working' ? 10 : homeCat === 'border' ? 4 : -10;

    // Evaluate other zones
    for (const tz of cityTimezones) {
      const offset = getTimezoneOffset(tz, dateAtHour);
      const localTime = new Date(dateAtHour.getTime() + offset * 60000);
      const localHour = localTime.getUTCHours();
      const cat = getHourCategory(localHour);
      ratings[tz] = cat;
      totalScore += cat === 'working' ? 10 : cat === 'border' ? 4 : -10;
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
 * Generate ICS (iCalendar) text string for file downloads
 */
export function generateIcsContent(details: CalendarDetails): string {
  const start = formatCalendarDate(details.startDate);
  const endDate = new Date(details.startDate.getTime() + details.durationMinutes * 60000);
  const end = formatCalendarDate(endDate);
  const stamp = formatCalendarDate(new Date());

  // Escape special chars for ICS fields
  const escapeText = (str: string) => str.replace(/[,;]/g, '\\$&').replace(/\n/g, '\\n');

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
    `SUMMARY:${escapeText(details.title)}`,
    `DESCRIPTION:${escapeText(details.description)}`,
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');
}
