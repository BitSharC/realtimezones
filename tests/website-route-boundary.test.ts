import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { cities } from '../src/data/cities.ts';
import { parseSharedCityNames, parseBoundedInteger } from '../src/scripts/core/url-input.ts';
import { parseDateOnly } from '../src/scripts/time-utils.ts';
import { evaluateMeetingSlot, calculateBestMeetingSlots, type MeetingSlotInput } from '../src/scripts/core/meeting-intelligence.ts';
import { generateGoogleCalendarUrl, generateOutlookCalendarUrl, generateIcsContent } from '../src/scripts/time-utils.ts';

const rootPagePath = resolve(process.cwd(), 'src/pages/index.astro');
const plannerPagePath = resolve(process.cwd(), 'src/pages/planner.astro');
const desktopPagePath = resolve(process.cwd(), 'src/pages/desktop.astro');

const REQUIRED_PLANNER_DOM_IDS = [
  'timeline-scroll-container',
  'timeline-rows',
  'focus-indicator',
  'current-time-line',
  'search-modal',
  'search-input',
  'search-results',
  'selected-date-label',
  'date-picker-input',
  'share-button',
  'share-toast',
  'overlap-widget',
  'calendar-dropdown-button',
  'calendar-dropdown-menu',
  'keyboard-help-modal',
  'focus-scrubber',
  'focus-time-readout',
  'app-tooltip',
  'duration-slider',
  'duration-slider-value',
  'settings-menu-button',
  'settings-dropdown',
  'reset-workspace-button',
  'reset-confirm-modal',
  'btn-confirm-cancel',
  'btn-confirm-reset',
  'workspace-toast',
  'timeline-headers'
];

const REQUIRED_PLANNER_CLASSES_AND_ATTRS = [
  'trigger-add-city',
  'duration-btn',
  'theme-btn',
  'time-format-btn',
  'export-google',
  'export-outlook',
  'export-apple',
  'export-ics'
];

describe('Website Route Boundary — Phase 1', () => {
  it('establishes a direct /planner entry point in src/pages/planner.astro', () => {
    assert.strictEqual(existsSync(plannerPagePath), true, 'src/pages/planner.astro must exist');
    const plannerSource = readFileSync(plannerPagePath, 'utf8');
    assert.ok(plannerSource.length > 0, 'src/pages/planner.astro must not be empty');
  });

  it('keeps the existing root route available in src/pages/index.astro', () => {
    assert.strictEqual(existsSync(rootPagePath), true, 'src/pages/index.astro must exist');
    const rootSource = readFileSync(rootPagePath, 'utf8');
    assert.ok(rootSource.length > 0, 'src/pages/index.astro must not be empty');
  });

  it('keeps the existing /desktop route completely unchanged and intact', () => {
    assert.strictEqual(existsSync(desktopPagePath), true, 'src/pages/desktop.astro must exist');
    const desktopSource = readFileSync(desktopPagePath, 'utf8');
    assert.match(desktopSource, /ChronosWorkspace/, 'Desktop route must render ChronosWorkspace');
    assert.match(desktopSource, /initChronosDesktop/, 'Desktop route must initialize ChronosDesktop');
  });

  it('contains all required real planner DOM hooks in /planner and /', () => {
    assert.strictEqual(existsSync(plannerPagePath), true, 'src/pages/planner.astro must exist before checking DOM hooks');

    const resolveFullSourceContent = (entryPath: string): string => {
      let accumulated = '';
      const visited = new Set<string>();

      const walk = (filePath: string) => {
        if (visited.has(filePath) || !existsSync(filePath)) return;
        visited.add(filePath);

        const content = readFileSync(filePath, 'utf8');
        accumulated += '\n' + content;

        const importMatches = content.matchAll(/import\s+[\s\S]*?from\s+['"]([^'"]+\.astro)['"]/g);
        for (const match of importMatches) {
          const importedRelative = match[1];
          const resolvedPath = resolve(filePath, '..', importedRelative);
          walk(resolvedPath);
        }
      };

      walk(entryPath);
      return accumulated;
    };

    const effectivePlannerSource = resolveFullSourceContent(plannerPagePath);
    const effectiveRootSource = resolveFullSourceContent(rootPagePath);

    for (const hookId of REQUIRED_PLANNER_DOM_IDS) {
      assert.match(
        effectivePlannerSource,
        new RegExp(`id=["']${hookId}["']`),
        `/planner must contain DOM hook ID #${hookId}`
      );
      assert.match(
        effectiveRootSource,
        new RegExp(`id=["']${hookId}["']`),
        `/ must contain DOM hook ID #${hookId}`
      );
    }

    for (const classOrAttr of REQUIRED_PLANNER_CLASSES_AND_ATTRS) {
      assert.match(
        effectivePlannerSource,
        new RegExp(classOrAttr),
        `/planner must contain class/hook ${classOrAttr}`
      );
      assert.match(
        effectiveRootSource,
        new RegExp(classOrAttr),
        `/ must contain class/hook ${classOrAttr}`
      );
    }

    // Both must bind the planner orchestrator script
    assert.match(
      effectivePlannerSource,
      /app\.ts/,
      '/planner must bind the app.ts orchestrator script'
    );
    assert.match(
      effectiveRootSource,
      /app\.ts/,
      '/ must bind the app.ts orchestrator script'
    );
  });

  it('loads realistic deterministic query parameters on a direct /planner URL', () => {
    const fixtureUrl = 'https://realtimezones.com/planner?cities=London%2CTokyo&focus=14&date=2026-09-15&duration=60&format=24h';
    const url = new URL(fixtureUrl);
    
    assert.strictEqual(url.pathname, '/planner');
    
    const parsedCities = parseSharedCityNames(url.searchParams.get('cities'));
    assert.deepStrictEqual(parsedCities, ['London', 'Tokyo']);

    const matchedCities = parsedCities.map(name => 
      cities.find(c => c.name.toLowerCase() === name.toLowerCase())
    );
    assert.strictEqual(matchedCities[0]?.name, 'London');
    assert.strictEqual(matchedCities[1]?.name, 'Tokyo');

    const focusHour = parseBoundedInteger(url.searchParams.get('focus'), 0, 23);
    assert.strictEqual(focusHour, 14);

    const dateParts = parseDateOnly(url.searchParams.get('date') || '');
    assert.deepStrictEqual(dateParts, { year: 2026, month: 9, day: 15 });

    const duration = parseBoundedInteger(url.searchParams.get('duration'), 15, 1440);
    assert.strictEqual(duration, 60);

    const format = url.searchParams.get('format');
    assert.strictEqual(format, '24h');
  });

  it('preserves meeting evaluation and recommendation calculation behavior without change', () => {
    const testDate = { year: 2026, month: 9, day: 15 };
    const slotInput: MeetingSlotInput = {
      date: testDate,
      baseTimezone: 'Europe/London',
      startMinutes: 14 * 60, // 14:00
      durationMinutes: 60,
      participants: [
        {
          timezone: 'Europe/London',
          workStartMinutes: 9 * 60,
          workEndMinutes: 17 * 60
        },
        {
          timezone: 'Asia/Tokyo',
          workStartMinutes: 9 * 60,
          workEndMinutes: 17 * 60
        }
      ]
    };

    const evaluation = evaluateMeetingSlot(slotInput);
    assert.ok(typeof evaluation.score === 'number');
    assert.ok(evaluation.score >= 0 && evaluation.score <= 100);
    assert.ok(typeof evaluation.allWorking === 'boolean');
    assert.ok(evaluation.ratings['Europe/London'] !== undefined);

    const recommendations = calculateBestMeetingSlots(
      testDate,
      60,
      'Europe/London',
      [
        {
          timezone: 'Europe/London',
          workStartMinutes: 9 * 60,
          workEndMinutes: 17 * 60
        },
        {
          timezone: 'Asia/Tokyo',
          workStartMinutes: 9 * 60,
          workEndMinutes: 17 * 60
        }
      ]
    );
    assert.ok(Array.isArray(recommendations));
    assert.ok(recommendations.length > 0);
  });

  it('preserves calendar export generation behavior without change', () => {
    const testDate = new Date('2026-09-15T14:00:00Z');
    const calendarDetails = {
      title: 'Team Sync',
      startDate: testDate,
      durationMinutes: 60,
      description: 'Discussion across timezones'
    };

    const googleUrl = generateGoogleCalendarUrl(calendarDetails);
    assert.ok(googleUrl.startsWith('https://calendar.google.com/calendar/render?action=TEMPLATE'));
    assert.ok(googleUrl.includes('20260915T140000Z'));

    const outlookUrl = generateOutlookCalendarUrl(calendarDetails);
    assert.ok(outlookUrl.startsWith('https://outlook.live.com/calendar/0/deeplink/compose'));

    const ics = generateIcsContent(calendarDetails);
    assert.ok(ics.includes('BEGIN:VCALENDAR'));
    assert.ok(ics.includes('BEGIN:VEVENT'));
    assert.ok(ics.includes('END:VCALENDAR'));
  });
});
