import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const workspaceSource = readFileSync(
  resolve(process.cwd(), 'src/components/desktop/ChronosWorkspace.astro'),
  'utf8'
);
const commandPaletteSource = readFileSync(
  resolve(process.cwd(), 'src/components/desktop/ChronosCommandPalette.astro'),
  'utf8'
);
const menuBarSource = readFileSync(
  resolve(process.cwd(), 'src/components/desktop/ChronosMenuBar.astro'),
  'utf8'
);
const scriptSource = readFileSync(
  resolve(process.cwd(), 'src/scripts/chronos-interactions.ts'),
  'utf8'
);

describe('Phase 3B responsive workspace integration', () => {
  it('provides responsive toolbar hooks and mobile touch targets', () => {
    assert.match(workspaceSource, /id="chronos-toolbar"/);
    assert.match(workspaceSource, /chronos-toolbar-primary/);
    assert.match(workspaceSource, /chronos-toolbar-actions/);
    assert.match(workspaceSource, /@media\s*\(max-width:\s*959px\)/);
    assert.match(workspaceSource, /#chronos-toolbar[\s\S]*?min-height:\s*44px/);
  });

  it('renders a legible scrollable timeline with responsive geometry hooks', () => {
    assert.match(workspaceSource, /#chronos-canvas-container[\s\S]*?overflow:\s*auto/);
    assert.match(workspaceSource, /\.chronos-timeline-grid[\s\S]*?min-width:\s*720px/);
    assert.match(workspaceSource, /\.chronos-city-card[\s\S]*?position:\s*sticky/);
    assert.match(scriptSource, /class="[^\"]*chronos-timeline-grid/);
    assert.match(scriptSource, /resolveTimelineGeometry/);
    assert.match(scriptSource, /canvasContainer\.scrollLeft/);
    assert.doesNotMatch(scriptSource, /const leftOffset = 280/);
  });

  it('keeps native touch panning on the canvas and touch scrubbing on the header', () => {
    assert.match(workspaceSource, /#chronos-canvas-container[\s\S]*?touch-action:\s*pan-x pan-y/);
    assert.match(workspaceSource, /#chronos-scrubber-header[\s\S]*?touch-action:\s*none/);
    assert.match(scriptSource, /shouldStartTimelineScrub\(/);
    assert.match(scriptSource, /e\.currentTarget === scrubberHeader/);
    assert.match(scriptSource, /canvasContainer\.addEventListener\('scroll'/);
  });

  it('keeps mobile dock, settings, command palette, and menu-bar surfaces within the viewport', () => {
    assert.match(workspaceSource, /chronos-settings-panel/);
    assert.match(workspaceSource, /chronos-settings-footer/);
    assert.match(workspaceSource, /chronos-dock-shell/);
    assert.match(commandPaletteSource, /chronos-command-shortcuts/);
    assert.match(commandPaletteSource, /chronos-command-footer/);
    assert.match(menuBarSource, /w-full max-w-\[360px\]/);
  });

  it('anchors toolbar popovers and enlarges planner actions on narrow touch screens', () => {
    assert.match(workspaceSource, /#chronos-workspace-dropdown[\s\S]*?position:\s*fixed/);
    assert.match(workspaceSource, /#chronos-date-dropdown[\s\S]*?right:\s*8px/);
    assert.match(workspaceSource, /#chronos-btn-add-city[\s\S]*?min-height:\s*44px/);
    assert.match(workspaceSource, /#chronos-intelligence-panel button[\s\S]*?min-height:\s*44px/);
    assert.match(workspaceSource, /#chronos-duration-slider[\s\S]*?min-height:\s*44px/);
    assert.match(
      workspaceSource,
      /#chronos-toggle-12h,[\s\S]*?#chronos-toggle-24h[\s\S]*?min-width:\s*44px/
    );
    assert.match(workspaceSource, /#chronos-omnibar-results button[\s\S]*?min-height:\s*44px/);
  });

  it('keeps planner and command surfaces inside short landscape viewports', () => {
    assert.match(workspaceSource, /@media\s*\(max-height:\s*600px\)/);
    assert.match(
      workspaceSource,
      /@media\s*\(max-height:\s*600px\)[\s\S]*?#chronos-intelligence-panel[\s\S]*?max-height:\s*calc\(100dvh\s*-\s*96px\)/
    );
    assert.match(
      workspaceSource,
      /@media\s*\(max-height:\s*600px\)[\s\S]*?#chronos-command-modal\s*>\s*div[\s\S]*?max-height:\s*calc\(100dvh\s*-\s*16px\)/
    );
  });

  it('cleans up interrupted scrubs and permits two-axis panning from city cards', () => {
    assert.match(scriptSource, /window\.addEventListener\('pointercancel',\s*stopDrag\)/);
    assert.match(scriptSource, /window\.addEventListener\('blur',\s*stopDrag\)/);
    assert.match(
      workspaceSource,
      /@media\s*\(pointer:\s*coarse\)[\s\S]*?\.chronos-city-card,[\s\S]*?touch-action:\s*pan-x\s+pan-y/
    );
  });

  it('makes city actions discoverable without hover on coarse pointers', () => {
    assert.match(workspaceSource, /@media\s*\(pointer:\s*coarse\)/);
    assert.match(workspaceSource, /\.chronos-city-card \.chronos-delete-btn[\s\S]*?visibility:\s*visible/);
    assert.match(workspaceSource, /\.chronos-delete-btn[\s\S]*?min-width:\s*44px/);
  });
});
