import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { datePartsToInstant } from '../src/scripts/core/date-only.ts';
import { getParticipantStatusForMeeting } from '../src/scripts/time-utils.ts';

describe('time-utils integration', () => {
  it('evaluates an instant selected in the base timezone relative to that same base', () => {
    const selectedInstant = datePartsToInstant(
      { year: 2026, month: 1, day: 15 },
      0,
      0,
      'Asia/Kolkata'
    );

    const result = getParticipantStatusForMeeting(
      'America/New_York',
      selectedInstant,
      0,
      60,
      'Asia/Kolkata'
    );

    assert.equal(result, 'working');
  });
});
