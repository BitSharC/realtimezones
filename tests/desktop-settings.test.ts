import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  DesktopSettingsOperationCoordinator,
  applyTrayPreference,
  readStoredBoolean,
  resolveDesktopIntegrationBootState,
  syncAutostartPreference,
  validateDesktopIntegrationSelection,
  isMobilePlatform,
  type AutostartAdapter,
  type TrayPreferenceAdapter
} from '../src/scripts/core/desktop-settings.ts';

function makeStorage(values: Record<string, string | null>) {
  return {
    getItem(key: string) {
      return values[key] ?? null;
    }
  };
}

describe('Desktop integration settings', () => {
  it('keeps autostart opt-in when no preference exists', () => {
    assert.strictEqual(readStoredBoolean(makeStorage({}), 'rtz-setting-autostart', false), false);
    assert.strictEqual(readStoredBoolean(makeStorage({ 'rtz-setting-autostart': 'true' }), 'rtz-setting-autostart', false), true);
    assert.strictEqual(readStoredBoolean(makeStorage({ 'rtz-setting-autostart': 'false' }), 'rtz-setting-autostart', true), false);
    assert.strictEqual(readStoredBoolean(makeStorage({ 'rtz-setting-autostart': 'invalid' }), 'rtz-setting-autostart', false), false);
  });

  it('identifies mobile Tauri platform signatures without rejecting desktop Linux', () => {
    assert.strictEqual(isMobilePlatform('Mozilla/5.0 (Linux; Android 14)', 'Linux', 0), true);
    assert.strictEqual(isMobilePlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 'iPhone', 5), true);
    assert.strictEqual(isMobilePlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)', 'MacIntel', 5), true);
    assert.strictEqual(isMobilePlatform('Mozilla/5.0 (X11; Linux x86_64)', 'Linux x86_64', 0), false);
  });
  it('prevents hidden autostart when tray access is disabled', () => {
    assert.deepStrictEqual(validateDesktopIntegrationSelection(false, true), {
      valid: false,
      error: 'Keep the system tray enabled before turning on autostart.'
    });
    assert.deepStrictEqual(validateDesktopIntegrationSelection(true, true), { valid: true });
    assert.deepStrictEqual(validateDesktopIntegrationSelection(false, false), { valid: true });
  });

  it('restores tray access when autostart, an unknown native state, or a hidden launch needs it', () => {
    assert.deepStrictEqual(resolveDesktopIntegrationBootState(false, true, false), {
      trayEnabled: true,
      repairedLegacyPreference: true
    });
    assert.deepStrictEqual(resolveDesktopIntegrationBootState(false, null, false), {
      trayEnabled: true,
      repairedLegacyPreference: true
    });
    assert.deepStrictEqual(resolveDesktopIntegrationBootState(false, false, true), {
      trayEnabled: true,
      repairedLegacyPreference: true
    });
    assert.deepStrictEqual(resolveDesktopIntegrationBootState(false, false, false), {
      trayEnabled: false,
      repairedLegacyPreference: false
    });
  });

  it('orders tray transitions so the app always retains a recovery path', async () => {
    const calls: string[] = [];
    const adapter: TrayPreferenceAdapter = {
      async setVisible(enabled) { calls.push(`visible:${enabled}`); },
      async setCloseToTray(enabled) { calls.push(`close:${enabled}`); }
    };

    assert.deepStrictEqual(await applyTrayPreference(adapter, false), { success: true });
    assert.deepStrictEqual(calls, ['close:false', 'visible:false']);

    calls.length = 0;
    assert.deepStrictEqual(
      await applyTrayPreference(adapter, true, { enableCloseToTray: false }),
      { success: true }
    );
    assert.deepStrictEqual(calls, ['close:false', 'visible:true']);
  });

  it('serializes refreshes, initialization, and saves', () => {
    const operations = new DesktopSettingsOperationCoordinator();
    const refreshToken = operations.beginRefresh();

    assert.notStrictEqual(refreshToken, null);
    assert.strictEqual(operations.beginMutation(), null);
    assert.strictEqual(operations.beginInitialization(), null);
    operations.endRefresh(refreshToken!);

    const saveToken = operations.beginMutation();
    assert.notStrictEqual(saveToken, null);
    assert.strictEqual(operations.beginRefresh(), null);
    assert.strictEqual(operations.beginMutation(), null);
    operations.endMutation(saveToken!);

    const bootToken = operations.beginInitialization();
    assert.notStrictEqual(bootToken, null);
    assert.strictEqual(operations.beginMutation(), null);
    operations.endInitialization(bootToken!);
    assert.strictEqual(operations.busy, false);
  });

  it('enables autostart only after an explicit requested state change and verifies it', async () => {
    let enabled = false;
    let enableCalls = 0;
    const adapter: AutostartAdapter = {
      async isEnabled() { return enabled; },
      async enable() { enableCalls += 1; enabled = true; },
      async disable() { enabled = false; }
    };

    const result = await syncAutostartPreference(adapter, true);

    assert.deepStrictEqual(result, { success: true, enabled: true });
    assert.strictEqual(enableCalls, 1);
  });

  it('disables an existing autostart registration and verifies it', async () => {
    let enabled = true;
    let disableCalls = 0;
    const adapter: AutostartAdapter = {
      async isEnabled() { return enabled; },
      async enable() { enabled = true; },
      async disable() { disableCalls += 1; enabled = false; }
    };

    const result = await syncAutostartPreference(adapter, false);

    assert.deepStrictEqual(result, { success: true, enabled: false });
    assert.strictEqual(disableCalls, 1);
  });

  it('does not claim success when native state cannot be changed or verified', async () => {
    const adapter: AutostartAdapter = {
      async isEnabled() { return false; },
      async enable() { throw new Error('permission denied'); },
      async disable() {}
    };

    const result = await syncAutostartPreference(adapter, true);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.enabled, false);
    assert.match(result.error ?? '', /permission denied/i);
  });

  it('re-reads native state after verification throws instead of returning stale state', async () => {
    let readCount = 0;
    let enabled = false;
    const adapter: AutostartAdapter = {
      async isEnabled() {
        readCount += 1;
        if (readCount === 2) throw new Error('verification unavailable');
        return enabled;
      },
      async enable() { enabled = true; },
      async disable() { enabled = false; }
    };

    const result = await syncAutostartPreference(adapter, true);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.enabled, true);
    assert.match(result.error ?? '', /verification unavailable/i);
  });

  it('returns an unknown state when native state cannot be recovered', async () => {
    const adapter: AutostartAdapter = {
      async isEnabled() { throw new Error('native bridge unavailable'); },
      async enable() {},
      async disable() {}
    };

    const result = await syncAutostartPreference(adapter, true);

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.enabled, null);
  });
});
