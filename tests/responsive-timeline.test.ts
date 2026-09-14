import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  clientXToFocusHour,
  focusHourToCenteredScrollLeft,
  focusHourToTimelinePosition,
  resolveTimelineGeometry,
  shouldStartTimelineScrub,
} from '../src/scripts/core/responsive-timeline.ts';

describe('responsive timeline geometry', () => {
  it('preserves desktop focus positioning without horizontal scrolling', () => {
    const geometry = resolveTimelineGeometry({
      viewportWidth: 1200,
      contentWidth: 1200,
      cityColumnWidth: 280,
      scrollLeft: 0,
    });

    assert.deepStrictEqual(geometry, {
      cityColumnWidth: 280,
      timelineWidth: 920,
      scrollLeft: 0,
    });
    assert.deepStrictEqual(focusHourToTimelinePosition(12, geometry), {
      contentLeft: 740,
      viewportLeft: 740,
    });
  });

  it('keeps the focus tag aligned with a horizontally scrolled mobile timeline', () => {
    const geometry = resolveTimelineGeometry({
      viewportWidth: 390,
      contentWidth: 960,
      cityColumnWidth: 240,
      scrollLeft: 300,
    });

    assert.deepStrictEqual(geometry, {
      cityColumnWidth: 240,
      timelineWidth: 720,
      scrollLeft: 300,
    });
    assert.deepStrictEqual(focusHourToTimelinePosition(12, geometry), {
      contentLeft: 600,
      viewportLeft: 300,
    });
  });

  it('centers the active hour in the visible mobile timeline while preserving the city column', () => {
    const geometry = resolveTimelineGeometry({
      viewportWidth: 390,
      contentWidth: 960,
      cityColumnWidth: 240,
      scrollLeft: 0,
    });

    assert.strictEqual(focusHourToCenteredScrollLeft(12, geometry, 390), 285);
    assert.strictEqual(
      focusHourToCenteredScrollLeft(
        12,
        resolveTimelineGeometry({
          viewportWidth: 1200,
          contentWidth: 1200,
          cityColumnWidth: 280,
          scrollLeft: 0,
        }),
        1200
      ),
      0
    );
  });

  it('maps pointer coordinates through mobile horizontal scroll and scrub precision', () => {
    const geometry = resolveTimelineGeometry({
      viewportWidth: 390,
      contentWidth: 960,
      cityColumnWidth: 240,
      scrollLeft: 300,
    });

    assert.strictEqual(
      clientXToFocusHour({
        clientX: 300,
        containerLeft: 0,
        geometry,
        stepMinutes: 15,
      }),
      12
    );
  });

  it('allows native touch panning on the canvas but touch scrubbing on the scrubber', () => {
    assert.strictEqual(shouldStartTimelineScrub('touch', false), false);
    assert.strictEqual(shouldStartTimelineScrub('touch', true), true);
    assert.strictEqual(shouldStartTimelineScrub('mouse', false), true);
    assert.strictEqual(shouldStartTimelineScrub('', false), true);
  });
});
