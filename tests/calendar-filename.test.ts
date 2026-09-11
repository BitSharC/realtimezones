import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeCalendarFilename } from '../src/scripts/core/calendar-filename.ts';

describe('Calendar Filename Sanitizer & Path-Traversal Protection', () => {
  it('handles normal meeting names cleanly', () => {
    assert.strictEqual(sanitizeCalendarFilename('team-sync'), 'team-sync.ics');
    assert.strictEqual(sanitizeCalendarFilename('Quarterly Planning 2026'), 'Quarterly-Planning-2026.ics');
  });

  it('prevents forward-slash and backslash path traversal', () => {
    assert.strictEqual(sanitizeCalendarFilename('team/sync'), 'team-sync.ics');
    assert.strictEqual(sanitizeCalendarFilename('team\\sync'), 'team-sync.ics');
    assert.strictEqual(sanitizeCalendarFilename('../../etc/passwd'), 'etc-passwd.ics');
    assert.strictEqual(sanitizeCalendarFilename('..\\..\\Windows\\System32\\calc'), 'Windows-System32-calc.ics');
  });

  it('strips null bytes and control characters', () => {
    assert.strictEqual(sanitizeCalendarFilename('meeting\0payload.sh'), 'meetingpayload.sh.ics');
    assert.strictEqual(sanitizeCalendarFilename("line1\nline2\r\t"), 'line1-line2.ics');
  });

  it('neutralizes complex parent-directory sequences (../ and ..\\)', () => {
    assert.strictEqual(sanitizeCalendarFilename('....//....//etc/shadow'), 'etc-shadow.ics');
    assert.strictEqual(sanitizeCalendarFilename('../../../secret'), 'secret.ics');
  });

  it('replaces dangerous filesystem separators (<>:"/\\|?*)', () => {
    const dangerous = 'meeting:*?"<>|test';
    const result = sanitizeCalendarFilename(dangerous);
    assert.strictEqual(/[:*?"<>|/\\]/.test(result), false);
    assert.ok(result.endsWith('.ics'));
  });

  it('caps excessively long names and preserves final .ics extension', () => {
    const longName = 'A'.repeat(200);
    const result = sanitizeCalendarFilename(longName);
    assert.ok(result.length <= 68, `Length should be <= 68, got ${result.length}`);
    assert.ok(result.endsWith('.ics'));
    assert.strictEqual(result.startsWith('A'), true);
  });

  it('provides deterministic fallback for empty, null, or whitespace-only names', () => {
    assert.strictEqual(sanitizeCalendarFilename(''), 'realtimezones-meeting.ics');
    assert.strictEqual(sanitizeCalendarFilename('   '), 'realtimezones-meeting.ics');
    assert.strictEqual(sanitizeCalendarFilename(null), 'realtimezones-meeting.ics');
    assert.strictEqual(sanitizeCalendarFilename(undefined), 'realtimezones-meeting.ics');
    assert.strictEqual(sanitizeCalendarFilename('///\\\\..'), 'realtimezones-meeting.ics');
  });

  it('preserves valid Unicode filenames cleanly', () => {
    assert.strictEqual(sanitizeCalendarFilename('全球同步会议'), '全球同步会议.ics');
    assert.strictEqual(sanitizeCalendarFilename('réunion-équipe'), 'réunion-équipe.ics');
  });

  it('never duplicates .ics extension', () => {
    assert.strictEqual(sanitizeCalendarFilename('team-sync.ics'), 'team-sync.ics');
    assert.strictEqual(sanitizeCalendarFilename('team-sync.ICS'), 'team-sync.ics');
  });

  it('sanitizes Windows reserved device names', () => {
    assert.strictEqual(sanitizeCalendarFilename('CON'), 'rtz-CON.ics');
    assert.strictEqual(sanitizeCalendarFilename('NUL'), 'rtz-NUL.ics');
    assert.strictEqual(sanitizeCalendarFilename('aux.ics'), 'rtz-aux.ics');
    assert.strictEqual(sanitizeCalendarFilename('CON.txt'), 'rtz-CON.txt.ics');
    assert.strictEqual(sanitizeCalendarFilename('COM1.csv'), 'rtz-COM1.csv.ics');
  });

  it('sanitizes custom fallbacks and guarantees their .ics extension', () => {
    assert.strictEqual(
      sanitizeCalendarFilename('', '../unsafe/fallback'),
      'unsafe-fallback.ics'
    );
    assert.strictEqual(
      sanitizeCalendarFilename('', 'fallback-name'),
      'fallback-name.ics'
    );
  });
});
