/**
 * Core Meeting Duration & Interval Intelligence Pure Module
 * 
 * Evaluates meeting compatibility over full intervals [start, start + duration],
 * accounting for minute-level boundaries, midnight crossings, and custom working hours.
 */

import { type DateParts, datePartsToInstant, isInvalidCivilTimeError } from './date-only.ts';

export type ParticipantWorkHours = {
  timezone: string;
  workStartMinutes?: number; // e.g. 8 * 60 = 480 (08:00)
  workEndMinutes?: number;   // e.g. 18 * 60 = 1080 (18:00)
};

export type MeetingSlotInput = {
  date: DateParts;
  baseTimezone: string;
  startMinutes: number;
  durationMinutes: number;
  participants: ParticipantWorkHours[];
};

export type ParticipantSlotRating = 'working' | 'border' | 'sleep';

export type EvaluatedSlot = {
  startHour: number;
  startMinutes: number;
  durationMinutes: number;
  score: number;
  allWorking: boolean;
  ratings: Record<string, ParticipantSlotRating>;
  numWorking: number;
  numBorder: number;
  numSleep: number;
};

/**
 * Categorizes a specific local minute (0 - 1439) into working, border, or sleep.
 */
export function categorizeLocalMinute(
  minuteOfDay: number,
  workStartMin: number = 8 * 60,
  workEndMin: number = 18 * 60
): ParticipantSlotRating {
  // Normalize minuteOfDay to 0..1439
  const m = ((minuteOfDay % 1440) + 1440) % 1440;

  if (m >= workStartMin && m < workEndMin) {
    return 'working';
  }

  const borderMorningStart = Math.max(0, workStartMin - 120); // 2 hours before work
  const borderEveningEnd = Math.min(1440, workEndMin + 240);   // 4 hours after work

  if ((m >= borderMorningStart && m < workStartMin) || (m >= workEndMin && m < borderEveningEnd)) {
    return 'border';
  }

  return 'sleep';
}

/**
 * Evaluates a participant's availability across the entire meeting interval [start, start + duration].
 * If any part of the interval touches sleep -> 'sleep'
 * Else if any part touches border -> 'border'
 * Only if the entire duration is within working hours -> 'working'
 */
export function getIntervalParticipantStatus(
  participantTimezone: string,
  baseTimezone: string,
  date: DateParts,
  startMinutes: number,
  durationMinutes: number,
  workStartMinutes: number = 8 * 60,
  workEndMinutes: number = 18 * 60
): ParticipantSlotRating {
  const startHour = Math.floor(startMinutes / 60);
  const startMin = startMinutes % 60;
  const startInstant = datePartsToInstant(date, startHour, startMin, baseTimezone);
  const endInstant = new Date(startInstant.getTime() + durationMinutes * 60000);

  // Sample points across the meeting interval:
  // 1. Start point
  // 2. Sample every 15 minutes
  // 3. End boundary (1 second before completion so meetings ending exactly at workEnd count as working)
  const sampleInstants: Date[] = [startInstant];
  const stepMs = 15 * 60 * 1000;
  let t = startInstant.getTime() + stepMs;
  while (t < endInstant.getTime() - 1000) {
    sampleInstants.push(new Date(t));
    t += stepMs;
  }
  sampleInstants.push(new Date(endInstant.getTime() - 1000));

  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: participantTimezone,
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  let hasSleep = false;
  let hasBorder = false;

  for (const instant of sampleInstants) {
    const parts = formatter.formatToParts(instant);
    const partMap = Object.fromEntries(parts.map((p) => [p.type, p.value]));
    const rawH = parseInt(partMap.hour, 10);
    const h = rawH === 24 ? 0 : rawH;
    const m = parseInt(partMap.minute, 10);
    const minuteOfDay = h * 60 + m;

    const rating = categorizeLocalMinute(minuteOfDay, workStartMinutes, workEndMinutes);
    if (rating === 'sleep') {
      hasSleep = true;
      break; // Sleep is worst case, cannot get worse
    }
    if (rating === 'border') {
      hasBorder = true;
    }
  }

  if (hasSleep) return 'sleep';
  if (hasBorder) return 'border';
  return 'working';
}

/**
 * Evaluates an entire meeting slot across all participants using duration-aware interval logic.
 */
export function evaluateMeetingSlot(input: MeetingSlotInput): EvaluatedSlot {
  const ratings: Record<string, ParticipantSlotRating> = {};
  let numWorking = 0;
  let numBorder = 0;
  let numSleep = 0;

  const total = Math.max(1, input.participants.length);

  for (const p of input.participants) {
    const status = getIntervalParticipantStatus(
      p.timezone,
      input.baseTimezone,
      input.date,
      input.startMinutes,
      input.durationMinutes,
      p.workStartMinutes ?? 8 * 60,
      p.workEndMinutes ?? 18 * 60
    );

    ratings[p.timezone] = status;
    if (status === 'working') numWorking++;
    else if (status === 'border') numBorder++;
    else numSleep++;
  }

  const score = Math.round((100 * numWorking + 60 * numBorder + -20 * numSleep) / total);

  return {
    startHour: Math.floor(input.startMinutes / 60),
    startMinutes: input.startMinutes,
    durationMinutes: input.durationMinutes,
    score,
    allWorking: numWorking === total,
    ratings,
    numWorking,
    numBorder,
    numSleep
  };
}

/**
 * Calculates and ranks the best meeting slots for a given day and duration.
 */
export function calculateBestMeetingSlots(
  date: DateParts,
  durationMinutes: number,
  baseTimezone: string,
  participants: ParticipantWorkHours[],
  topN: number = 3
): EvaluatedSlot[] {
  const candidates: EvaluatedSlot[] = [];

  for (let h = 0; h < 24; h++) {
    try {
      const evaluated = evaluateMeetingSlot({
        date,
        baseTimezone,
        startMinutes: h * 60,
        durationMinutes,
        participants
      });
      candidates.push(evaluated);
    } catch (error) {
      if (!isInvalidCivilTimeError(error)) {
        throw error;
      }
    }
  }

  candidates.sort((a, b) => {
    // 1. Primary: Higher score first
    if (b.score !== a.score) {
      return b.score - a.score;
    }
    // 2. Secondary: More working participants
    if (b.numWorking !== a.numWorking) {
      return b.numWorking - a.numWorking;
    }
    // 3. Tertiary: Closeness to base noon (12:00)
    const distA = Math.abs(a.startHour - 12);
    const distB = Math.abs(b.startHour - 12);
    if (distA !== distB) {
      return distA - distB;
    }
    // 4. Quaternary: Earlier hour first
    return a.startHour - b.startHour;
  });

  return candidates.slice(0, topN);
}
