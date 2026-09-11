import { describe, it } from 'node:test';
import assert from 'node:assert';
import { type DateParts } from '../src/scripts/core/date-only.ts';
import {
  type MeetingSlotInput,
  evaluateMeetingSlot,
  getIntervalParticipantStatus,
  calculateBestMeetingSlots
} from '../src/scripts/core/meeting-intelligence.ts';

describe('Meeting Duration & Interval Intelligence', () => {
  const testDate: DateParts = { year: 2026, month: 6, day: 10 };

  it('validates a 30-minute meeting at 16:00 when work ends at 17:00 as working', () => {
    // Participant working 09:00 to 17:00 (540m to 1020m)
    const status = getIntervalParticipantStatus(
      'Europe/London',
      'Europe/London',
      testDate,
      16 * 60, // 16:00
      30,      // 30 minutes -> ends 16:30 <= 17:00
      9 * 60,
      17 * 60
    );

    assert.strictEqual(status, 'working');
  });

  it('invalidates a 2-hour (120 min) meeting at 16:00 when work ends at 17:00', () => {
    // 16:00 to 18:00 crosses the 17:00 boundary into border hours
    const status = getIntervalParticipantStatus(
      'Europe/London',
      'Europe/London',
      testDate,
      16 * 60, // 16:00
      120,     // 120 minutes -> ends 18:00 > 17:00
      9 * 60,
      17 * 60
    );

    // Should NOT be 'working', must be 'border' or non-working
    assert.notStrictEqual(status, 'working');
    assert.strictEqual(status, 'border');
  });

  it('treats a meeting ending exactly at work end as valid working time', () => {
    // 16:00 + 60m ends at exactly 17:00
    const status = getIntervalParticipantStatus(
      'Europe/London',
      'Europe/London',
      testDate,
      16 * 60,
      60,
      9 * 60,
      17 * 60
    );

    assert.strictEqual(status, 'working', 'Meeting ending exactly at 17:00 is within working hours');
  });

  it('invalidates a meeting ending even 1 minute after work end', () => {
    // 16:01 + 60m ends at 17:01 (after 17:00)
    const status = getIntervalParticipantStatus(
      'Europe/London',
      'Europe/London',
      testDate,
      16 * 60 + 1,
      60,
      9 * 60,
      17 * 60
    );

    assert.notStrictEqual(status, 'working');
  });

  it('accurately identifies sleep when an interval crosses midnight into sleep hours', () => {
    // 23:00 to 01:00 (120 minutes)
    const status = getIntervalParticipantStatus(
      'Europe/London',
      'Europe/London',
      testDate,
      23 * 60,
      120,
      9 * 60,
      17 * 60
    );

    assert.strictEqual(status, 'sleep');
  });

  it('evaluates entire MeetingSlotInput across multiple participants with duration boundaries', () => {
    const slotInput30m: MeetingSlotInput = {
      date: testDate,
      baseTimezone: 'Europe/London',
      startMinutes: 16 * 60, // 16:00 London
      durationMinutes: 30,
      participants: [
        {
          timezone: 'Europe/London',
          workStartMinutes: 9 * 60,
          workEndMinutes: 17 * 60
        },
        {
          timezone: 'America/New_York', // 16:00 London is 11:00 NY
          workStartMinutes: 9 * 60,
          workEndMinutes: 17 * 60
        }
      ]
    };

    const result30 = evaluateMeetingSlot(slotInput30m);
    assert.strictEqual(result30.allWorking, true);
    assert.strictEqual(result30.ratings['Europe/London'], 'working');
    assert.strictEqual(result30.ratings['America/New_York'], 'working');

    // Same slot with 120 minutes: London ends at 18:00 (outside working hours 17:00)
    const slotInput120m: MeetingSlotInput = {
      ...slotInput30m,
      durationMinutes: 120
    };

    const result120 = evaluateMeetingSlot(slotInput120m);
    assert.strictEqual(result120.allWorking, false);
    assert.strictEqual(result120.ratings['Europe/London'], 'border');
  });

  it('skips a nonexistent base-zone start time when ranking recommendations', () => {
    const springForwardDate: DateParts = { year: 2026, month: 3, day: 8 };
    const participants = [
      { timezone: 'America/New_York' }
    ];

    const slots = calculateBestMeetingSlots(
      springForwardDate,
      60,
      'America/New_York',
      participants,
      24
    );

    assert.strictEqual(slots.length, 23);
    assert.strictEqual(slots.some((slot) => slot.startHour === 2), false);
  });

  it('changes recommended candidate slots when duration is increased across a boundary', () => {
    // In this team: London and New York.
    // Work hours 09:00 to 17:00.
    // At 30m duration, 16:00 London is an excellent overlap (16:00-16:30 London, 11:00-11:30 NY).
    // At 120m duration, 16:00 London is not an all-working overlap (16:00-18:00 London).
    const participants = [
      { timezone: 'Europe/London', workStartMinutes: 9 * 60, workEndMinutes: 17 * 60 },
      { timezone: 'America/New_York', workStartMinutes: 9 * 60, workEndMinutes: 17 * 60 }
    ];

    const best30 = calculateBestMeetingSlots(testDate, 30, 'Europe/London', participants);
    const best120 = calculateBestMeetingSlots(testDate, 120, 'Europe/London', participants);

    const slot16In30 = best30.find((s) => s.startHour === 16);
    const slot16In120 = best120.find((s) => s.startHour === 16);

    assert.ok(slot16In30, '16:00 is among top recommendations for 30m');
    assert.strictEqual(slot16In30?.allWorking, true);

    if (slot16In120) {
      assert.strictEqual(slot16In120.allWorking, false);
    }
  });
});
