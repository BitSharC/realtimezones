export interface BooleanStorage {
  getItem(key: string): string | null;
}

export interface AutostartAdapter {
  isEnabled(): Promise<boolean>;
  enable(): Promise<void>;
  disable(): Promise<void>;
}

export interface AutostartSyncResult {
  success: boolean;
  enabled: boolean | null;
  error?: string;
}

export interface TrayPreferenceAdapter {
  setVisible(enabled: boolean): Promise<void>;
  setCloseToTray(enabled: boolean): Promise<void>;
}

export class DesktopSettingsOperationCoordinator {
  private generation = 0;
  private activeToken: number | null = null;
  private activeKind: 'refresh' | 'mutation' | 'initialization' | null = null;

  get busy(): boolean {
    return this.activeToken !== null;
  }

  private begin(kind: 'refresh' | 'mutation' | 'initialization'): number | null {
    if (this.busy) return null;
    this.generation += 1;
    this.activeToken = this.generation;
    this.activeKind = kind;
    return this.activeToken;
  }

  beginRefresh(): number | null {
    return this.begin('refresh');
  }

  beginMutation(): number | null {
    return this.begin('mutation');
  }

  beginInitialization(): number | null {
    return this.begin('initialization');
  }

  isCurrent(token: number): boolean {
    return token === this.generation;
  }

  private end(token: number, kind: 'refresh' | 'mutation' | 'initialization'): void {
    if (token === this.activeToken && this.activeKind === kind) {
      this.activeToken = null;
      this.activeKind = null;
    }
  }

  endRefresh(token: number): void {
    this.end(token, 'refresh');
  }

  endMutation(token: number): void {
    this.end(token, 'mutation');
  }

  endInitialization(token: number): void {
    this.end(token, 'initialization');
  }
}

export function readStoredBoolean(
  storage: BooleanStorage,
  key: string,
  defaultValue: boolean
): boolean {
  const value = storage.getItem(key);
  if (value === 'true') return true;
  if (value === 'false') return false;
  return defaultValue;
}

export function isMobilePlatform(
  userAgent: string,
  platform: string,
  maxTouchPoints: number
): boolean {
  if (/android|iphone|ipad|ipod|windows phone/i.test(`${userAgent} ${platform}`)) return true;
  return platform === 'MacIntel' && maxTouchPoints > 1;
}

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;
  return typeof error === 'string' && error ? error : 'Unknown native autostart error';
}

export function validateDesktopIntegrationSelection(
  trayEnabled: boolean,
  autostartEnabled: boolean
): { valid: true } | { valid: false; error: string } {
  if (autostartEnabled && !trayEnabled) {
    return {
      valid: false,
      error: 'Keep the system tray enabled before turning on autostart.'
    };
  }
  return { valid: true };
}

export function resolveDesktopIntegrationBootState(
  storedTrayEnabled: boolean,
  nativeAutostartEnabled: boolean | null,
  startHiddenRequested: boolean
): { trayEnabled: boolean; repairedLegacyPreference: boolean } {
  const mustPreserveTrayAccess = nativeAutostartEnabled !== false || startHiddenRequested;
  const trayEnabled = storedTrayEnabled || mustPreserveTrayAccess;
  return {
    trayEnabled,
    repairedLegacyPreference: !storedTrayEnabled && trayEnabled
  };
}

export interface TrayPreferenceOptions {
  enableCloseToTray?: boolean;
}

export async function applyTrayPreference(
  adapter: TrayPreferenceAdapter,
  enabled: boolean,
  options: TrayPreferenceOptions = {}
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    if (enabled) {
      if (options.enableCloseToTray === false) {
        await adapter.setCloseToTray(false);
      }
      await adapter.setVisible(true);
      if (options.enableCloseToTray !== false) {
        await adapter.setCloseToTray(true);
      }
    } else {
      await adapter.setCloseToTray(false);
      await adapter.setVisible(false);
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: errorMessage(error) };
  }
}

export async function syncAutostartPreference(
  adapter: AutostartAdapter,
  requestedEnabled: boolean
): Promise<AutostartSyncResult> {
  let currentEnabled = false;

  try {
    currentEnabled = await adapter.isEnabled();
    if (currentEnabled !== requestedEnabled) {
      if (requestedEnabled) {
        await adapter.enable();
      } else {
        await adapter.disable();
      }
    }

    const verifiedEnabled = await adapter.isEnabled();
    if (verifiedEnabled !== requestedEnabled) {
      return {
        success: false,
        enabled: verifiedEnabled,
        error: 'Native autostart state did not match the requested setting'
      };
    }

    return { success: true, enabled: verifiedEnabled };
  } catch (error) {
    const failure = errorMessage(error);
    try {
      const recoveredEnabled = await adapter.isEnabled();
      return {
        success: false,
        enabled: recoveredEnabled,
        error: failure
      };
    } catch {
      return {
        success: false,
        enabled: null,
        error: failure
      };
    }
  }
}
