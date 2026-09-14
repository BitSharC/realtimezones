import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const componentSource = readFileSync(
  resolve(process.cwd(), 'src/components/desktop/ChronosWorkspace.astro'),
  'utf8'
);
const scriptSource = readFileSync(
  resolve(process.cwd(), 'src/scripts/chronos-interactions.ts'),
  'utf8'
);
const nativeSource = readFileSync(resolve(process.cwd(), 'src-tauri/src/lib.rs'), 'utf8');

describe('Desktop autostart UI integration', () => {
  it('renders autostart unchecked and exposes a live status region', () => {
    const inputTag = componentSource.match(/<input[^>]+id="setting-toggle-autostart"[^>]*>/)?.[0] ?? '';
    assert.ok(inputTag, 'autostart checkbox is missing');
    assert.doesNotMatch(inputTag, /\schecked(?:\s|>)/);
    assert.match(inputTag, /aria-describedby="setting-autostart-status"/);
    assert.match(componentSource, /id="setting-autostart-status"[^>]*aria-live="polite"/);
  });

  it('uses the verified autostart state machine and defaults missing storage to off', () => {
    assert.match(scriptSource, /syncAutostartPreference/);
    assert.match(
      scriptSource,
      /readStoredBoolean\([\s\S]*?'rtz-setting-autostart'[\s\S]*?false[\s\S]*?\)/
    );
    assert.doesNotMatch(
      scriptSource,
      /getItem\('rtz-setting-autostart'\)\s*!==\s*'false'/
    );
  });

  it('propagates native tray failures instead of reporting unconditional success', () => {
    assert.doesNotMatch(nativeSource, /let _ = tray\.set_visible/);
    assert.doesNotMatch(nativeSource, /let _ = tray\.set_tooltip/);
    assert.match(nativeSource, /tray_by_id\("main-tray"\)[\s\S]*?ok_or_else/);
    assert.match(nativeSource, /set_visible\(visible\)[\s\S]*?map_err/);
    assert.match(nativeSource, /set_tooltip\(Some\(tooltip\.clone\(\)\)\)[\s\S]*?map_err/);
  });

  it('observes tooltip and boot-time tray command failures', () => {
    assert.match(
      scriptSource,
      /invoke\('update_tray_tooltip'[\s\S]*?\.catch\([\s\S]*?getErrorMessage/
    );
    assert.match(
      scriptSource,
      /const bootState = resolveDesktopIntegrationBootState\([\s\S]*?storedMenubarEnabled[\s\S]*?nativeAutostartEnabled[\s\S]*?startHiddenRequested/
    );
    assert.match(
      scriptSource,
      /invoke<boolean>\('get_start_hidden'\)/
    );
    assert.match(
      scriptSource,
      /await applyNativeTrayPreference\(bootState\.trayEnabled\)/
    );
  });

  it('serializes production refresh, boot, and save operations', () => {
    assert.match(scriptSource, /new DesktopSettingsOperationCoordinator\(\)/);
    assert.match(scriptSource, /beginRefresh\(\)/);
    assert.match(scriptSource, /beginMutation\(\)/);
    assert.match(scriptSource, /beginInitialization\(\)/);
    assert.match(scriptSource, /endInitialization\(initializationToken\)/);
    assert.match(scriptSource, /isCurrent\(operationToken\)/);
    assert.match(scriptSource, /applyTrayPreference\(/);
    assert.match(scriptSource, /const previousMenubarEnabled/);
    assert.match(scriptSource, /const rollbackTrayPreference/);
    assert.match(scriptSource, /applyNativeTrayPreference\(isMenubarEnabled, false\)/);
    assert.match(scriptSource, /const rollbackAutostartPreference/);
    assert.match(scriptSource, /const committedTrayResult/);
  });

  it('keeps native close-to-tray disabled until frontend boot restores preferences', () => {
    assert.match(nativeSource, /let close_to_tray = Arc::new\(AtomicBool::new\(false\)\)/);
    assert.match(nativeSource, /close_to_tray_window\.store\(false, Ordering::Relaxed\)/);
    assert.match(nativeSource, /tray_operation_lock: Arc<Mutex<\(\)>>/);
    assert.match(nativeSource, /tray_visible: Arc<AtomicBool>/);
    assert.match(nativeSource, /fn set_tray_visible\([\s\S]*?state\.close_to_tray\.store\(false, Ordering::Relaxed\)[\s\S]*?tray\.set_visible\(visible\)/);
    assert.match(nativeSource, /tray\.set_visible\(visible\)[\s\S]*?if visible \{[\s\S]*?tray_visible\.store\(false, Ordering::Relaxed\)/);
    assert.match(nativeSource, /tray_operation_lock_clone\.lock\(\)[\s\S]*?close_to_tray_clone\.load/);
    assert.match(nativeSource, /set_close_to_tray\([\s\S]*?if !should_enable_close_to_tray\([\s\S]*?state\.close_to_tray\.store\(false, Ordering::Relaxed\)/);
    assert.match(nativeSource, /fn set_tray_visible\([\s\S]*?if !visible \{[\s\S]*?window[\s\S]*?\.show\(\)[\s\S]*?tray\.set_visible\(visible\)/);
    assert.match(scriptSource, /return isTauriRuntime && !isMobilePlatform\([\s\S]*?browserNavigator\?\.userAgent/);
    assert.match(nativeSource, /#\[cfg\(not\(any\(target_os = "android", target_os = "ios"\)\)\)\]/);
  });
});
