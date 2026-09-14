export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export const MAX_STORAGE_VALUE_LENGTH = 256 * 1024;

export const APP_STORAGE_KEYS = Object.freeze([
  'workspace',
  'theme',
  'timeFormat',
  'rtz_state',
  'rtz_favorites',
  'rtz_duration',
  'rtz_format',
  'rtz-workspaces-v3',
  'rtz-active-workspace-id',
  'chronos-workspaces',
  'chronos-active-workspace-id',
  'chronos-theme',
  'chronos-work-start',
  'chronos-work-end',
  'chronos-scrub-step',
  'rtz-setting-autostart',
  'rtz-setting-menubar',
  'rtz-welcome-seen-v1',
  'rtz-intro-seen-v1'
] as const);

const APP_STORAGE_KEY_SET = new Set<string>(APP_STORAGE_KEYS);

export interface SafeStorage extends StorageLike {
  setItem(key: string, value: string): boolean;
}

const NOOP_STORAGE: StorageLike = {
  getItem: () => null,
  setItem: () => undefined,
  removeItem: () => undefined
};

export function isAppStorageKey(key: string): boolean {
  return typeof key === 'string' && APP_STORAGE_KEY_SET.has(key);
}

function isWithinValueLimit(value: string): boolean {
  return typeof value === 'string' && value.length <= MAX_STORAGE_VALUE_LENGTH;
}

/**
 * Wraps browser storage so privacy-mode/quota errors and oversized values do
 * not take down the application. Unknown keys are intentionally inaccessible.
 */
export function createSafeStorage(storage: StorageLike | null | undefined): SafeStorage {
  const source = storage ?? NOOP_STORAGE;

  return {
    getItem(key: string): string | null {
      if (!isAppStorageKey(key)) return null;
      try {
        const value = source.getItem(key);
        return value !== null && isWithinValueLimit(value) ? value : null;
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string): boolean {
      if (!isAppStorageKey(key) || !isWithinValueLimit(value)) return false;
      try {
        source.setItem(key, value);
        return true;
      } catch {
        return false;
      }
    },
    removeItem(key: string): void {
      if (!isAppStorageKey(key)) return;
      try {
        source.removeItem(key);
      } catch {
        // Storage can be unavailable in privacy mode; memory state still works.
      }
    }
  };
}

export function getBrowserStorage(): SafeStorage {
  if (typeof window === 'undefined') return createSafeStorage(null);

  try {
    return createSafeStorage(window.localStorage);
  } catch {
    return createSafeStorage(null);
  }
}

/**
 * Removes only keys owned by RealTimeZones. Other applications sharing the
 * origin are never affected by a workspace reset.
 */
export function clearAppStorage(storage: StorageLike | null | undefined): void {
  const safeStorage = createSafeStorage(storage);
  for (const key of APP_STORAGE_KEYS) {
    safeStorage.removeItem(key);
  }
}
