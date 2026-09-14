// Chronos Desktop Prototype - Unified Raycast Quick Action Launcher, Workspaces Management, Meeting Quality & Export Engine

import {
  type DateParts,
  getTodayDateParts,
  datePartsToInstant,
  addCalendarDays,
  isInvalidCivilTimeError
} from './core/date-only.ts';
import {
  getTimezoneOffsetMinutes,
  getRelativeOffsetHours as getCoreRelativeOffsetHours,
  getLocalTimeForDateParts
} from './core/timezone-engine.ts';
import {
  type ParticipantWorkHours,
  calculateBestMeetingSlots,
  evaluateMeetingSlot
} from './core/meeting-intelligence.ts';
import {
  getCanonicalCities,
  toChronosCityTime
} from './core/city-registry.ts';
import {
  escapeHtml,
  parseAndValidateWorkspaceJson,
  MAX_WORKSPACE_JSON_BYTES
} from './core/workspace-validator.ts';
import {
  sanitizeCalendarFilename
} from './core/calendar-filename.ts';
import {
  DesktopSettingsOperationCoordinator,
  applyTrayPreference,
  readStoredBoolean,
  resolveDesktopIntegrationBootState,
  syncAutostartPreference,
  validateDesktopIntegrationSelection,
  isMobilePlatform,
  type AutostartAdapter
} from './core/desktop-settings.ts';
import {
  clientXToFocusHour,
  focusHourToCenteredScrollLeft,
  focusHourToTimelinePosition,
  resolveTimelineGeometry,
  shouldStartTimelineScrub,
  type TimelineGeometry
} from './core/responsive-timeline.ts';
import {
  getBrowserStorage
} from './core/safe-storage.ts';
import { parseBoundedInteger } from './core/url-input.ts';

import { escapeIcsText } from './time-utils.ts';
import { openAllowedExternalCalendarUrl } from './core/external-url.ts';

const storage = getBrowserStorage();

export interface CityTime {
  id: string;
  name: string;
  country: string;
  flag: string;
  timezone: string;
  offsetHours: number; // relative to London (Base: Europe/London, GMT+1)
  badge: string;
  statusLabel: string;
  isBase?: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  cities: CityTime[];
}

// Canonical Global Cities Dataset across all 7 Continents
export const POPULAR_AVAILABLE_CITIES: CityTime[] = getCanonicalCities().map((c) =>
  toChronosCityTime(c, c.id === 'lon')
);

export function detectUserLocalCity(): CityTime {
  try {
    const userTz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata';
    if (userTz) {
      // 1. Normalized alias mappings
      let normalizedTz = userTz;
      if (userTz === 'Asia/Calcutta') normalizedTz = 'Asia/Kolkata';
      if (userTz === 'Europe/Belfast') normalizedTz = 'Europe/London';

      // 2. Exact timezone match in dataset
      const exactMatch = POPULAR_AVAILABLE_CITIES.find(
        (c) => c.timezone.toLowerCase() === normalizedTz.toLowerCase()
      );
      if (exactMatch) {
        return {
          ...exactMatch,
          offsetHours: 0,
          badge: 'Base',
          isBase: true,
          statusLabel: getCityStatusLabel(exactMatch.timezone),
        };
      }

      // 3. City name segment from timezone string
      const parts = normalizedTz.split('/');
      const rawCity = parts[parts.length - 1].replace(/_/g, ' ');

      const fuzzyMatch = POPULAR_AVAILABLE_CITIES.find(
        (c) =>
          c.timezone.toLowerCase().includes(rawCity.toLowerCase()) ||
          c.name.toLowerCase().includes(rawCity.toLowerCase())
      );
      if (fuzzyMatch) {
        return {
          ...fuzzyMatch,
          offsetHours: 0,
          badge: 'Base',
          isBase: true,
          statusLabel: getCityStatusLabel(fuzzyMatch.timezone),
        };
      }

      // 4. Country Flag heuristic
      let flag = '📍';
      if (normalizedTz.startsWith('Asia/Kolkata') || normalizedTz.startsWith('Asia/Calcutta')) flag = '🇮🇳';
      else if (normalizedTz.startsWith('America/')) flag = '🇺🇸';
      else if (normalizedTz.startsWith('Europe/London')) flag = '🇬🇧';
      else if (normalizedTz.startsWith('Europe/')) flag = '🇪🇺';
      else if (normalizedTz.startsWith('Asia/Tokyo')) flag = '🇯🇵';
      else if (normalizedTz.startsWith('Australia/')) flag = '🇦🇺';

      const region = parts[0] || 'Local';
      return {
        id: 'local-home',
        name: rawCity || 'Your Location',
        country: region,
        flag: flag,
        timezone: userTz,
        offsetHours: 0,
        badge: 'Base',
        statusLabel: getCityStatusLabel(userTz),
        isBase: true,
      };
    }
  } catch (_) {}

  // Safe fallback default (Mumbai)
  return { id: 'bom', name: 'Mumbai', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 0, badge: 'Base', statusLabel: 'IST, GMT+5:30', isBase: true };
}

let WORKSPACES: Workspace[] = [
  {
    id: 'ws-main',
    name: 'My Workspace',
    cities: [
      { id: 'bom', name: 'Mumbai', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', offsetHours: 0, badge: 'Base', statusLabel: 'IST, GMT+5:30', isBase: true },
    ],
  },
];

let activeWorkspaceId = 'ws-main';

export function getActiveWorkspace(): Workspace {
  const ws = WORKSPACES.find((w) => w.id === activeWorkspaceId);
  if (ws) return ws;
  if (WORKSPACES.length > 0) return WORKSPACES[0];
  return {
    id: 'ws-main',
    name: 'My Workspace',
    cities: [detectUserLocalCity()],
  };
}

export function getTzOffsetMinutes(timeZone?: string, date: Date = new Date()): number {
  if (!timeZone) return 0;
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: timeZone,
      year: 'numeric',
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(date);
    const getVal = (type: string) => parseInt(parts.find((p) => p.type === type)?.value || '0', 10);

    const year = getVal('year');
    const month = getVal('month') - 1;
    const day = getVal('day');
    let hour = getVal('hour');
    if (hour === 24) hour = 0;
    const minute = getVal('minute');
    const second = getVal('second');

    const tzDateAsUtc = Date.UTC(year, month, day, hour, minute, second);
    const realUtc = date.getTime() - date.getMilliseconds();
    return Math.round((tzDateAsUtc - realUtc) / 60000);
  } catch (_) {
    return 0;
  }
}

export function getBaseCity(ws?: Workspace): CityTime {
  const activeWs = ws || getActiveWorkspace();
  if (activeWs && activeWs.cities && activeWs.cities.length > 0) {
    const found = activeWs.cities.find((c) => c.isBase);
    if (found) return found;
    return activeWs.cities[0];
  }
  return detectUserLocalCity();
}

let currentActiveDateParts: DateParts = getTodayDateParts();
let currentFocusHour: number = 12;

export function getCityLocalTimeForBaseMinutes(
  city: CityTime,
  baseCity: CityTime,
  date: DateParts,
  baseMinutes: number
) {
  return getLocalTimeForDateParts(
    city.timezone,
    baseCity.timezone,
    date,
    baseMinutes
  );
}

export function getCityRelativeOffsetHours(
  city: CityTime,
  baseCity?: CityTime,
  dateOrParts?: Date | DateParts,
  startMinutes?: number
): number {
  if (!city) return 0;
  const base = baseCity || getBaseCity();
  if (!base || !city.timezone || !base.timezone || city.id === base.id || city.timezone === base.timezone) {
    return 0;
  }
  const effectiveDate = dateOrParts || currentActiveDateParts;
  const effectiveMins = typeof startMinutes === 'number' ? startMinutes : currentFocusHour * 60;
  return getCoreRelativeOffsetHours(city.timezone, base.timezone, effectiveDate, effectiveMins);
}

export function formatOffsetBadge(offsetHours: number, isBase: boolean = false): string {
  if (isBase || Math.abs(offsetHours) < 0.01) return 'Base';
  const sign = offsetHours > 0 ? '+' : '-';
  const absHours = Math.abs(offsetHours);
  const h = Math.floor(absHours);
  const m = Math.round((absHours - h) * 60);
  if (m === 0) return `${sign}${h}h`;
  return `${sign}${h}:${m.toString().padStart(2, '0')}h`;
}

export function getCityOffsetBadgeForBaseMinutes(
  city: CityTime,
  baseCity: CityTime,
  date: DateParts,
  baseMinutes: number,
  isBase: boolean = false
): string {
  if (isBase || city.id === baseCity.id || city.timezone === baseCity.timezone) return 'Base';

  try {
    return formatOffsetBadge(
      getCityRelativeOffsetHours(city, baseCity, date, baseMinutes),
      false
    );
  } catch (error) {
    if (isInvalidCivilTimeError(error)) return 'DST unavailable';
    throw error;
  }
}

export function getCityStatusLabel(
  timeZone?: string,
  dateOrParts?: Date | DateParts,
  baseTimezone?: string
): string {
  if (!timeZone) return 'GMT';
  try {
    const effectiveDate = dateOrParts || currentActiveDateParts;
    const focusMinutes = Math.min(1439, Math.max(0, Math.round(currentFocusHour * 60)));
    const instant = effectiveDate instanceof Date
      ? effectiveDate
      : datePartsToInstant(
          effectiveDate,
          Math.floor(focusMinutes / 60),
          focusMinutes % 60,
          baseTimezone || timeZone
        );

    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      timeZoneName: 'short',
    });
    const parts = formatter.formatToParts(instant);
    const tzName = parts.find((p) => p.type === 'timeZoneName')?.value || '';
    const offsetMin = getTimezoneOffsetMinutes(timeZone, instant);
    const sign = offsetMin >= 0 ? '+' : '-';
    const absMin = Math.abs(offsetMin);
    const h = Math.floor(absMin / 60);
    const m = absMin % 60;
    const gmtStr = m === 0 ? `GMT${sign}${h}` : `GMT${sign}${h}:${m.toString().padStart(2, '0')}`;
    return tzName ? `${tzName}, ${gmtStr}` : gmtStr;
  } catch (error) {
    return isInvalidCivilTimeError(error) ? 'DST unavailable' : 'GMT';
  }
}
let selectedMeetingDurationMinutes = 60;
let isIntelligenceDockOpen = false;

export function getManualDateSelectionState(parts: DateParts) {
  const dateParts = { ...parts };
  return {
    dateParts,
    displayDate: new Date(dateParts.year, dateParts.month - 1, dateParts.day, 12, 0, 0, 0),
    isLiveSync: false as const,
  };
}

// Keyboard navigation indexes
let focusedWsIndex = 0;
let focusedOmniIndex = 0;

// Settings & Preferences State (Persisted in storage)
const CHRONOS_THEMES = new Set(['midnight', 'oled', 'slate', 'charcoal']);

function readStoredHour(key: string, fallback: number): number {
  const raw = storage.getItem(key);
  if (!raw || !/^\d+(?:\.\d+)?$/.test(raw)) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 && value < 24 ? value : fallback;
}

function readStoredStep(key: string, fallback: number): number {
  return parseBoundedInteger(storage.getItem(key), 1, 120) ?? fallback;
}

const storedTheme = storage.getItem('chronos-theme');
let currentTheme = storedTheme && CHRONOS_THEMES.has(storedTheme) ? storedTheme : 'midnight';
let workStartHour = readStoredHour('chronos-work-start', 8);
let workEndHour = readStoredHour('chronos-work-end', 18);
let scrubStepMinutes = readStoredStep('chronos-scrub-step', 15);

export function initChronosDesktop() {
  const now = new Date();
  let is24Hour = true;
  let isLiveSync = true;
  let activeSelectedDate = now.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Load or initialize workspaces
  if (typeof window !== 'undefined') {
    const savedWs = storage.getItem('rtz-workspaces-v3');
    if (savedWs) {
      try {
        const valResult = parseAndValidateWorkspaceJson(savedWs);
        if (valResult.success && valResult.workspaces && valResult.workspaces.length > 0) {
          WORKSPACES = valResult.workspaces;
          const savedActiveId = storage.getItem('rtz-active-workspace-id');
          if (savedActiveId && WORKSPACES.some((w) => w.id === savedActiveId)) {
            activeWorkspaceId = savedActiveId;
          } else {
            activeWorkspaceId = WORKSPACES[0].id;
          }

          // If active workspace is empty, auto-seed with detected local city
          const currentWs = WORKSPACES.find((w) => w.id === activeWorkspaceId);
          if (currentWs && currentWs.cities.length === 0) {
            currentWs.cities = [detectUserLocalCity()];
            saveWorkspacesToStorage();
          }
        }
      } catch (_) {}
    } else {
      // Clean First-Time Launch: Only the user's detected live location, pristine empty workspace
      const localBaseCity = detectUserLocalCity();
      WORKSPACES = [
        {
          id: 'ws-main',
          name: 'My Workspace',
          cities: [localBaseCity],
        },
      ];
      activeWorkspaceId = 'ws-main';
      saveWorkspacesToStorage();
    }
  }

  // Determine base city and current live focus hour
  const baseCity = getBaseCity();
  const initFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: baseCity.timezone || 'Asia/Kolkata',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  });
  const initParts = initFormatter.formatToParts(now);
  let initH = parseInt(initParts.find((p) => p.type === 'hour')?.value || '0', 10);
  if (initH === 24) initH = 0;
  const initM = parseInt(initParts.find((p) => p.type === 'minute')?.value || '0', 10);
  let focusHour = initH + initM / 60;

  // DOM elements
  const scrubberLine = document.getElementById('chronos-focus-line');
  const scrubberTag = document.getElementById('chronos-focus-tag');
  const scrubberHeader = document.getElementById('chronos-scrubber-header');
  const canvasContainer = document.getElementById('chronos-canvas-container');
  const cityRowsContainer = document.getElementById('chronos-city-rows');
  const emptyStateEl = document.getElementById('chronos-empty-state');
  const sliderScrubber = document.getElementById('chronos-slider-scrubber') as HTMLInputElement | null;
  const toggle24hBtn = document.getElementById('chronos-toggle-24h');
  const toggle12hBtn = document.getElementById('chronos-toggle-12h');
  const copySlotBtn = document.getElementById('chronos-copy-slot');
  const btnNow = document.getElementById('chronos-btn-now');
  const overlapTextEl = document.getElementById('chronos-overlap-text');
  const overlapDotEl = document.getElementById('chronos-overlap-dot');

  // Intelligence Dock DOM
  const intelligencePanel = document.getElementById('chronos-intelligence-panel');
  const toggleIntelligenceBtn = document.getElementById('chronos-toggle-intelligence');
  const dockChevron = document.getElementById('chronos-dock-chevron');
  const qualityStars = document.getElementById('chronos-quality-stars');
  const qualityBadge = document.getElementById('chronos-quality-badge');
  const qualityTitle = document.getElementById('chronos-quality-title');
  const qualityDesc = document.getElementById('chronos-quality-desc');
  const durationBadge = document.getElementById('chronos-selected-duration-badge');
  const durationPillsContainer = document.getElementById('chronos-duration-pills');
  const durationSlider = document.getElementById('chronos-duration-slider') as HTMLInputElement | null;
  const durationTextInput = document.getElementById('chronos-duration-text') as HTMLInputElement | null;
  const recPillsContainer = document.getElementById('chronos-recommendation-pills');
  const shareBtn = document.getElementById('chronos-btn-share');

  // Calendar Dropdown DOM
  const calendarSelectBtn = document.getElementById('chronos-calendar-select-btn');
  const calendarDropdownMenu = document.getElementById('chronos-calendar-dropdown-menu');
  const calChevron = document.getElementById('chronos-cal-chevron');
  const exportGoogleBtn = document.getElementById('chronos-export-google');
  const exportOutlookBtn = document.getElementById('chronos-export-outlook');
  const exportAppleBtn = document.getElementById('chronos-export-apple');
  const exportIcsFileBtn = document.getElementById('chronos-export-ics-file');

  // Workspace Dropdown DOM
  const workspaceBtn = document.getElementById('chronos-workspace-btn');
  const workspaceDropdown = document.getElementById('chronos-workspace-dropdown');
  const workspaceListEl = document.getElementById('chronos-workspace-list');
  const workspaceNameEl = document.getElementById('chronos-workspace-name');
  const workspaceChevron = document.getElementById('chronos-workspace-chevron');

  // Create Workspace Modal DOM
  const btnCreateWs = document.getElementById('chronos-create-workspace-btn');
  const newWsModal = document.getElementById('chronos-new-workspace-modal');
  const closeWsModalBtn = document.getElementById('chronos-close-ws-modal');
  const cancelWsBtn = document.getElementById('chronos-cancel-ws-btn');
  const saveWsBtn = document.getElementById('chronos-save-ws-btn');
  const newWsNameInput = document.getElementById('chronos-new-ws-name') as HTMLInputElement | null;

  // Edit/Rename Workspace Modal DOM
  const editWsModal = document.getElementById('chronos-edit-workspace-modal');
  const closeEditWsModalBtn = document.getElementById('chronos-close-edit-ws-modal');
  const cancelEditWsBtn = document.getElementById('chronos-cancel-edit-ws-btn');
  const saveEditWsBtn = document.getElementById('chronos-save-edit-ws-btn');
  const editWsIdInput = document.getElementById('chronos-edit-ws-id') as HTMLInputElement | null;
  const editWsNameInput = document.getElementById('chronos-edit-ws-name') as HTMLInputElement | null;

  // Date Selector & Calendar DOM
  const dateBtn = document.getElementById('chronos-date-btn');
  const dateDropdown = document.getElementById('chronos-date-dropdown');
  const currentDateLabel = document.getElementById('chronos-current-date-label');
  const calendarDaysContainer = document.getElementById('chronos-calendar-days');
  const calMonthSelect = document.getElementById('chronos-cal-month-select') as HTMLSelectElement | null;
  const calYearSelect = document.getElementById('chronos-cal-year-select') as HTMLSelectElement | null;
  const calPrevMonthBtn = document.getElementById('chronos-cal-prev-month');
  const calNextMonthBtn = document.getElementById('chronos-cal-next-month');
  const calTodayBtn = document.getElementById('chronos-cal-today');
  const calTomorrowBtn = document.getElementById('chronos-cal-tomorrow');
  const calNextWeekBtn = document.getElementById('chronos-cal-next-week');

  // Settings Modal DOM
  const settingsBtn = document.getElementById('chronos-btn-settings');
  const settingsModal = document.getElementById('chronos-settings-modal');
  const closeSettingsBtn = document.getElementById('chronos-close-settings-btn');
  const cancelSettingsBtn = document.getElementById('chronos-btn-cancel-settings');
  const saveSettingsBtn = document.getElementById('chronos-btn-save-settings');
  const resetDefaultsBtn = document.getElementById('chronos-btn-reset-defaults');
  const themeOptionsContainer = document.getElementById('chronos-theme-options');
  const settingWorkStartText = document.getElementById('chronos-setting-work-start-text') as HTMLInputElement | null;
  const settingWorkEndText = document.getElementById('chronos-setting-work-end-text') as HTMLInputElement | null;
  const stepOptionsContainer = document.getElementById('chronos-step-options');
  const settingStepCustom = document.getElementById('chronos-setting-step-custom') as HTMLInputElement | null;
  const exportJsonBtn = document.getElementById('chronos-btn-export-json');
  const importJsonInput = document.getElementById('chronos-input-import-json') as HTMLInputElement | null;
  const settingToggleMenubar = document.getElementById('setting-toggle-menubar') as HTMLInputElement | null;
  const settingToggleAutostart = document.getElementById('setting-toggle-autostart') as HTMLInputElement | null;
  const settingAutostartStatus = document.getElementById('setting-autostart-status');

  // Unified Raycast Omnibar Modal DOM
  const commandPaletteModal = document.getElementById('chronos-command-modal');
  const commandInput = document.getElementById('chronos-command-input') as HTMLInputElement | null;
  const omnibarResults = document.getElementById('chronos-omnibar-results');
  const closeCmdBtn = document.getElementById('chronos-close-cmd');

  const btnAddCity = document.getElementById('chronos-btn-add-city');
  const btnAddCityEmpty = document.getElementById('chronos-btn-add-city-empty');

  // Menu Bar Companion DOM Elements
  const menubarWsName = document.getElementById('menubar-ws-name');
  const menubarCitiesList = document.getElementById('menubar-cities-list');
  const menubarOverlapText = document.getElementById('menubar-overlap-text');
  const menubarOverlapBar = document.getElementById('menubar-overlap-bar');
  const menubarBtnCopy = document.getElementById('menubar-btn-copy-overlap');
  const menubarCopyLabel = document.getElementById('menubar-copy-label');
  const menubarBtnAdd = document.getElementById('menubar-btn-add');
  const menubarBtnExpand = document.getElementById('menubar-btn-expand');
  const menubarOverlay = document.getElementById('view-menubar-overlay');
  const btnToggleMenubar = document.getElementById('chronos-btn-toggle-menubar-view');

  // Welcome / Onboarding Modal DOM
  const welcomeModal = document.getElementById('chronos-welcome-modal');
  const welcomeStartBtn = document.getElementById('chronos-btn-welcome-start');
  const welcomeSkipBtn = document.getElementById('chronos-btn-welcome-skip');
  const welcomeGuideBtn = document.getElementById('chronos-btn-open-welcome-guide');
  const welcomeBaseCityName = document.getElementById('welcome-base-city-name');
  const welcomeBaseCityTz = document.getElementById('welcome-base-city-tz');

  // First-Run Intro Splash DOM
  const introSplash = document.getElementById('chronos-intro-splash');

  function showToast(_message: string) {
    // Disabled toast popup per user request
  }

  function fallbackCopy(text: string): boolean {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    try {
      return document.execCommand('copy');
    } catch (err) {
      console.error('Fallback copy error', err);
      return false;
    } finally {
      document.body.removeChild(textArea);
    }
  }

  function copyToClipboard(text: string): Promise<boolean> {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text).then(() => true).catch(() => fallbackCopy(text));
    }
    return Promise.resolve(fallbackCopy(text));
  }

  const AUTOSTART_STORAGE_KEY = 'rtz-setting-autostart';
  const desktopSettingsOperations = new DesktopSettingsOperationCoordinator();
  let autostartControlAvailable = false;

  function setDesktopSettingsBusy(busy: boolean) {
    if (saveSettingsBtn instanceof HTMLButtonElement) saveSettingsBtn.disabled = busy;
    if (settingToggleMenubar) settingToggleMenubar.disabled = busy;
    if (settingToggleAutostart) {
      settingToggleAutostart.disabled = busy || !autostartControlAvailable;
    }
  }

  function isNativeDesktopRuntime(): boolean {
    const runtimeWindow = window as typeof window & {
      __TAURI__?: unknown;
      __TAURI_INTERNALS__?: unknown;
    };
    const browserNavigator = typeof navigator !== 'undefined' ? navigator : null;
    const isTauriRuntime = Boolean(runtimeWindow.__TAURI__ || runtimeWindow.__TAURI_INTERNALS__);
    return isTauriRuntime && !isMobilePlatform(
      browserNavigator?.userAgent ?? '',
      browserNavigator?.platform ?? '',
      browserNavigator?.maxTouchPoints ?? 0
    );
  }

  function getErrorMessage(error: unknown): string {
    if (error instanceof Error && error.message) return error.message;
    return typeof error === 'string' && error ? error : 'Unknown native integration error';
  }

  function setAutostartStatus(
    message: string,
    tone: 'muted' | 'success' | 'error' | 'pending' = 'muted'
  ) {
    if (!settingAutostartStatus) return;
    settingAutostartStatus.textContent = message;
    settingAutostartStatus.classList.remove(
      'text-zinc-500',
      'text-emerald-400',
      'text-rose-400',
      'text-amber-400'
    );
    settingAutostartStatus.classList.add(
      tone === 'success'
        ? 'text-emerald-400'
        : tone === 'error'
          ? 'text-rose-400'
          : tone === 'pending'
            ? 'text-amber-400'
            : 'text-zinc-500'
    );
  }

  async function getAutostartAdapter(): Promise<AutostartAdapter | null> {
    if (!isNativeDesktopRuntime()) return null;
    const autostart = await import('@tauri-apps/plugin-autostart');
    return {
      isEnabled: autostart.isEnabled,
      enable: autostart.enable,
      disable: autostart.disable
    };
  }

  async function refreshAutostartState() {
    if (!settingToggleAutostart) return;
    const operationToken = desktopSettingsOperations.beginRefresh();
    if (operationToken === null) return;
    setDesktopSettingsBusy(true);

    const storedEnabled = readStoredBoolean(storage, AUTOSTART_STORAGE_KEY, false);
    settingToggleAutostart.checked = storedEnabled;

    try {
      const adapter = await getAutostartAdapter();
      if (!desktopSettingsOperations.isCurrent(operationToken)) return;
      if (!adapter) {
        autostartControlAvailable = false;
        settingToggleAutostart.checked = false;
        setAutostartStatus('Available in the installed desktop app', 'muted');
        return;
      }

      const nativeEnabled = await adapter.isEnabled();
      if (!desktopSettingsOperations.isCurrent(operationToken)) return;
      autostartControlAvailable = true;
      settingToggleAutostart.checked = nativeEnabled;
      storage.setItem(AUTOSTART_STORAGE_KEY, nativeEnabled.toString());
      setAutostartStatus(
        nativeEnabled ? 'Enabled — starts quietly at login' : 'Off — the app will not launch at login',
        nativeEnabled ? 'success' : 'muted'
      );
    } catch (error) {
      if (!desktopSettingsOperations.isCurrent(operationToken)) return;
      autostartControlAvailable = false;
      setAutostartStatus(`Unable to read native autostart state: ${getErrorMessage(error)}`, 'error');
    } finally {
      desktopSettingsOperations.endRefresh(operationToken);
      setDesktopSettingsBusy(false);
    }
  }

  async function applyNativeTrayPreference(
    enabled: boolean,
    enableCloseToTray = true
  ): Promise<{ success: boolean; error?: string }> {
    if (!isNativeDesktopRuntime()) return { success: true };
    try {
      const { invoke } = await import('@tauri-apps/api/core');
      return applyTrayPreference(
        {
          setVisible: (visible) => invoke('set_tray_visible', { visible }),
          setCloseToTray: (closeToTrayEnabled) =>
            invoke('set_close_to_tray', { enabled: closeToTrayEnabled })
        },
        enabled,
        { enableCloseToTray }
      );
    } catch (error) {
      return { success: false, error: getErrorMessage(error) };
    }
  }

  function formatTime(hourFloat: number, is24: boolean): string {
    const normalized = ((hourFloat % 24) + 24) % 24;
    const h = Math.floor(normalized);
    const m = Math.round((normalized - h) * 60);
    const paddedM = m.toString().padStart(2, '0');
    if (is24) {
      return `${h.toString().padStart(2, '0')}:${paddedM}`;
    }
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    return `${displayH.toString().padStart(2, '0')}:${paddedM} ${period}`;
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) return `${minutes}m`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  function parseDurationString(text: string): number | null {
    const cleaned = text.trim().toLowerCase();
    if (!cleaned) return null;

    if (/^\d+$/.test(cleaned)) {
      return parseInt(cleaned, 10);
    }

    const decimalHours = cleaned.match(/^(\d+(?:\.\d+)?)h?$/);
    if (decimalHours && cleaned.includes('.')) {
      return Math.round(parseFloat(decimalHours[1]) * 60);
    }

    let total = 0;
    const hMatch = cleaned.match(/(\d+)\s*h/);
    const mMatch = cleaned.match(/(\d+)\s*m/);

    if (hMatch) total += parseInt(hMatch[1], 10) * 60;
    if (mMatch) total += parseInt(mMatch[1], 10);

    return total > 0 ? total : null;
  }

  function getFocusBaseMinutes(): number {
    return Math.min(1439, Math.max(0, Math.round(focusHour * 60)));
  }

  function projectAtFocus(city: CityTime, baseCity: CityTime, baseMinutes = getFocusBaseMinutes()) {
    try {
      return getCityLocalTimeForBaseMinutes(city, baseCity, currentActiveDateParts, baseMinutes);
    } catch (error) {
      if (isInvalidCivilTimeError(error)) return null;
      throw error;
    }
  }

  function rebaseFocusToNewBase(newBaseCity: CityTime, oldBaseCity: CityTime) {
    const projected = projectAtFocus(newBaseCity, oldBaseCity);
    if (!projected) return;

    focusHour = projected.hour + projected.minute / 60;
    currentFocusHour = focusHour;
    currentActiveDateParts = { ...projected.date };
    selectedDateObj = datePartsToDisplayDate(projected.date);
    calendarViewDate = datePartsToDisplayDate(projected.date);
    activeSelectedDate = formatDateToPill(selectedDateObj);
    if (currentDateLabel) currentDateLabel.textContent = activeSelectedDate;
  }

  function getHourStatusClass(localHour: number): string {
    if (localHour >= workStartHour && localHour < workEndHour) {
      return 'bg-emerald-950/40 border-r border-emerald-900/30 hover:bg-emerald-900/60';
    }
    const borderMorningStart = Math.max(0, workStartHour - 2);
    const borderEveningEnd = Math.min(24, workEndHour + 4);
    if ((localHour >= borderMorningStart && localHour < workStartHour) || (localHour >= workEndHour && localHour < borderEveningEnd)) {
      return 'bg-amber-950/30 border-r border-amber-900/25 hover:bg-amber-900/50';
    }
    return 'bg-[#08080b] border-r border-[#14141a] hover:bg-zinc-900/60';
  }

  function getContextualTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 8) return 'starting their day';
    if (hour >= 8 && hour < 12) return 'in morning hours';
    if (hour >= 12 && hour < 17) return 'in afternoon hours';
    if (hour >= 17 && hour < 19) return 'approaching evening';
    if (hour >= 19 && hour < 22) return 'winding down their day';
    return 'sleeping'; // 22:00 to 05:59
  }

  // --- Official Website Scoring & Recommendations Algorithm ---
  function calculateBestTimes(): { hour: number; score: number; numWorking: number }[] {
    const ws = getActiveWorkspace();
    const baseCity = getBaseCity(ws);
    const participants: ParticipantWorkHours[] = ws.cities.map((c) => ({
      timezone: c.timezone,
      workStartMinutes: workStartHour * 60,
      workEndMinutes: workEndHour * 60,
    }));

    const best = calculateBestMeetingSlots(
      currentActiveDateParts,
      selectedMeetingDurationMinutes,
      baseCity.timezone,
      participants,
      3
    );

    return best.map((b) => ({
      hour: b.startHour,
      score: b.score,
      numWorking: b.numWorking,
    }));
  }

  function renderUnavailableMeetingQuality() {
    if (qualityStars) qualityStars.textContent = '☆☆☆☆☆';
    if (qualityBadge) {
      qualityBadge.textContent = 'UNAVAILABLE';
      qualityBadge.className = 'text-[10px] font-mono px-2 py-0.5 rounded border font-semibold bg-zinc-500/15 text-zinc-400 border-zinc-500/30';
    }
    if (qualityTitle) {
      qualityTitle.textContent = 'Selected local time is unavailable.';
    }
    if (qualityDesc) {
      qualityDesc.textContent = 'This start time is skipped by a daylight-saving transition. Choose another start time before scheduling.';
    }
    if (recPillsContainer) {
      recPillsContainer.innerHTML = '<span class="text-xs text-zinc-500 font-mono py-1">Choose another start time to view recommendations</span>';
    }
    if (overlapDotEl) {
      overlapDotEl.className = 'w-2 h-2 rounded-full bg-zinc-500';
    }
    if (overlapTextEl) {
      overlapTextEl.textContent = 'Unavailable: choose another start time';
    }
  }

  // Update Meeting Quality, Recommendations & Bottom Pill
  function updateMeetingQuality() {
    const ws = getActiveWorkspace();
    if (ws.cities.length === 0) return;
    const baseCity = getBaseCity(ws);

    const startMins = getFocusBaseMinutes();
    let slotEval: ReturnType<typeof evaluateMeetingSlot>;
    try {
      slotEval = evaluateMeetingSlot({
        date: currentActiveDateParts,
        baseTimezone: baseCity.timezone,
        startMinutes: startMins,
        durationMinutes: selectedMeetingDurationMinutes,
        participants: ws.cities.map((c) => ({
          timezone: c.timezone,
          workStartMinutes: workStartHour * 60,
          workEndMinutes: workEndHour * 60,
        })),
      });
    } catch (error) {
      if (!isInvalidCivilTimeError(error)) {
        throw error;
      }
      renderUnavailableMeetingQuality();
      return;
    }

    const numWorking = slotEval.numWorking;
    const nonWorkingDetails: string[] = [];

    ws.cities.forEach((c) => {
      const rating = slotEval.ratings[c.timezone];
      if (rating !== 'working') {
        const projected = getCityLocalTimeForBaseMinutes(
          c,
          baseCity,
          currentActiveDateParts,
          startMins
        );
        const localHourFloat = projected.hour + projected.minute / 60;
        const localHour = projected.hour;
        const formattedLocal = formatTime(localHourFloat, is24Hour);
        const phrase = getContextualTimeOfDay(localHour);
        nonWorkingDetails.push(`${c.name} is ${phrase} (${formattedLocal})`);
      }
    });

    const total = ws.cities.length;
    const score = slotEval.score;

    let stars = 3;
    let label = 'Fair';
    let badgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';

    if (numWorking === total) {
      stars = 5;
      label = 'EXCELLENT';
      badgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    } else if (score >= 80) {
      stars = 4;
      label = 'GREAT';
      badgeClass = 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
    } else if (score >= 60 && numWorking > 0) {
      stars = 3;
      label = 'FAIR';
      badgeClass = 'bg-amber-500/15 text-amber-400 border-amber-500/30';
    } else if (score >= 35) {
      stars = 2;
      label = 'POOR';
      badgeClass = 'bg-orange-500/15 text-orange-400 border-orange-500/30';
    } else {
      stars = 1;
      label = 'AVOID';
      badgeClass = 'bg-red-500/15 text-red-400 border-red-500/30';
    }

    let starsStr = '';
    for (let i = 0; i < 5; i++) starsStr += i < stars ? '★' : '☆';

    if (qualityStars) qualityStars.textContent = starsStr;
    if (qualityBadge) {
      qualityBadge.textContent = label;
      qualityBadge.className = `text-[10px] font-mono px-2 py-0.5 rounded border font-semibold ${badgeClass}`;
    }
    if (qualityTitle) {
      qualityTitle.textContent = `${numWorking} of ${total} participant${total > 1 ? 's' : ''} inside working hours.`;
    }
    if (qualityDesc) {
      qualityDesc.textContent =
        nonWorkingDetails.length > 0
          ? nonWorkingDetails.join(', ') + '.'
          : 'All participants are inside optimal working hours.';
    }

    // --- Smart Recommendations Rendering ---
    const bestSlots = calculateBestTimes();
    if (recPillsContainer) {
      recPillsContainer.innerHTML = bestSlots
        .map((slot, index) => {
          const rank = index === 0 ? 'Best' : index === 1 ? '2nd' : '3rd';
          const isSelected = Math.abs(slot.hour - Math.floor(focusHour)) === 0;
          const formatted = formatTime(slot.hour, is24Hour);
          return `
            <button 
              type="button" 
              data-snap-hour="${slot.hour}" 
              data-rank="${rank}"
              class="px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                isSelected
                  ? 'bg-white text-zinc-950 font-bold shadow-sm'
                  : 'bg-[#181822] text-zinc-300 border border-[#272734] hover:bg-[#20202c] hover:text-white'
              }"
            >
              ${rank}: ${formatted}
            </button>
          `;
        })
        .join('');

      const recBtns = recPillsContainer.querySelectorAll('[data-snap-hour]');
      recBtns.forEach((btn) => {
        btn.addEventListener('click', () => {
          const h = parseInt((btn as HTMLElement).dataset.snapHour || '13', 10);
          const rank = (btn as HTMLElement).dataset.rank || 'Best';
          focusHour = h;
          updateClocks();
        });
      });
    }

    // --- Dynamic Bottom Floating Pill (Golden / Silver / Bronze / Custom Overlap) ---
    const startH = formatTime(focusHour, is24Hour);
    const endHourFloat = focusHour + selectedMeetingDurationMinutes / 60;
    const endH = formatTime(endHourFloat, is24Hour);

    const baseName = baseCity?.name || 'Local';
    const baseCode = baseCity?.badge && baseCity.badge !== 'Base' ? baseCity.badge : baseName.slice(0, 3).toUpperCase();

    // 1-City Initial Launch State
    if (ws.cities.length === 1) {
      if (overlapTextEl && overlapDotEl) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]';
        overlapTextEl.textContent = `Base Set (${baseName}): ${startH} – ${endH} • Add Teammate (⌘K)`;
      }
      if (qualityTitle) {
        qualityTitle.textContent = `Home location active (${baseName}).`;
      }
      if (qualityDesc) {
        qualityDesc.textContent = `Press ⌘K or click "+ Add Teammate" to add coworkers and discover mutual Golden Overlap windows.`;
      }
      if (qualityBadge) {
        qualityBadge.textContent = 'BASE SET';
        qualityBadge.className = 'text-[10px] font-mono px-2 py-0.5 rounded border font-semibold bg-emerald-500/15 text-emerald-400 border-emerald-500/30';
      }
      if (recPillsContainer) {
        recPillsContainer.innerHTML = `<span class="text-xs text-zinc-500 font-mono py-1">Add another city to view smart recommendations</span>`;
      }
      return;
    }

    const isRank1 = bestSlots[0] && Math.abs(bestSlots[0].hour - Math.floor(focusHour)) === 0;
    const isRank2 = bestSlots[1] && Math.abs(bestSlots[1].hour - Math.floor(focusHour)) === 0;
    const isRank3 = bestSlots[2] && Math.abs(bestSlots[2].hour - Math.floor(focusHour)) === 0;

    if (overlapTextEl && overlapDotEl) {
      if (isRank1) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.9)]';
        overlapTextEl.textContent = `Golden Overlap: ${startH} – ${endH} ${baseCode}`;
      } else if (isRank2) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)]';
        overlapTextEl.textContent = `Silver Window: ${startH} – ${endH} ${baseCode}`;
      } else if (isRank3) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.9)]';
        overlapTextEl.textContent = `Bronze Window: ${startH} – ${endH} ${baseCode}`;
      } else if (numWorking === total) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
        overlapTextEl.textContent = `Golden Slot: ${startH} – ${endH} ${baseCode}`;
      } else if (score >= 60) {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.8)]';
        overlapTextEl.textContent = `Meeting Slot: ${startH} – ${endH} ${baseCode}`;
      } else {
        overlapDotEl.className = 'w-2 h-2 rounded-full bg-red-400 shadow-[0_0_6px_rgba(248,113,113,0.8)]';
        overlapTextEl.textContent = `Suboptimal Slot: ${startH} – ${endH} ${baseCode}`;
      }
    }
  }

  // --- Dynamic City Rows Rendering ---
  function renderCityRows() {
    const ws = getActiveWorkspace();
    if (!cityRowsContainer) return;

    // Always ensure the detected local city is populated if workspace is empty
    if (ws.cities.length === 0) {
      ws.cities = [detectUserLocalCity()];
      saveWorkspacesToStorage();
    }

    if (emptyStateEl) {
      emptyStateEl.classList.add('hidden');
      emptyStateEl.classList.remove('flex');
    }
    if (scrubberLine) scrubberLine.classList.remove('hidden');
    if (scrubberTag) scrubberTag.classList.remove('hidden');

    const baseCity = getBaseCity(ws);

    cityRowsContainer.innerHTML = ws.cities
      .map((city, cityIndex) => {
        const isBase = city.isBase || cityIndex === 0;
        const badge = getCityOffsetBadgeForBaseMinutes(
          city,
          baseCity,
          currentActiveDateParts,
          getFocusBaseMinutes(),
          isBase
        );
        const statusLabel = getCityStatusLabel(city.timezone, currentActiveDateParts, baseCity.timezone);

        let timelineBlocks = '';
        for (let h = 0; h < 24; h++) {
          try {
            const projected = getCityLocalTimeForBaseMinutes(
              city,
              baseCity,
              currentActiveDateParts,
              h * 60
            );
            const localHourFloat = projected.hour + projected.minute / 60;
            const localHour = Math.floor(localHourFloat);
            const statusClass = getHourStatusClass(localHourFloat);
            const localTime = formatTime(localHourFloat, is24Hour);
            timelineBlocks += `
              <div class="h-full transition-colors ${statusClass} flex flex-col justify-end p-1 select-none pointer-events-none" title="${localTime} ${escapeHtml(city.name)}">
                <span class="text-[9px] font-mono text-zinc-600 pointer-events-none select-none">${localHour}</span>
              </div>
            `;
          } catch (error) {
            if (!isInvalidCivilTimeError(error)) {
              throw error;
            }
            timelineBlocks += `
              <div class="h-full flex flex-col justify-end p-1 select-none pointer-events-none bg-zinc-900/80 text-zinc-600" title="Unavailable DST time in ${escapeHtml(city.name)}" aria-label="${h.toString().padStart(2, '0')}:00 unavailable because of a daylight-saving transition">
                <span class="text-[9px] font-mono">—</span>
              </div>
            `;
          }
        }

        return `
          <div class="chronos-row-draggable h-[120px] border-b border-[#202024] flex items-stretch transition-all duration-150 relative select-none" id="row-${escapeHtml(city.id)}" data-city-id="${escapeHtml(city.id)}">
            <!-- Left City Card with Hover Actions (Draggable Card) -->
            <div class="chronos-city-card w-[280px] p-5 flex flex-col justify-between border-r border-[#202024] bg-[#0c0c0f] shrink-0 cursor-grab active:cursor-grabbing relative select-none" data-city-id="${escapeHtml(city.id)}">
              <div class="chronos-city-header flex items-center justify-between">
                <div class="chronos-city-identity flex items-center gap-2 min-w-0">
                  <span class="text-base leading-none shrink-0">${escapeHtml(city.flag)}</span>
                  <span class="text-sm font-semibold text-white tracking-tight truncate">${escapeHtml(city.name)}</span>
                </div>

                <!-- Hover Actions: Shift Up, Shift Down, Delete (Revealed on card hover) -->
                <div class="chronos-city-actions flex items-center gap-0.5 shrink-0">
                  <span class="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700 mr-0.5">
                    ${escapeHtml(badge)}
                  </span>
                  <button 
                    type="button" 
                    data-action="shift-city-up" 
                    data-city-id="${escapeHtml(city.id)}"
                    class="chronos-delete-btn p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer" 
                    title="Move ${escapeHtml(city.name)} up"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m18 15-6-6-6 6"/></svg>
                  </button>
                  <button 
                    type="button" 
                    data-action="shift-city-down" 
                    data-city-id="${escapeHtml(city.id)}"
                    class="chronos-delete-btn p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all cursor-pointer" 
                    title="Move ${escapeHtml(city.name)} down"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  <button 
                    type="button" 
                    data-action="delete-city" 
                    data-city-id="${escapeHtml(city.id)}"
                    class="chronos-delete-btn p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-all cursor-pointer" 
                    title="Remove ${escapeHtml(city.name)} from workspace"
                  >
                    <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
              </div>

              <!-- Clock Display -->
              <div id="clock-${escapeHtml(city.id)}" class="chronos-city-clock font-mono text-3xl font-bold tracking-tight text-white pointer-events-none">
                --:--
              </div>

              <!-- Status Dot and Label -->
              <div class="chronos-city-status flex items-center gap-1.5 text-xs text-zinc-400 font-mono pointer-events-none">
                <span id="dot-${escapeHtml(city.id)}" class="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"></span>
                <span id="status-${escapeHtml(city.id)}">${escapeHtml(statusLabel)}</span>
              </div>
            </div>

            <!-- Right 24-Hour Bento Timeline -->
            <div class="chronos-timeline-grid flex-1 grid grid-cols-[repeat(24,minmax(0,1fr))] h-full bg-[#0a0a0c]">
              ${timelineBlocks}
            </div>
          </div>
        `;
      })
      .join('');

    // Delete Button Listeners
    const deleteBtns = cityRowsContainer.querySelectorAll('[data-action="delete-city"]');
    deleteBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cityId = (btn as HTMLElement).dataset.cityId;
        if (cityId) {
          deleteCityFromWorkspace(cityId);
        }
      });
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
      btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    });

    // Shift Up Button Listeners
    const shiftUpBtns = cityRowsContainer.querySelectorAll('[data-action="shift-city-up"]');
    shiftUpBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cityId = (btn as HTMLElement).dataset.cityId;
        if (cityId) {
          shiftCityPosition(cityId, 'up');
        }
      });
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
      btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    });

    // Shift Down Button Listeners
    const shiftDownBtns = cityRowsContainer.querySelectorAll('[data-action="shift-city-down"]');
    shiftDownBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cityId = (btn as HTMLElement).dataset.cityId;
        if (cityId) {
          shiftCityPosition(cityId, 'down');
        }
      });
      btn.addEventListener('mousedown', (e) => e.stopPropagation());
      btn.addEventListener('pointerdown', (e) => e.stopPropagation());
    });

    // Wire Bulletproof Mouse/Pointer Drag Reordering for Windows (WebView2), macOS (WebKit), Linux (WebKitGTK)
    let draggedCityId: string | null = null;
    let isPointerDragging = false;
    let currentDropTargetRow: HTMLElement | null = null;
    const draggableCards = cityRowsContainer.querySelectorAll<HTMLElement>('.chronos-city-card');

    draggableCards.forEach((card) => {
      const row = card.closest('.chronos-row-draggable') as HTMLElement | null;
      const cityId = row?.dataset.cityId;
      if (!row || !cityId) return;

      card.addEventListener('mousedown', (e) => e.stopPropagation());
      card.addEventListener('pointerdown', (e: PointerEvent) => {
        if (e.button !== 0 || e.pointerType === 'touch') return;
        const target = e.target as HTMLElement;
        if (target.closest('button') || target.closest('a') || target.closest('input')) return;

        e.stopPropagation();
        e.preventDefault();
        try {
          card.setPointerCapture(e.pointerId);
        } catch (_) {}

        draggedCityId = cityId;
        isPointerDragging = true;
        row.classList.add('is-dragging-row');

        const onPointerMove = (moveEvent: PointerEvent) => {
          if (!isPointerDragging || !draggedCityId) return;
          moveEvent.stopPropagation();
          moveEvent.preventDefault();

          let targetRow: HTMLElement | null = null;
          const rows = cityRowsContainer.querySelectorAll<HTMLElement>('.chronos-row-draggable');
          rows.forEach((r) => {
            const rect = r.getBoundingClientRect();
            if (moveEvent.clientY >= rect.top && moveEvent.clientY <= rect.bottom) {
              targetRow = r;
            }
          });

          rows.forEach((r) => {
            if (r !== targetRow) {
              r.classList.remove('is-drop-target-top', 'is-drop-target-bottom');
            }
          });

          if (targetRow && (targetRow as HTMLElement).dataset.cityId !== draggedCityId) {
            currentDropTargetRow = targetRow;
            const rect = (targetRow as HTMLElement).getBoundingClientRect();
            const midY = rect.top + rect.height / 2;
            if (moveEvent.clientY < midY) {
              (targetRow as HTMLElement).classList.add('is-drop-target-top');
              (targetRow as HTMLElement).classList.remove('is-drop-target-bottom');
            } else {
              (targetRow as HTMLElement).classList.add('is-drop-target-bottom');
              (targetRow as HTMLElement).classList.remove('is-drop-target-top');
            }
          }
        };

        const onPointerUp = (upEvent: PointerEvent) => {
          try {
            card.releasePointerCapture(upEvent.pointerId);
          } catch (_) {}
          card.removeEventListener('pointermove', onPointerMove);
          card.removeEventListener('pointerup', onPointerUp);
          card.removeEventListener('pointercancel', onPointerUp);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('pointerup', onPointerUp);

          if (!isPointerDragging || !draggedCityId) return;
          isPointerDragging = false;
          row.classList.remove('is-dragging-row');

          if (currentDropTargetRow) {
            const targetCityId = currentDropTargetRow.dataset.cityId;
            currentDropTargetRow.classList.remove('is-drop-target-top', 'is-drop-target-bottom');

            if (targetCityId && targetCityId !== draggedCityId) {
              const activeWs = getActiveWorkspace();
              const oldBaseCity = getBaseCity(activeWs);
              const srcIdx = activeWs.cities.findIndex((c) => c.id === draggedCityId);
              let targetIdx = activeWs.cities.findIndex((c) => c.id === targetCityId);

              if (srcIdx !== -1 && targetIdx !== -1) {
                const rect = currentDropTargetRow.getBoundingClientRect();
                const midY = rect.top + rect.height / 2;
                if (upEvent.clientY >= midY && srcIdx > targetIdx) {
                  targetIdx += 1;
                }
                const [movedCity] = activeWs.cities.splice(srcIdx, 1);
                activeWs.cities.splice(targetIdx, 0, movedCity);

                // Update isBase flag: index 0 is always the base
                activeWs.cities.forEach((c, idx) => {
                  c.isBase = idx === 0;
                });

                const newBaseCity = getBaseCity(activeWs);
                if (newBaseCity.id !== oldBaseCity.id) {
                  if (isLiveSync) {
                    snapToNow();
                  } else {
                    rebaseFocusToNewBase(newBaseCity, oldBaseCity);
                  }
                }

                saveWorkspacesToStorage();
                renderCityRows();
                updateClocks();
              }
            }
            currentDropTargetRow = null;
          }
          draggedCityId = null;
        };

        card.addEventListener('pointermove', onPointerMove);
        card.addEventListener('pointerup', onPointerUp);
        card.addEventListener('pointercancel', onPointerUp);
        window.addEventListener('pointermove', onPointerMove);
        window.addEventListener('pointerup', onPointerUp);
      });
    });

    updateClocks();
  }

  function shiftCityPosition(cityId: string, direction: 'up' | 'down') {
    const ws = getActiveWorkspace();
    const idx = ws.cities.findIndex((c) => c.id === cityId);
    if (idx === -1) return;

    const oldBaseCity = getBaseCity(ws);

    if (direction === 'up' && idx > 0) {
      const temp = ws.cities[idx];
      ws.cities[idx] = ws.cities[idx - 1];
      ws.cities[idx - 1] = temp;
    } else if (direction === 'down' && idx < ws.cities.length - 1) {
      const temp = ws.cities[idx];
      ws.cities[idx] = ws.cities[idx + 1];
      ws.cities[idx + 1] = temp;
    } else {
      return;
    }

    ws.cities.forEach((c, i) => {
      c.isBase = i === 0;
    });

    const newBaseCity = getBaseCity(ws);
    if (newBaseCity.id !== oldBaseCity.id) {
      if (isLiveSync) {
        snapToNow();
      } else {
        rebaseFocusToNewBase(newBaseCity, oldBaseCity);
      }
    }

    saveWorkspacesToStorage();
    renderCityRows();
    updateClocks();
  }

  function saveWorkspacesToStorage() {
    if (typeof window !== 'undefined') {
      storage.setItem('rtz-workspaces-v3', JSON.stringify(WORKSPACES));
      storage.setItem('rtz-active-workspace-id', activeWorkspaceId);
    }
  }

  function deleteCityFromWorkspace(cityId: string) {
    const ws = getActiveWorkspace();
    const removedCity = ws.cities.find((c) => c.id === cityId);
    ws.cities = ws.cities.filter((c) => c.id !== cityId);
    saveWorkspacesToStorage();
    renderCityRows();
  }

  function addCityToActiveWorkspace(city: CityTime) {
    const ws = getActiveWorkspace();
    if (ws.cities.some((c) => c.id === city.id)) {
      return;
    }
    const baseCity = getBaseCity(ws);
    const offset = getCityRelativeOffsetHours(city, baseCity);
    const badge = formatOffsetBadge(offset, false);
    const statusLabel = getCityStatusLabel(city.timezone, currentActiveDateParts, baseCity.timezone);

    ws.cities.push({
      ...city,
      offsetHours: offset,
      badge,
      statusLabel,
      isBase: ws.cities.length === 0,
    });
    saveWorkspacesToStorage();
    renderCityRows();
    updateClocks();
    closeCommandPalette();

    setTimeout(() => {
      const newRow = document.getElementById(`row-${city.id}`);
      if (newRow) {
        newRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 60);
  }

  // --- Workspace Switcher & Management Dropdown ---
  function updateWorkspaceFocus() {
    if (!workspaceListEl) return;
    const items = workspaceListEl.querySelectorAll<HTMLElement>('[data-ws-row]');
    items.forEach((item, idx) => {
      if (idx === focusedWsIndex) {
        item.classList.add('bg-[#1e1e28]', 'text-white');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('bg-[#1e1e28]', 'text-white');
      }
    });
  }

  function renderWorkspaceList() {
    if (!workspaceListEl) return;
    const totalBadge = document.getElementById('chronos-ws-total-badge');
    if (totalBadge) totalBadge.textContent = `${WORKSPACES.length} teams`;

    workspaceListEl.innerHTML = WORKSPACES.map((w, index) => {
      const isActive = w.id === activeWorkspaceId;
      return `
        <div 
          data-ws-row="${index}"
          class="w-full px-2 py-1.5 rounded-lg text-xs flex items-center justify-between transition-colors group ${
            isActive ? 'bg-[#1e1e28] text-white font-medium' : 'text-zinc-400 hover:text-white hover:bg-[#181820]'
          }"
        >
          <button 
            type="button" 
            data-ws-id="${escapeHtml(w.id)}"
            class="flex items-center gap-2 flex-1 text-left cursor-pointer overflow-hidden truncate"
          >
            <span class="w-1.5 h-1.5 rounded-full shrink-0 ${isActive ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.8)]' : 'bg-zinc-600'}"></span>
            <span class="truncate">${escapeHtml(w.name)}</span>
          </button>

          <!-- Right side: City count & Hover Actions (Rename + Delete) -->
          <div class="flex items-center gap-1 shrink-0 ml-2">
            <span class="text-[10px] font-mono text-zinc-500 group-hover:hidden">${w.cities.length} cities</span>
            
            <!-- Rename Action Button -->
            <button 
              type="button" 
              data-action="rename-ws" 
              data-ws-id="${escapeHtml(w.id)}"
              class="hidden group-hover:flex p-1 rounded hover:bg-zinc-700/60 text-zinc-400 hover:text-white transition-colors cursor-pointer" 
              title="Rename workspace"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
            </button>

            <!-- Delete Action Button -->
            <button 
              type="button" 
              data-action="delete-ws" 
              data-ws-id="${escapeHtml(w.id)}"
              class="hidden group-hover:flex p-1 rounded hover:bg-red-500/20 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer" 
              title="Delete workspace"
            >
              <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
            </button>
          </div>
        </div>
      `;
    }).join('');

    // Attach click listeners to switch workspace
    const wsButtons = workspaceListEl.querySelectorAll('[data-ws-id]:not([data-action])');
    wsButtons.forEach((btn, idx) => {
      btn.addEventListener('click', () => {
        const wsId = (btn as HTMLElement).dataset.wsId;
        if (wsId) {
          activeWorkspaceId = wsId;
          focusedWsIndex = idx;
          const currentWs = getActiveWorkspace();
          if (workspaceNameEl) workspaceNameEl.textContent = currentWs.name;
          closeWorkspaceDropdown();
          renderCityRows();
        }
      });
    });

    // Attach Rename workspace listeners
    const renameBtns = workspaceListEl.querySelectorAll('[data-action="rename-ws"]');
    renameBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wsId = (btn as HTMLElement).dataset.wsId;
        if (wsId) {
          openEditWorkspaceModal(wsId);
        }
      });
    });

    // Attach Delete workspace listeners
    const deleteWsBtns = workspaceListEl.querySelectorAll('[data-action="delete-ws"]');
    deleteWsBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const wsId = (btn as HTMLElement).dataset.wsId;
        if (wsId) {
          deleteWorkspace(wsId);
        }
      });
    });

    updateWorkspaceFocus();
  }

  function deleteWorkspace(wsId: string) {
    if (WORKSPACES.length <= 1) {
      return;
    }
    WORKSPACES = WORKSPACES.filter((w) => w.id !== wsId);

    if (activeWorkspaceId === wsId) {
      activeWorkspaceId = WORKSPACES[0].id;
      focusedWsIndex = 0;
      const currentWs = getActiveWorkspace();
      if (workspaceNameEl) workspaceNameEl.textContent = currentWs.name;
    }

    renderWorkspaceList();
    renderCityRows();
  }

  function openEditWorkspaceModal(wsId: string) {
    closeWorkspaceDropdown();
    const ws = WORKSPACES.find((w) => w.id === wsId);
    if (!ws || !editWsModal) return;

    if (editWsIdInput) editWsIdInput.value = ws.id;
    if (editWsNameInput) editWsNameInput.value = ws.name;

    editWsModal.classList.remove('hidden');
    editWsModal.classList.add('flex');
    if (editWsNameInput) editWsNameInput.focus();
  }

  function closeEditWorkspaceModal() {
    if (editWsModal) {
      editWsModal.classList.add('hidden');
      editWsModal.classList.remove('flex');
    }
  }

  if (closeEditWsModalBtn) closeEditWsModalBtn.addEventListener('click', closeEditWorkspaceModal);
  if (cancelEditWsBtn) cancelEditWsBtn.addEventListener('click', closeEditWorkspaceModal);

  if (saveEditWsBtn) {
    saveEditWsBtn.addEventListener('click', () => {
      const wsId = editWsIdInput?.value;
      const targetWs = WORKSPACES.find((w) => w.id === wsId);
      if (targetWs) {
        targetWs.name = editWsNameInput?.value.trim() || 'Workspace';

        if (activeWorkspaceId === wsId) {
          if (workspaceNameEl) workspaceNameEl.textContent = targetWs.name;
        }

        closeEditWorkspaceModal();
        renderWorkspaceList();
      }
    });
  }

  function toggleWorkspaceDropdown() {
    if (!workspaceDropdown) return;
    const isHidden = workspaceDropdown.classList.contains('hidden');
    if (isHidden) {
      const activeIdx = WORKSPACES.findIndex((w) => w.id === activeWorkspaceId);
      focusedWsIndex = activeIdx >= 0 ? activeIdx : 0;
      renderWorkspaceList();
      workspaceDropdown.classList.remove('hidden');
      workspaceDropdown.classList.add('flex');
      if (workspaceChevron) workspaceChevron.style.transform = 'rotate(180deg)';
      if (workspaceBtn) workspaceBtn.blur();
    } else {
      closeWorkspaceDropdown();
    }
  }

  function closeWorkspaceDropdown() {
    if (workspaceDropdown) {
      workspaceDropdown.classList.add('hidden');
      workspaceDropdown.classList.remove('flex');
      if (workspaceChevron) workspaceChevron.style.transform = 'rotate(0deg)';
    }
  }

  if (workspaceBtn) {
    workspaceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeDateDropdown();
      closeCalendarDropdown();
      toggleWorkspaceDropdown();
    });
  }

  // --- Interactive Calendar Datepicker ---
  function toggleDateDropdown() {
    if (!dateDropdown) return;
    const isHidden = dateDropdown.classList.contains('hidden');
    if (isHidden) {
      closeWorkspaceDropdown();
      closeCalendarDropdown();
      dateDropdown.classList.remove('hidden');
      dateDropdown.classList.add('flex');
    } else {
      closeDateDropdown();
    }
  }

  function closeDateDropdown() {
    if (dateDropdown) {
      dateDropdown.classList.add('hidden');
      dateDropdown.classList.remove('flex');
    }
  }

  // Date Selector & Calendar State
  let selectedDateObj: Date;
  let calendarViewDate: Date;

  function datePartsToDisplayDate(parts: DateParts): Date {
    // Use a stable local noon only for calendar rendering; calculations use DateParts.
    return new Date(parts.year, parts.month - 1, parts.day, 12, 0, 0, 0);
  }

  const initialDateParts = getTodayDateParts(baseCity.timezone);
  currentActiveDateParts = { ...initialDateParts };
  selectedDateObj = datePartsToDisplayDate(initialDateParts);
  calendarViewDate = datePartsToDisplayDate(initialDateParts);
  activeSelectedDate = formatDateToPill(selectedDateObj);

  function formatDateToPill(d: Date): string {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[d.getDay()]}, ${months[d.getMonth()]} ${d.getDate()}`;
  }

  function renderCalendar() {
    if (!calendarDaysContainer) return;
    
    const year = calendarViewDate.getFullYear();
    const month = calendarViewDate.getMonth();
    
    // Sync Month & Year Dropdown Values
    if (calMonthSelect) calMonthSelect.value = month.toString();
    if (calYearSelect) calYearSelect.value = year.toString();

    const firstDayIndex = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const today = new Date();
    let html = '';

    // 1. Previous month trailing days
    for (let x = firstDayIndex; x > 0; x--) {
      const prevDay = daysInPrevMonth - x + 1;
      html += `
        <button 
          type="button" 
          data-cal-action="prev-month-day" 
          data-day="${prevDay}" 
          class="p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 text-center text-xs transition-colors cursor-pointer"
        >
          ${prevDay}
        </button>
      `;
    }

    // 2. Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const isSelected = 
        selectedDateObj.getDate() === day &&
        selectedDateObj.getMonth() === month &&
        selectedDateObj.getFullYear() === year;

      const isToday = 
        today.getDate() === day &&
        today.getMonth() === month &&
        today.getFullYear() === year;

      let btnClass = 'text-zinc-300 hover:bg-zinc-800 hover:text-white';
      if (isSelected) {
        btnClass = 'bg-emerald-500 text-zinc-950 font-bold shadow-sm';
      } else if (isToday) {
        btnClass = 'text-emerald-400 border border-emerald-500/40 bg-emerald-500/5 hover:bg-emerald-500/20 font-semibold';
      }

      html += `
        <button 
          type="button" 
          data-calendar-day="${day}" 
          class="p-1 rounded-md transition-colors cursor-pointer text-center text-xs ${btnClass}"
        >
          ${day}
        </button>
      `;
    }

    // 3. Next month leading days to complete full grid row
    const totalSlots = firstDayIndex + daysInMonth;
    const remainingSlots = (totalSlots % 7 === 0) ? 0 : 7 - (totalSlots % 7);
    for (let nextDay = 1; nextDay <= remainingSlots; nextDay++) {
      html += `
        <button 
          type="button" 
          data-cal-action="next-month-day" 
          data-day="${nextDay}" 
          class="p-1 rounded-md text-zinc-600 hover:text-zinc-400 hover:bg-zinc-800/40 text-center text-xs transition-colors cursor-pointer"
        >
          ${nextDay}
        </button>
      `;
    }

    calendarDaysContainer.innerHTML = html;

    // Attach click listeners to current month days
    const dayBtns = calendarDaysContainer.querySelectorAll<HTMLButtonElement>('[data-calendar-day]');
    dayBtns.forEach((b) => {
      b.addEventListener('click', () => {
        const d = parseInt(b.dataset.calendarDay || '1', 10);
        selectDateObj(new Date(year, month, d));
      });
    });

    // Attach click listeners to prev month trailing days
    const prevDayBtns = calendarDaysContainer.querySelectorAll<HTMLButtonElement>('[data-cal-action="prev-month-day"]');
    prevDayBtns.forEach((b) => {
      b.addEventListener('click', () => {
        const d = parseInt(b.dataset.day || '1', 10);
        calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
        selectDateObj(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), d));
      });
    });

    // Attach click listeners to next month leading days
    const nextDayBtns = calendarDaysContainer.querySelectorAll<HTMLButtonElement>('[data-cal-action="next-month-day"]');
    nextDayBtns.forEach((b) => {
      b.addEventListener('click', () => {
        const d = parseInt(b.dataset.day || '1', 10);
        calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
        selectDateObj(new Date(calendarViewDate.getFullYear(), calendarViewDate.getMonth(), d));
      });
    });
  }

  function selectDateParts(parts: DateParts) {
    const selection = getManualDateSelectionState(parts);
    isLiveSync = selection.isLiveSync;
    currentActiveDateParts = selection.dateParts;
    selectedDateObj = selection.displayDate;
    calendarViewDate = new Date(selection.displayDate);
    activeSelectedDate = formatDateToPill(selectedDateObj);
    if (currentDateLabel) {
      currentDateLabel.textContent = activeSelectedDate;
    }
    renderCalendar();
    closeDateDropdown();
    renderCityRows();
    updateClocks();
    updateMeetingQuality();
  }

  function selectDateObj(d: Date) {
    selectDateParts({
      year: d.getFullYear(),
      month: d.getMonth() + 1,
      day: d.getDate(),
    });
  }

  if (calMonthSelect) {
    calMonthSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      const newMonth = parseInt(calMonthSelect.value, 10);
      calendarViewDate.setMonth(newMonth);
      renderCalendar();
    });
  }

  if (calYearSelect) {
    calYearSelect.addEventListener('change', (e) => {
      e.stopPropagation();
      const newYear = parseInt(calYearSelect.value, 10);
      calendarViewDate.setFullYear(newYear);
      renderCalendar();
    });
  }

  if (dateBtn) {
    dateBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      renderCalendar();
      toggleDateDropdown();
    });
  }

  if (calPrevMonthBtn) {
    calPrevMonthBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
      renderCalendar();
    });
  }

  if (calNextMonthBtn) {
    calNextMonthBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
      renderCalendar();
    });
  }

  if (calTodayBtn) {
    calTodayBtn.addEventListener('click', () => {
      selectDateParts(getTodayDateParts(getBaseCity().timezone));
    });
  }
  if (calTomorrowBtn) {
    calTomorrowBtn.addEventListener('click', () => {
      const today = getTodayDateParts(getBaseCity().timezone);
      selectDateParts(addCalendarDays(today, 1));
    });
  }
  if (calNextWeekBtn) {
    calNextWeekBtn.addEventListener('click', () => {
      const today = getTodayDateParts(getBaseCity().timezone);
      selectDateParts(addCalendarDays(today, 7));
    });
  }

  // Initial date label sync
  if (currentDateLabel) {
    currentDateLabel.textContent = formatDateToPill(selectedDateObj);
  }
  renderCalendar();

  // --- Expandable Bottom Intelligence Dock Logic ---
  function toggleIntelligenceDock() {
    if (!intelligencePanel) return;
    isIntelligenceDockOpen = !isIntelligenceDockOpen;
    if (isIntelligenceDockOpen) {
      intelligencePanel.classList.remove('hidden');
      intelligencePanel.classList.add('flex');
      if (dockChevron) dockChevron.style.transform = 'rotate(180deg)';
      updateMeetingQuality();
    } else {
      intelligencePanel.classList.add('hidden');
      intelligencePanel.classList.remove('flex');
      if (dockChevron) dockChevron.style.transform = 'rotate(0deg)';
    }
  }

  if (toggleIntelligenceBtn) {
    toggleIntelligenceBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      closeCalendarDropdown();
      toggleIntelligenceDock();
    });
  }

  // Set Meeting Duration & sync all inputs
  function setMeetingDuration(minutes: number) {
    selectedMeetingDurationMinutes = Math.max(15, Math.min(720, minutes));
    const formatted = formatDuration(selectedMeetingDurationMinutes);

    if (durationBadge) {
      durationBadge.textContent = `Duration: ${formatted}`;
    }
    if (durationTextInput) {
      durationTextInput.value = formatted;
    }
    if (durationSlider) {
      durationSlider.value = selectedMeetingDurationMinutes.toString();
    }

    if (durationPillsContainer) {
      const durBtns = durationPillsContainer.querySelectorAll('[data-duration]');
      durBtns.forEach((b) => {
        const d = parseInt((b as HTMLElement).dataset.duration || '60', 10);
        if (d === selectedMeetingDurationMinutes) {
          b.className = 'py-1 rounded-lg bg-white text-zinc-950 font-bold border border-white text-xs font-mono transition-colors cursor-pointer text-center shadow-sm';
        } else {
          b.className = 'py-1 rounded-lg bg-[#181822] text-zinc-400 hover:text-white border border-[#252532] text-xs font-mono transition-colors cursor-pointer text-center';
        }
      });
    }

    updateMeetingQuality();
  }

  // Duration Pills selection
  if (durationPillsContainer) {
    const durBtns = durationPillsContainer.querySelectorAll('[data-duration]');
    durBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const dur = parseInt((btn as HTMLElement).dataset.duration || '60', 10);
        setMeetingDuration(dur);
      });
    });
  }

  // Custom Duration Slider
  if (durationSlider) {
    durationSlider.addEventListener('input', (e) => {
      const val = parseInt((e.target as HTMLInputElement).value, 10);
      if (!isNaN(val)) {
        setMeetingDuration(val);
      }
    });
  }

  // Custom Duration Manual Text Input
  if (durationTextInput) {
    durationTextInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        const parsed = parseDurationString(durationTextInput.value);
        if (parsed !== null && parsed >= 15 && parsed <= 720) {
          setMeetingDuration(parsed);
        } else {
          durationTextInput.value = formatDuration(selectedMeetingDurationMinutes);
        }
        durationTextInput.blur();
      }
    });

    durationTextInput.addEventListener('blur', () => {
      const parsed = parseDurationString(durationTextInput.value);
      if (parsed !== null && parsed >= 15 && parsed <= 720) {
        setMeetingDuration(parsed);
      } else {
        durationTextInput.value = formatDuration(selectedMeetingDurationMinutes);
      }
    });
  }

  // --- Select Calendar Dropdown Engine ---
  function toggleCalendarDropdown() {
    if (!calendarDropdownMenu) return;
    const isHidden = calendarDropdownMenu.classList.contains('hidden');
    if (isHidden) {
      calendarDropdownMenu.classList.remove('hidden');
      calendarDropdownMenu.classList.add('flex');
      if (calChevron) calChevron.style.transform = 'rotate(180deg)';
    } else {
      closeCalendarDropdown();
    }
  }

  function closeCalendarDropdown() {
    if (calendarDropdownMenu) {
      calendarDropdownMenu.classList.add('hidden');
      calendarDropdownMenu.classList.remove('flex');
      if (calChevron) calChevron.style.transform = 'rotate(0deg)';
    }
  }

  if (calendarSelectBtn) {
    calendarSelectBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleCalendarDropdown();
    });
  }

  // Cross-Platform External Browser URL Opener (Works inside Tauri Desktop & Web)
  function openExternalBrowserUrl(url: string) {
    openAllowedExternalCalendarUrl(url);
  }

  function resolveSelectedStartInstant(baseTimezone: string): Date | null {
    const startMinutes = getFocusBaseMinutes();
    try {
      return datePartsToInstant(
        currentActiveDateParts,
        Math.floor(startMinutes / 60),
        startMinutes % 60,
        baseTimezone
      );
    } catch (error) {
      if (!isInvalidCivilTimeError(error)) {
        throw error;
      }
      if (calendarSelectBtn) {
        const label = calendarSelectBtn.querySelector('span');
        if (label) {
          const original = label.textContent;
          label.textContent = 'DST TIME UNAVAILABLE';
          setTimeout(() => {
            if (label) label.textContent = original;
          }, 2200);
        }
      }
      closeCalendarDropdown();
      return null;
    }
  }

  // Google Calendar Export
  if (exportGoogleBtn) {
    exportGoogleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ws = getActiveWorkspace();
      const baseCity = getBaseCity(ws);
      const title = encodeURIComponent(`Team Sync (${ws.name})`);
      const startInstant = resolveSelectedStartInstant(baseCity.timezone);
      if (!startInstant) return;
      const endInstant = new Date(startInstant.getTime() + selectedMeetingDurationMinutes * 60000);
      const startIso = startInstant.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
      const endIso = endInstant.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

      const details = encodeURIComponent(
        `Scheduled with RealTimeZones (${ws.name})\n\n` +
        ws.cities.map((c) => {
          const projected = projectAtFocus(c, baseCity);
          const t = projected
            ? formatTime(projected.hour + projected.minute / 60, is24Hour)
            : '—';
          const status = projected
            ? getCityStatusLabel(c.timezone, currentActiveDateParts, baseCity.timezone)
            : 'DST unavailable';
          return `• ${c.name} (${c.flag || ''}): ${t} (${status})`;
        }).join('\n') +
        '\n\nhttps://realtimezones.com'
      );

      const url = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startIso}/${endIso}&details=${details}`;
      openExternalBrowserUrl(url);
      closeCalendarDropdown();
    });
  }

  // Outlook Web Calendar Export
  if (exportOutlookBtn) {
    exportOutlookBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ws = getActiveWorkspace();
      const baseCity = getBaseCity(ws);
      const title = encodeURIComponent(`Team Sync (${ws.name})`);
      const startInstant = resolveSelectedStartInstant(baseCity.timezone);
      if (!startInstant) return;
      const endInstant = new Date(startInstant.getTime() + selectedMeetingDurationMinutes * 60000);
      const startIso = startInstant.toISOString().split('.')[0] + 'Z';
      const endIso = endInstant.toISOString().split('.')[0] + 'Z';

      const details = encodeURIComponent(
        `Scheduled with RealTimeZones (${ws.name})\n\n` +
        ws.cities.map((c) => {
          const projected = projectAtFocus(c, baseCity);
          const t = projected
            ? formatTime(projected.hour + projected.minute / 60, is24Hour)
            : '—';
          const status = projected
            ? getCityStatusLabel(c.timezone, currentActiveDateParts, baseCity.timezone)
            : 'DST unavailable';
          return `• ${c.name} (${c.flag || ''}): ${t} (${status})`;
        }).join('\n') +
        '\n\nhttps://realtimezones.com'
      );

      const url = `https://outlook.live.com/calendar/0/deeplink/compose?subject=${title}&startdt=${startIso}&enddt=${endIso}&body=${details}`;
      openExternalBrowserUrl(url);
      closeCalendarDropdown();
    });
  }

  // Apple Calendar & .ICS Export
  async function triggerIcsDownload(openInCalendar: boolean = false, e?: Event) {
    if (e) e.stopPropagation();
    const ws = getActiveWorkspace();
    const baseCity = getBaseCity(ws);
    const startInstant = resolveSelectedStartInstant(baseCity.timezone);
    if (!startInstant) return;
    const endInstant = new Date(startInstant.getTime() + selectedMeetingDurationMinutes * 60000);
    const startIso = startInstant.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
    const endIso = endInstant.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

    const description = [
      `Scheduled via RealTimeZones (${ws.name})`,
      '',
      ...ws.cities.map((c) => {
        const projected = projectAtFocus(c, baseCity);
        const t = projected
          ? formatTime(projected.hour + projected.minute / 60, is24Hour)
          : '—';
        const status = projected
          ? getCityStatusLabel(c.timezone, currentActiveDateParts, baseCity.timezone)
          : 'DST unavailable';
        return `• ${c.name}: ${t} (${status})`;
      }),
      '',
      'https://realtimezones.com'
    ].join(String.fromCharCode(10));

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//RealTimeZones//Timezone Workspace//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:rtz-${Date.now()}@realtimezones.com`,
      `DTSTAMP:${startIso}`,
      `DTSTART:${startIso}`,
      `DTEND:${endIso}`,
      `SUMMARY:Team Sync (${escapeIcsText(ws.name)})`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR',
    ].join('\r\n');

    const filename = sanitizeCalendarFilename(`team-sync-${ws.id || 'workspace'}.ics`);

    // 1. If in Tauri Desktop App: Call native Rust save_and_open_ics command
    let tauriSuccess = false;
    try {
      const tauri = (window as any).__TAURI__;
      if (tauri && tauri.core && typeof tauri.core.invoke === 'function') {
        await tauri.core.invoke('save_and_open_ics', {
          filename,
          content: icsContent,
          openInCalendar,
        });
        tauriSuccess = true;
      }
    } catch (err) {
      console.warn('Native ICS export fallback:', err);
    }

    // 2. Browser fallback (Data URI & Blob URL)
    if (!tauriSuccess) {
      if (openInCalendar) {
        const dataUri = 'data:text/calendar;charset=utf-8,' + encodeURIComponent(icsContent);
        window.location.href = dataUri;
      } else {
        try {
          const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
          const blobUrl = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.setAttribute('download', filename);
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => window.URL.revokeObjectURL(blobUrl), 2000);
        } catch (_) {}
      }
    }

    // 3. Always copy invite text to clipboard
    copyToClipboard(icsContent);

    // 4. Show brief visual feedback toast on calendar button
    if (calendarSelectBtn) {
      const label = calendarSelectBtn.querySelector('span');
      if (label) {
        const orig = label.textContent;
        label.textContent = openInCalendar ? '✓ CALENDAR OPENED' : '✓ ICS DOWNLOADED';
        setTimeout(() => {
          if (label) label.textContent = orig;
        }, 2000);
      }
    }

    closeCalendarDropdown();
  }

  if (exportAppleBtn) {
    exportAppleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerIcsDownload(true, e);
    });
  }
  if (exportIcsFileBtn) {
    exportIcsFileBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerIcsDownload(false, e);
    });
  }

  // Share Meeting Link & Formatted Participant Local Times
  if (shareBtn) {
    shareBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ws = getActiveWorkspace();
      const bestSlots = calculateBestTimes();
      const topSlot = bestSlots[0];
      const slotHour = topSlot ? topSlot.hour : focusHour;
      const startH = formatTime(slotHour, is24Hour);
      const endH = formatTime(slotHour + selectedMeetingDurationMinutes / 60, is24Hour);
      const baseCity = getBaseCity(ws);

      const inviteText = [
        `🗓️ Proposed Meeting: ${ws.name} (${activeSelectedDate})`,
        `⏰ Time Window: ${startH} – ${endH} (${baseCity?.name || 'Local'} Time)`,
        '',
        '👥 Local Times for Participants:',
        ...ws.cities.map((c) => {
          const slotMinutes = topSlot ? topSlot.hour * 60 : getFocusBaseMinutes();
          const projected = projectAtFocus(c, baseCity, slotMinutes);
          const t = projected
            ? formatTime(projected.hour + projected.minute / 60, is24Hour)
            : '— DST unavailable';
          const status = projected
            ? getCityStatusLabel(c.timezone, currentActiveDateParts, baseCity.timezone)
            : 'DST unavailable';
          return `  • ${c.name} (${c.flag || ''}): ${t} (${status})`;
        }),
        '',
        `⚡ Coordinated via RealTimeZones • https://realtimezones.com`,
      ].join('\n');

      copyToClipboard(inviteText).then((copied) => {
        if (!copied) {
          showToast('Could not copy invite to clipboard.');
          return;
        }
        const originalHtml = shareBtn.innerHTML;
        shareBtn.classList.add('border-emerald-500/40', 'bg-emerald-950/20');
        shareBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-75 duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="text-emerald-400 font-semibold text-xs">Copied Invite!</span>
        `;
        setTimeout(() => {
          shareBtn.classList.remove('border-emerald-500/40', 'bg-emerald-950/20');
          shareBtn.innerHTML = originalHtml;
        }, 1600);
      });
    });
  }

  window.addEventListener('click', (e) => {
    if (workspaceDropdown && !workspaceDropdown.contains(e.target as Node)) {
      closeWorkspaceDropdown();
    }
    if (dateDropdown && !dateDropdown.contains(e.target as Node)) {
      closeDateDropdown();
    }
    if (calendarDropdownMenu && !calendarDropdownMenu.contains(e.target as Node) && e.target !== calendarSelectBtn) {
      closeCalendarDropdown();
    }
  });

  // --- UNIFIED RAYCAST QUICK LAUNCHER ENGINE ---
  function getOmniNavigableItems(): HTMLElement[] {
    if (!omnibarResults) return [];
    return Array.from(
      omnibarResults.querySelectorAll<HTMLElement>(
        '[data-omni-row], [data-omni-action]'
      )
    );
  }

  function updateOmniFocus() {
    const items = getOmniNavigableItems();
    if (items.length === 0) return;

    if (focusedOmniIndex < 0) focusedOmniIndex = 0;
    if (focusedOmniIndex >= items.length) focusedOmniIndex = items.length - 1;

    items.forEach((item, idx) => {
      if (idx === focusedOmniIndex) {
        item.classList.add('bg-[#1e1e28]', 'text-white');
        item.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } else {
        item.classList.remove('bg-[#1e1e28]', 'text-white');
      }
    });
  }

  function openCommandPalette(defaultQuery: string = '') {
    if (commandPaletteModal) {
      closeWorkspaceDropdown();
      closeDateDropdown();
      closeCalendarDropdown();
      commandPaletteModal.classList.remove('hidden');
      commandPaletteModal.classList.add('flex');
      focusedOmniIndex = 0;
      if (commandInput) {
        commandInput.value = defaultQuery;
        renderOmnibarResults(defaultQuery);
        commandInput.focus();
        commandInput.select();
      }
    }
  }

  function closeCommandPalette() {
    if (commandPaletteModal) {
      commandPaletteModal.classList.add('hidden');
      commandPaletteModal.classList.remove('flex');
    }
  }

  function renderOmnibarResults(query: string) {
    if (!omnibarResults) return;
    const q = query.trim().toLowerCase();
    const currentWs = getActiveWorkspace();

    const isTimeQuery = /\d/.test(q) && (q.includes('in') || q.includes('to') || q.includes('pm') || q.includes('am') || q.includes('equals'));

    if (isTimeQuery) {
      omnibarResults.innerHTML = `
        <div class="flex flex-col gap-2">
          <div class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1">
            CONVERTED TIME MATRIX:
          </div>
          <div class="rounded-xl border border-[#1e1e26] bg-[#0f0f13] divide-y divide-[#181820] overflow-hidden">
            <div class="p-3 flex items-center justify-between hover:bg-[#14141a] transition-colors">
              <div class="flex items-center gap-3">
                <span class="text-base leading-none">🇯🇵</span>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-white">Tokyo</span>
                  <span class="text-[10px] text-zinc-500 font-mono">Night</span>
                </div>
              </div>
              <div class="flex flex-col items-end font-mono">
                <span class="text-xs font-semibold text-white">11:00 PM</span>
                <span class="text-[10px] text-zinc-500">JST, GMT+9</span>
              </div>
            </div>
            <div class="p-3 flex items-center justify-between hover:bg-[#14141a] transition-colors">
              <div class="flex items-center gap-3">
                <span class="text-base leading-none">🇺🇸</span>
                <div class="flex flex-col">
                  <span class="text-xs font-semibold text-white">New York</span>
                  <span class="text-[10px] text-zinc-500 font-mono">Working Hours</span>
                </div>
              </div>
              <div class="flex flex-col items-end font-mono">
                <span class="text-xs font-semibold text-white">10:00 AM</span>
                <span class="text-[10px] text-zinc-500">EDT, GMT-4</span>
              </div>
            </div>
          </div>
        </div>

        <div class="flex flex-col gap-1 mt-1">
          <div class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1">ACTIONS</div>
          <button id="omni-action-copy-converted" data-omni-action="copy-converted" type="button" class="w-full p-2.5 rounded-xl bg-[#16161e] border border-[#272734] text-white flex items-center justify-between text-xs hover:bg-[#1f1f2a] transition-colors cursor-pointer">
            <div class="flex items-center gap-2.5">
              <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span class="font-medium text-zinc-200">Copy: '3:00 PM BST = 11:00 PM JST / 10:00 AM EDT'</span>
            </div>
            <span class="text-zinc-500 font-mono text-[10px]">↵</span>
          </button>
        </div>
      `;

      const copyBtn = document.getElementById('omni-action-copy-converted');
      if (copyBtn) {
        copyBtn.addEventListener('click', () => {
          copyToClipboard("3:00 PM BST = 11:00 PM JST / 10:00 AM EDT").then(() => {
            closeCommandPalette();
          });
        });
      }
      focusedOmniIndex = 0;
      updateOmniFocus();
      return;
    }

    const matchingCities = POPULAR_AVAILABLE_CITIES.filter((c) =>
      c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q) || c.timezone.toLowerCase().includes(q) || c.statusLabel.toLowerCase().includes(q)
    );

    let citiesHtml = '';
    if (matchingCities.length > 0) {
      citiesHtml = `
        <div class="flex flex-col gap-1.5">
          <div class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1 flex items-center justify-between">
            <span>Cities Directory</span>
            <span>${matchingCities.length} matches</span>
          </div>
          <div class="rounded-xl border border-[#1e1e26] bg-[#0f0f13] divide-y divide-[#181820] overflow-hidden" id="omni-cities-list">
            ${matchingCities
              .slice(0, 10)
              .map((city) => {
                const alreadyInWs = currentWs.cities.some((c) => c.id === city.id);
                return `
                  <div 
                    data-omni-row="${escapeHtml(city.id)}"
                    class="p-2.5 sm:p-3 flex items-center justify-between hover:bg-[#15151c] transition-all cursor-pointer"
                  >
                    <div class="flex items-center gap-3">
                      <span class="text-lg leading-none">${escapeHtml(city.flag)}</span>
                      <div class="flex flex-col">
                        <span class="text-xs font-medium text-white">${escapeHtml(city.name)}, <span class="text-zinc-400 font-normal">${escapeHtml(city.country)}</span></span>
                        <span class="text-[10px] text-zinc-500 font-mono">${escapeHtml(city.timezone)} • ${escapeHtml(city.statusLabel)}</span>
                      </div>
                    </div>
                    ${
                      alreadyInWs
                        ? '<span class="text-[10px] font-mono text-zinc-500 px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800">In Workspace</span>'
                        : `<button type="button" data-omni-add-city="${escapeHtml(city.id)}" class="h-7 px-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500 hover:text-zinc-950 font-medium text-xs transition-all cursor-pointer flex items-center gap-1.5">
                            <svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg>
                            <span>Add</span>
                          </button>`
                    }
                  </div>
                `;
              })
              .join('')}
          </div>
        </div>
      `;
    }

    const actionsHtml = `
      <div class="flex flex-col gap-1.5">
        <div class="text-[10px] font-mono uppercase tracking-wider text-zinc-500 px-1">
          Quick Actions & Workspaces
        </div>
        <div class="flex flex-col gap-1">
          <button id="omni-act-now" data-omni-action="now" type="button" class="w-full p-2.5 rounded-xl hover:bg-[#16161e] border border-transparent hover:border-[#272734] text-zinc-300 hover:text-white flex items-center justify-between text-xs transition-colors cursor-pointer">
            <div class="flex items-center gap-2.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>Snap Timeline to Current Live Time (Now)</span>
            </div>
            <kbd class="text-[10px] font-mono text-zinc-500">N</kbd>
          </button>

          <button id="omni-act-copy-overlap" data-omni-action="copy-overlap" type="button" class="w-full p-2.5 rounded-xl hover:bg-[#16161e] border border-transparent hover:border-[#272734] text-zinc-300 hover:text-white flex items-center justify-between text-xs transition-colors cursor-pointer">
            <div class="flex items-center gap-2.5">
              <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              <span>Copy Common Overlap Slot to Clipboard</span>
            </div>
            <kbd class="text-[10px] font-mono text-zinc-500">⌘C</kbd>
          </button>

          <button id="omni-act-toggle-time" data-omni-action="toggle-time" type="button" class="w-full p-2.5 rounded-xl hover:bg-[#16161e] border border-transparent hover:border-[#272734] text-zinc-300 hover:text-white flex items-center justify-between text-xs transition-colors cursor-pointer">
            <div class="flex items-center gap-2.5">
              <svg class="w-3.5 h-3.5 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
              <span>Toggle Time Format (12h / 24h)</span>
            </div>
            <span class="text-[10px] font-mono text-zinc-500">${is24Hour ? 'Currently 24h' : 'Currently 12h'}</span>
          </button>
        </div>
      </div>
    `;

    omnibarResults.innerHTML = citiesHtml + (q.length === 0 ? actionsHtml : '');

    // Clicking city rows
    const omniRows = omnibarResults.querySelectorAll('[data-omni-row]');
    omniRows.forEach((row) => {
      row.addEventListener('click', () => {
        const cityId = (row as HTMLElement).dataset.omniRow;
        const target = POPULAR_AVAILABLE_CITIES.find((c) => c.id === cityId);
        if (target) {
          addCityToActiveWorkspace(target);
        }
      });
    });

    const omniAddBtns = omnibarResults.querySelectorAll('[data-omni-add-city]');
    omniAddBtns.forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const cityId = (btn as HTMLElement).dataset.omniAddCity;
        const target = POPULAR_AVAILABLE_CITIES.find((c) => c.id === cityId);
        if (target) {
          addCityToActiveWorkspace(target);
        }
      });
    });

    const actNow = document.getElementById('omni-act-now');
    if (actNow) {
      actNow.addEventListener('click', () => {
        closeCommandPalette();
        snapToNow();
      });
    }

    const actCopyOverlap = document.getElementById('omni-act-copy-overlap');
    if (actCopyOverlap) {
      actCopyOverlap.addEventListener('click', () => {
        closeCommandPalette();
        if (copySlotBtn) copySlotBtn.click();
      });
    }

    const actToggleTime = document.getElementById('omni-act-toggle-time');
    if (actToggleTime) {
      actToggleTime.addEventListener('click', () => {
        is24Hour = !is24Hour;
        closeCommandPalette();
        updateClocks();
      });
    }

    focusedOmniIndex = 0;
    updateOmniFocus();
  }

  if (commandInput) {
    commandInput.addEventListener('input', (e) => {
      renderOmnibarResults((e.target as HTMLInputElement).value);
    });

    commandInput.addEventListener('keydown', (e) => {
      const items = getOmniNavigableItems();

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (items.length > 0) {
          focusedOmniIndex = (focusedOmniIndex + 1) % items.length;
          updateOmniFocus();
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (items.length > 0) {
          focusedOmniIndex = (focusedOmniIndex - 1 + items.length) % items.length;
          updateOmniFocus();
        }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (items.length > 0 && items[focusedOmniIndex]) {
          items[focusedOmniIndex].click();
        } else {
          const q = commandInput.value.trim().toLowerCase();
          const matchingCity = POPULAR_AVAILABLE_CITIES.find((c) =>
            c.name.toLowerCase().includes(q) || c.country.toLowerCase().includes(q)
          );
          if (matchingCity) {
            addCityToActiveWorkspace(matchingCity);
          }
        }
      }
    });
  }

  if (closeCmdBtn) closeCmdBtn.addEventListener('click', closeCommandPalette);

  if (btnAddCity) {
    btnAddCity.addEventListener('click', () => openCommandPalette(''));
    btnAddCity.addEventListener('mousedown', (e) => e.stopPropagation());
    btnAddCity.addEventListener('pointerdown', (e) => e.stopPropagation());
  }
  if (btnAddCityEmpty) {
    btnAddCityEmpty.addEventListener('click', () => openCommandPalette(''));
    btnAddCityEmpty.addEventListener('mousedown', (e) => e.stopPropagation());
    btnAddCityEmpty.addEventListener('pointerdown', (e) => e.stopPropagation());
  }

  // --- Create Workspace Modal Logic ---
  function openCreateWsModal() {
    closeWorkspaceDropdown();
    if (newWsModal) {
      newWsModal.classList.remove('hidden');
      newWsModal.classList.add('flex');
      if (newWsNameInput) {
        newWsNameInput.value = '';
        newWsNameInput.focus();
      }
    }
  }

  function closeCreateWsModal() {
    if (newWsModal) {
      newWsModal.classList.add('hidden');
      newWsModal.classList.remove('flex');
    }
  }

  if (btnCreateWs) btnCreateWs.addEventListener('click', openCreateWsModal);
  if (closeWsModalBtn) closeWsModalBtn.addEventListener('click', closeCreateWsModal);
  if (cancelWsBtn) cancelWsBtn.addEventListener('click', closeCreateWsModal);

  if (saveWsBtn) {
    saveWsBtn.addEventListener('click', () => {
      const name = newWsNameInput?.value.trim() || 'New Workspace';
      const newWsId = `ws-${Date.now()}`;

      const newWorkspace: Workspace = {
        id: newWsId,
        name,
        cities: [detectUserLocalCity()],
      };

      WORKSPACES.push(newWorkspace);
      activeWorkspaceId = newWsId;
      saveWorkspacesToStorage();
      if (workspaceNameEl) workspaceNameEl.textContent = name;
      renderWorkspaceList();
      closeCreateWsModal();
      renderCityRows();
    });
  }

  function getRenderedTimelineGeometry(): TimelineGeometry | null {
    if (!canvasContainer) return null;

    const cityCard = cityRowsContainer?.querySelector<HTMLElement>('.chronos-city-card');
    const timelineGrid = cityRowsContainer?.querySelector<HTMLElement>('.chronos-timeline-grid');
    if (!cityCard || !timelineGrid) return null;

    const cityColumnWidth = cityCard.getBoundingClientRect().width;
    const timelineWidth = timelineGrid.getBoundingClientRect().width;
    return resolveTimelineGeometry({
      viewportWidth: canvasContainer.clientWidth,
      contentWidth: cityColumnWidth + timelineWidth,
      cityColumnWidth,
      scrollLeft: canvasContainer.scrollLeft,
    });
  }

  function updateTimelineFocusPosition() {
    const geometry = getRenderedTimelineGeometry();
    if (!geometry) return;

    const position = focusHourToTimelinePosition(focusHour, geometry);
    if (scrubberLine) {
      scrubberLine.style.left = `${position.contentLeft}px`;
      const inner = document.getElementById('chronos-canvas-inner') || canvasContainer;
      if (inner) {
        const totalH = Math.max(inner.scrollHeight, inner.clientHeight, 600);
        scrubberLine.style.height = `${totalH}px`;
      }
    }
    if (scrubberTag) {
      scrubberTag.style.left = `${position.viewportLeft}px`;
    }
  }

  function centerTimelineOnFocus() {
    if (!canvasContainer || canvasContainer.scrollWidth <= canvasContainer.clientWidth) return;
    const geometry = getRenderedTimelineGeometry();
    if (!geometry) return;

    canvasContainer.scrollLeft = focusHourToCenteredScrollLeft(
      focusHour,
      geometry,
      canvasContainer.clientWidth
    );
    updateTimelineFocusPosition();
  }

  // Update clocks, availability & intelligence panel
  function updateClocks() {
    const ws = getActiveWorkspace();
    const baseCity = getBaseCity(ws);
    const baseMinutes = Math.min(1439, Math.max(0, Math.round(focusHour * 60)));
    currentFocusHour = focusHour;

    ws.cities.forEach((city) => {
      const clockEl = document.getElementById(`clock-${city.id}`);
      const statusDot = document.getElementById(`dot-${city.id}`);
      const statusText = document.getElementById(`status-${city.id}`);

      let projected: ReturnType<typeof getCityLocalTimeForBaseMinutes>;
      try {
        projected = getCityLocalTimeForBaseMinutes(
          city,
          baseCity,
          currentActiveDateParts,
          baseMinutes
        );
      } catch (error) {
        if (!isInvalidCivilTimeError(error)) {
          throw error;
        }
        if (clockEl) clockEl.textContent = '—';
        if (statusDot) statusDot.className = 'w-2 h-2 rounded-full bg-zinc-500';
        if (statusText) statusText.textContent = 'DST unavailable';
        return;
      }

      const localHourFloat = projected.hour + projected.minute / 60;

      if (clockEl) {
        clockEl.textContent = formatTime(localHourFloat, is24Hour);
      }

      let status: 'working' | 'border' | 'sleep' = 'sleep';
      let statusName = 'Sleep';
      const offsetInfo = getCityStatusLabel(city.timezone, currentActiveDateParts, baseCity.timezone);

      if (localHourFloat >= workStartHour && localHourFloat < workEndHour) {
        status = 'working';
        statusName = 'Working';
      } else {
        const borderMorningStart = Math.max(0, workStartHour - 2);
        const borderEveningEnd = Math.min(24, workEndHour + 4);
        if ((localHourFloat >= borderMorningStart && localHourFloat < workStartHour) || (localHourFloat >= workEndHour && localHourFloat < borderEveningEnd)) {
          status = 'border';
          statusName = 'Border';
        } else {
          status = 'sleep';
          statusName = 'Sleep';
        }
      }

      if (statusDot) {
        statusDot.className = `w-2 h-2 rounded-full ${
          status === 'working'
            ? 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]'
            : status === 'border'
            ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.6)]'
            : 'border border-zinc-600 bg-zinc-800'
        }`;
      }
      if (statusText) {
        statusText.textContent = `${statusName} • ${offsetInfo}`;
      }
    });

    if (scrubberTag) {
      scrubberTag.textContent = formatTime(focusHour, is24Hour);
    }

    if (sliderScrubber && document.activeElement !== sliderScrubber) {
      sliderScrubber.value = focusHour.toString();
    }

    updateMeetingQuality();
    renderMenuBarGlance();
    syncTauriDesktopIntegration();

    updateTimelineFocusPosition();
  }

  // --- Synchronize Live System Tray Hover Tooltip with Current Cities and Time ---
  function syncTauriDesktopIntegration() {
    if (typeof window === 'undefined') return;
    const ws = getActiveWorkspace();
    const baseCity = getBaseCity(ws);
    const bestSlots = calculateBestTimes();
    const topSlot = bestSlots[0];
    const baseCode = baseCity ? (baseCity.badge === 'Base' ? baseCity.name : baseCity.badge) : 'Local';
    const overlapStr = topSlot
      ? `${formatTime(topSlot.hour, is24Hour)} – ${formatTime(topSlot.hour + selectedMeetingDurationMinutes / 60, is24Hour)} (${baseCode})`
      : 'All Day';

    const lines = [
      `RealTimeZones • ${ws.name}`,
      ...ws.cities.map((c) => {
        const projected = projectAtFocus(c, baseCity);
        if (!projected) return `• ${c.name}: — (DST unavailable)`;
        const localH = projected.hour + projected.minute / 60;
        const isWorking = localH >= workStartHour && localH < workEndHour;
        const status = isWorking ? 'Working' : 'Sleep';
        return `• ${c.name}: ${formatTime(localH, is24Hour)} (${status})`;
      }),
      `⭐ Golden Overlap: ${overlapStr}`,
    ];

    const tooltipText = lines.join('\n');

    const tauri = (window as any).__TAURI__;
    if (tauri && tauri.core && tauri.core.invoke) {
      void tauri.core
        .invoke('update_tray_tooltip', { tooltip: tooltipText })
        .catch((error: unknown) => {
          console.warn(`Could not synchronize the system tray: ${getErrorMessage(error)}`);
        });
    }
  }

  // --- Dynamic Live Menu Bar Glance Rendering ---
  function renderMenuBarGlance() {
    const ws = getActiveWorkspace();
    const baseCity = getBaseCity(ws);
    if (menubarWsName) menubarWsName.textContent = ws.name;

    if (menubarCitiesList) {
      if (ws.cities.length === 0) {
        menubarCitiesList.innerHTML = `
          <div class="p-4 text-center text-xs text-zinc-500 font-mono">
            No cities in workspace. Click Add below.
          </div>
        `;
      } else {
        menubarCitiesList.innerHTML = ws.cities
          .map((city) => {
            const projected = projectAtFocus(city, baseCity);
            if (!projected) {
              return `
                <div class="p-3 px-3.5 flex items-center justify-between hover:bg-[#16161c] transition-colors select-none">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full bg-zinc-500"></span>
                    <span class="text-xs font-semibold text-white tracking-tight">${escapeHtml(city.name)} ${escapeHtml(city.flag || '')}</span>
                  </div>
                  <span class="text-xs font-bold text-zinc-500 font-mono">— DST unavailable</span>
                </div>
              `;
            }

            const localHourFloat = projected.hour + projected.minute / 60;
            const isWorking = localHourFloat >= workStartHour && localHourFloat < workEndHour;
            const isBorder =
              (localHourFloat >= Math.max(0, workStartHour - 2) && localHourFloat < workStartHour) ||
              (localHourFloat >= workEndHour && localHourFloat < Math.min(24, workEndHour + 4));

            let dotClass = 'border border-zinc-600 bg-zinc-800';
            if (isWorking) {
              dotClass = 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]';
            } else if (isBorder) {
              dotClass = 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.8)]';
            }

            const formattedTime = formatTime(localHourFloat, is24Hour);
            const badgeText = formatOffsetBadge(
              getCityRelativeOffsetHours(city, baseCity, currentActiveDateParts, getFocusBaseMinutes()),
              city.isBase
            );

            return `
              <div class="p-3 px-3.5 flex items-center justify-between hover:bg-[#16161c] transition-colors select-none">
                <div class="flex flex-col gap-0.5">
                  <div class="flex items-center gap-2">
                    <span class="w-2 h-2 rounded-full ${dotClass}"></span>
                    <span class="text-xs font-semibold text-white tracking-tight flex items-center gap-1.5">
                      <span>${escapeHtml(city.name)}</span>
                      <span class="text-xs">${escapeHtml(city.flag || '')}</span>
                    </span>
                  </div>
                  <span class="text-[10px] text-zinc-500 font-mono pl-4">${badgeText}</span>
                </div>
                <div class="flex flex-col items-end font-mono">
                  <span class="text-xs font-bold text-white tracking-tight">${formattedTime}</span>
                </div>
              </div>
            `;
          })
          .join('');
      }
    }

    // Dynamic Overlap Ribbon
    const baseCode = baseCity ? (baseCity.badge === 'Base' ? baseCity.name.slice(0, 3).toUpperCase() : baseCity.badge) : '';
    const bestSlots = calculateBestTimes();

    if (menubarOverlapText) {
      if (ws.cities.length <= 1) {
        menubarOverlapText.textContent = `Base Set (${baseCity?.name || 'Local'})`;
      } else if (bestSlots.length > 0) {
        const topSlot = bestSlots[0];
        const startH = formatTime(topSlot.hour, is24Hour);
        const endH = formatTime(topSlot.hour + selectedMeetingDurationMinutes / 60, is24Hour);
        menubarOverlapText.textContent = `${startH} – ${endH} ${baseCode}`;
      } else {
        menubarOverlapText.textContent = 'All Day Available';
      }
    }

    if (menubarOverlapBar && bestSlots.length > 0) {
      const topHour = bestSlots[0].hour;
      const leftPercent = (topHour / 24) * 100;
      const widthPercent = (selectedMeetingDurationMinutes / (24 * 60)) * 100;
      menubarOverlapBar.style.left = `${Math.max(0, Math.min(90, leftPercent))}%`;
      menubarOverlapBar.style.width = `${Math.max(5, Math.min(50, widthPercent))}%`;
    }
  }

  // Native Menu Bar Companion Popover Logic
  function openMenuBarPopover() {
    renderMenuBarGlance();
    if (menubarOverlay) {
      menubarOverlay.classList.remove('hidden');
      menubarOverlay.classList.add('flex');
    }
  }

  function closeMenuBarPopover() {
    if (menubarOverlay) {
      menubarOverlay.classList.add('hidden');
      menubarOverlay.classList.remove('flex');
    }
  }

  function toggleMenuBarPopover() {
    if (menubarOverlay && !menubarOverlay.classList.contains('hidden')) {
      closeMenuBarPopover();
    } else {
      openMenuBarPopover();
    }
  }

  if (btnToggleMenubar) {
    btnToggleMenubar.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenuBarPopover();
    });
  }

  // Menubar button handlers
  if (menubarBtnExpand) {
    menubarBtnExpand.addEventListener('click', () => {
      closeMenuBarPopover();
    });
  }

  if (menubarOverlay) {
    menubarOverlay.addEventListener('click', (e) => {
      if (e.target === menubarOverlay) {
        closeMenuBarPopover();
      }
    });
  }

  if (menubarBtnAdd) {
    menubarBtnAdd.addEventListener('click', () => {
      closeMenuBarPopover();
      openCommandPalette();
    });
  }

  if (menubarBtnCopy) {
    menubarBtnCopy.addEventListener('click', () => {
      const ws = getActiveWorkspace();
      const baseCity = getBaseCity(ws);
      const bestSlots = calculateBestTimes();
      const topSlot = bestSlots[0];
      const slotMinutes = topSlot ? topSlot.hour * 60 : getFocusBaseMinutes();
      const slotHour = slotMinutes / 60;
      const startH = formatTime(slotHour, is24Hour);
      const endH = formatTime(slotHour + selectedMeetingDurationMinutes / 60, is24Hour);

      const lines = [
        `🗓️ Meeting Slot (${ws.name}): ${startH} – ${endH} ${baseCity?.name || 'Base'}`,
        '',
        ...ws.cities.map((c) => {
          const projected = projectAtFocus(c, baseCity, slotMinutes);
          const t = projected
            ? formatTime(projected.hour + projected.minute / 60, is24Hour)
            : '— DST unavailable';
          return `• ${c.name} (${c.flag || ''}): ${t}`;
        }),
      ];
      copyToClipboard(lines.join('\n'));

      if (menubarCopyLabel) {
        const orig = menubarCopyLabel.textContent;
        menubarCopyLabel.textContent = 'COPIED!';
        setTimeout(() => {
          if (menubarCopyLabel) menubarCopyLabel.textContent = orig;
        }, 1500);
      }
    });
  }

  // --- Mouse Dragging & Wheel Engine ---
  let isDragging = false;

  function calculateHourFromX(clientX: number) {
    if (!canvasContainer) return;
    const geometry = getRenderedTimelineGeometry();
    if (!geometry) return;
    const nextFocusHour = clientXToFocusHour({
      clientX,
      containerLeft: canvasContainer.getBoundingClientRect().left,
      geometry,
      stepMinutes: scrubStepMinutes,
    });
    if (nextFocusHour === null) return;

    focusHour = nextFocusHour;
    updateClocks();
  }

  function startDrag(e: MouseEvent | PointerEvent) {
    if (e.button !== 0) return;

    const pointerType = 'pointerType' in e ? e.pointerType : 'mouse';
    if (!shouldStartTimelineScrub(pointerType, e.currentTarget === scrubberHeader)) return;

    const target = e.target as HTMLElement | null;
    if (
      target &&
      (target.closest('button') ||
        target.closest('input') ||
        target.closest('a') ||
        target.closest('#chronos-empty-state') ||
        target.closest('#chronos-command-modal') ||
        target.closest('#chronos-new-workspace-modal') ||
        target.closest('#chronos-edit-workspace-modal') ||
        target.closest('#chronos-date-dropdown') ||
        target.closest('#chronos-intelligence-panel') ||
        target.closest('.chronos-city-card') ||
        target.closest('.chronos-drag-handle') ||
        (target.closest('.group') && target.closest('[data-action="delete-city"]')))
    ) {
      return;
    }

    const ws = getActiveWorkspace();
    if (ws.cities.length === 0 && e.currentTarget === canvasContainer) {
      return;
    }

    const geometry = getRenderedTimelineGeometry();
    if (canvasContainer && geometry) {
      const rect = canvasContainer.getBoundingClientRect();
      const timelineViewportLeft = rect.left + geometry.cityColumnWidth - geometry.scrollLeft;
      if (e.clientX < timelineViewportLeft && e.target !== scrubberTag) return;
    }

    e.preventDefault();
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
    document.body.classList.add('is-scrubbing');

    isLiveSync = false;
    isDragging = true;
    calculateHourFromX(e.clientX);
  }

  function onMouseMove(e: MouseEvent | PointerEvent) {
    if (!isDragging) return;
    e.preventDefault();
    try {
      window.getSelection()?.removeAllRanges();
    } catch (_) {}
    calculateHourFromX(e.clientX);
  }

  function stopDrag() {
    isDragging = false;
    document.body.classList.remove('is-scrubbing');
  }

  window.addEventListener('mousemove', onMouseMove);
  window.addEventListener('pointermove', onMouseMove);
  window.addEventListener('mouseup', stopDrag);
  window.addEventListener('pointerup', stopDrag);
  window.addEventListener('pointercancel', stopDrag);
  window.addEventListener('blur', stopDrag);

  if (scrubberHeader) {
    scrubberHeader.addEventListener('mousedown', startDrag);
    scrubberHeader.addEventListener('pointerdown', startDrag);
  }

  if (canvasContainer) {
    canvasContainer.addEventListener('mousedown', startDrag);
    canvasContainer.addEventListener('pointerdown', startDrag);
    canvasContainer.addEventListener('scroll', updateTimelineFocusPosition, { passive: true });
  }

  // Mouse Wheel Scrubbing Support
  function onWheel(e: WheelEvent) {
    const target = e.target as HTMLElement | null;
    if (
      (settingsModal && !settingsModal.classList.contains('hidden')) ||
      (welcomeModal && !welcomeModal.classList.contains('hidden')) ||
      (commandPaletteModal && !commandPaletteModal.classList.contains('hidden')) ||
      (newWsModal && !newWsModal.classList.contains('hidden')) ||
      (editWsModal && !editWsModal.classList.contains('hidden')) ||
      (dateDropdown && !dateDropdown.classList.contains('hidden')) ||
      (target && (target.closest('#chronos-omnibar-results') || target.closest('.overflow-y-auto') || target.closest('#chronos-settings-modal') || target.closest('#chronos-welcome-modal') || target.closest('#chronos-workspace-dropdown') || target.closest('#chronos-date-dropdown') || target.closest('#chronos-intelligence-panel') || target.closest('#chronos-calendar-dropdown-menu')))
    ) {
      return;
    }

    const container = canvasContainer || scrubberHeader;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    if (
      e.clientX >= rect.left &&
      e.clientX <= rect.right &&
      e.clientY >= rect.top - 60 &&
      e.clientY <= rect.bottom + 60
    ) {
      e.preventDefault();
      const delta = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      if (Math.abs(delta) < 1) return;
      const direction = delta > 0 ? 1 : -1;
      const stepFraction = e.shiftKey ? 1.0 : (Math.max(1, scrubStepMinutes) / 60);
      isLiveSync = false;
      focusHour = Math.min(23.75, Math.max(0, focusHour + direction * stepFraction));
      updateClocks();
    }
  }

  window.addEventListener('wheel', onWheel, { passive: false });

  // Slider Input
  if (sliderScrubber) {
    sliderScrubber.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      if (!isNaN(val)) {
        isLiveSync = false;
        focusHour = val;
        updateClocks();
      }
    });
  }

  // Window Resize
  window.addEventListener('resize', () => {
    updateClocks();
    centerTimelineOnFocus();
  });

  // Snap to NOW
  function snapToNow() {
    const ws = getActiveWorkspace();
    const baseCity = getBaseCity(ws);
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: baseCity.timezone || 'Asia/Kolkata',
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    });
    const parts = formatter.formatToParts(now);
    let hPart = parseInt(parts.find((p) => p.type === 'hour')?.value || '0', 10);
    if (hPart === 24) hPart = 0;
    const mPart = parseInt(parts.find((p) => p.type === 'minute')?.value || '0', 10);
    const sPart = parseInt(parts.find((p) => p.type === 'second')?.value || '0', 10);

    focusHour = hPart + mPart / 60 + sPart / 3600;
    currentFocusHour = focusHour;
    const todayParts = getTodayDateParts(baseCity.timezone);
    selectedDateObj = datePartsToDisplayDate(todayParts);
    currentActiveDateParts = todayParts;
    calendarViewDate = datePartsToDisplayDate(todayParts);
    activeSelectedDate = formatDateToPill(selectedDateObj);
    if (currentDateLabel) {
      currentDateLabel.textContent = activeSelectedDate;
    }
    updateClocks();
    renderCityRows();
    updateMeetingQuality();
    requestAnimationFrame(centerTimelineOnFocus);
  }

  if (btnNow) {
    btnNow.addEventListener('click', () => {
      isLiveSync = true;
      snapToNow();
    });
  }

  // Continuous auto-tick background interval (every 10s when in live sync)
  if (typeof window !== 'undefined') {
    setInterval(() => {
      if (isLiveSync) {
        snapToNow();
      }
    }, 10000);
  }

  // 12h / 24h Toggle
  if (toggle12hBtn && toggle24hBtn) {
    toggle12hBtn.addEventListener('click', () => {
      is24Hour = false;
      toggle12hBtn.classList.add('bg-zinc-800', 'text-white');
      toggle12hBtn.classList.remove('text-zinc-400');
      toggle24hBtn.classList.remove('bg-zinc-800', 'text-white');
      toggle24hBtn.classList.add('text-zinc-400');
      updateClocks();
    });

    toggle24hBtn.addEventListener('click', () => {
      is24Hour = true;
      toggle24hBtn.classList.add('bg-zinc-800', 'text-white');
      toggle24hBtn.classList.remove('text-zinc-400');
      toggle12hBtn.classList.remove('bg-zinc-800', 'text-white');
      toggle12hBtn.classList.add('text-zinc-400');
      updateClocks();
    });
  }

  // Copy Formatted Slot
  if (copySlotBtn) {
    copySlotBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      const ws = getActiveWorkspace();
      const baseCity = getBaseCity(ws);
      const baseMinutes = getFocusBaseMinutes();
      const parts = ws.cities.map((c) => {
        const projected = projectAtFocus(c, baseCity, baseMinutes);
        const time = projected
          ? formatTime(projected.hour + projected.minute / 60, is24Hour)
          : '— DST unavailable';
        return `${time} ${c.name}`;
      });
      const text = `Meeting Slot: ${parts.join(' | ')}`;
      copyToClipboard(text).then((copied) => {
        if (!copied) {
          showToast('Could not copy meeting slot to clipboard.');
          return;
        }
        const originalHtml = copySlotBtn.innerHTML;
        copySlotBtn.classList.add('border-emerald-500/40', 'bg-emerald-950/20');
        copySlotBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-400 animate-in zoom-in-75 duration-150" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span class="text-emerald-400 font-semibold text-xs">Copied!</span>
        `;
        setTimeout(() => {
          copySlotBtn.classList.remove('border-emerald-500/40', 'bg-emerald-950/20');
          copySlotBtn.innerHTML = originalHtml;
        }, 1600);
      });
    });
  }

  // --- Settings & Appearance Controller (Staged Apply / Cancel Pattern) ---
  let stagedTheme = currentTheme;
  let stagedWorkStart = workStartHour;
  let stagedWorkEnd = workEndHour;
  let stagedScrubStep = scrubStepMinutes;

  function parseTimeStringToHour(text: string): number | null {
    const cleaned = text.trim().toLowerCase();
    if (!cleaned) return null;

    // Matches e.g. "9am", "5pm", "11:30pm", "8:00 am"
    const ampmMatch = cleaned.match(/^(\d+(?:\.\d+)?|\d+:\d+)\s*(am|pm)$/);
    if (ampmMatch) {
      let raw = ampmMatch[1];
      const isPm = ampmMatch[2] === 'pm';
      let h = 0;
      let m = 0;
      if (raw.includes(':')) {
        const parts = raw.split(':');
        if (parts.length !== 2) return null;
        h = Number(parts[0]);
        m = Number(parts[1]);
      } else {
        const floatVal = Number(raw);
        if (!Number.isFinite(floatVal)) return null;
        h = Math.floor(floatVal);
        m = Math.round((floatVal - h) * 60);
      }
      if (h < 1 || h > 12 || m < 0 || m > 59) return null;
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return h + m / 60;
    }

    // Matches e.g. "08:30", "17:00", "9:15"
    if (cleaned.includes(':')) {
      const timeMatch = cleaned.match(/^(\d{1,2}):(\d{1,2})$/);
      if (!timeMatch) return null;
      const h = Number(timeMatch[1]);
      const m = Number(timeMatch[2]);
      if (h >= 0 && h < 24 && m >= 0 && m < 60) {
        return h + m / 60;
      }
      return null;
    }

    // Matches e.g. "8", "17.5", "18"
    if (!/^\d+(?:\.\d+)?$/.test(cleaned)) return null;
    const num = Number(cleaned);
    if (Number.isFinite(num) && num >= 0 && num <= 24) {
      return num % 24;
    }

    return null;
  }

  function formatHourToLabel(h: number): string {
    const intHour = Math.floor(h);
    const mins = Math.round((h - intHour) * 60);
    const minStr = mins < 10 ? `0${mins}` : `${mins}`;
    const hStr = intHour < 10 ? `0${intHour}` : `${intHour}`;
    return `${hStr}:${minStr}`;
  }

  function applyTheme(theme: string) {
    if (!CHRONOS_THEMES.has(theme)) return;
    currentTheme = theme;
    storage.setItem('chronos-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    document.body.setAttribute('data-theme', theme);
  }
  applyTheme(currentTheme);

  function renderSettingsModalUI() {
    // 1. Theme Option Highlights
    if (themeOptionsContainer) {
      const themeBtns = themeOptionsContainer.querySelectorAll<HTMLElement>('[data-theme-val]');
      themeBtns.forEach((btn) => {
        if (btn.dataset.themeVal === stagedTheme) {
          btn.classList.add('border-white/40', 'shadow-sm');
          btn.classList.remove('border-[#272734]');
        } else {
          btn.classList.remove('border-white/40', 'shadow-sm');
          btn.classList.add('border-[#272734]');
        }
      });
    }

    // 2. Working hours inputs
    if (settingWorkStartText) settingWorkStartText.value = formatHourToLabel(stagedWorkStart);
    if (settingWorkEndText) settingWorkEndText.value = formatHourToLabel(stagedWorkEnd);

    // 3. Scrub step buttons & custom input
    if (settingStepCustom) settingStepCustom.value = stagedScrubStep.toString();
    if (stepOptionsContainer) {
      const stepBtns = stepOptionsContainer.querySelectorAll<HTMLElement>('[data-step-val]');
      stepBtns.forEach((btn) => {
        if (parseInt(btn.dataset.stepVal || '15', 10) === stagedScrubStep) {
          btn.className = 'flex-1 min-w-[50px] py-1.5 rounded-lg border border-white/40 bg-white text-zinc-950 font-bold text-xs font-mono transition-all cursor-pointer text-center shadow-sm';
        } else {
          btn.className = 'flex-1 min-w-[50px] py-1.5 rounded-lg border border-[#272734] bg-[#14141c] text-zinc-300 text-xs font-mono hover:text-white transition-all cursor-pointer text-center';
        }
      });
    }

    // 4. Desktop & System Integration Toggles
    if (settingToggleMenubar) {
      settingToggleMenubar.checked = storage.getItem('rtz-setting-menubar') !== 'false';
    }
    if (settingToggleAutostart) {
      settingToggleAutostart.checked = readStoredBoolean(
        storage,
        'rtz-setting-autostart',
        false
      );
    }
  }

  function openSettingsModal() {
    closeCommandPalette();
    closeWorkspaceDropdown();
    closeDateDropdown();
    closeCalendarDropdown();
    // Copy active settings to staged
    stagedTheme = currentTheme;
    stagedWorkStart = workStartHour;
    stagedWorkEnd = workEndHour;
    stagedScrubStep = scrubStepMinutes;
    renderSettingsModalUI();
    void refreshAutostartState();

    if (settingsModal) {
      settingsModal.classList.remove('hidden');
      settingsModal.classList.add('flex');
    }
  }

  function closeSettingsModal() {
    if (settingsModal) {
      settingsModal.classList.add('hidden');
      settingsModal.classList.remove('flex');
    }
  }

  async function saveAndApplySettings() {
    const operationToken = desktopSettingsOperations.beginMutation();
    if (operationToken === null) return;
    setDesktopSettingsBusy(true);

    try {
      // Read and parse manual inputs before saving
      if (settingWorkStartText) {
        const parsed = parseTimeStringToHour(settingWorkStartText.value);
        if (parsed !== null) stagedWorkStart = parsed;
      }
      if (settingWorkEndText) {
        const parsed = parseTimeStringToHour(settingWorkEndText.value);
        if (parsed !== null) stagedWorkEnd = parsed;
      }
      if (settingStepCustom) {
        const val = parseBoundedInteger(settingStepCustom.value.trim(), 1, 120);
        if (val !== null) {
          stagedScrubStep = val;
        }
      }

      const isMenubarEnabled = settingToggleMenubar ? settingToggleMenubar.checked : true;
      const previousMenubarEnabled = readStoredBoolean(
        storage,
        'rtz-setting-menubar',
        true
      );
      const requestedAutostartEnabled = settingToggleAutostart
        ? settingToggleAutostart.checked
        : false;
      const integrationSelection = validateDesktopIntegrationSelection(
        isMenubarEnabled,
        requestedAutostartEnabled
      );
      if (!integrationSelection.valid) {
        setAutostartStatus(integrationSelection.error, 'error');
        settingToggleAutostart?.focus();
        return;
      }

      const rollbackTrayPreference = async () => {
        const rollbackResult = await applyNativeTrayPreference(previousMenubarEnabled);
        if (!rollbackResult.success) {
          console.warn(`Could not roll back the system tray preference: ${rollbackResult.error}`);
        }
      };

      let autostartAdapter: AutostartAdapter | null = null;
      let previousNativeAutostartEnabled: boolean | null = null;
      const rollbackAutostartPreference = async () => {
        if (!autostartAdapter || previousNativeAutostartEnabled === null) return;
        const rollbackResult = await syncAutostartPreference(
          autostartAdapter,
          previousNativeAutostartEnabled
        );
        if (!rollbackResult.success) {
          console.warn(`Could not roll back autostart: ${rollbackResult.error}`);
        }
      };

      const restoreAutostartPreferenceUi = () => {
        if (previousNativeAutostartEnabled === null) return;
        if (settingToggleAutostart) {
          settingToggleAutostart.checked = previousNativeAutostartEnabled;
        }
        storage.setItem(
          AUTOSTART_STORAGE_KEY,
          previousNativeAutostartEnabled.toString()
        );
      };

      setAutostartStatus('Applying desktop integration settings…', 'pending');
      // Stage visibility with close-to-tray disabled. It is enabled only after
      // autostart and every other native step has been verified.
      const trayResult = await applyNativeTrayPreference(isMenubarEnabled, false);
      if (!trayResult.success) {
        await rollbackTrayPreference();
        setAutostartStatus(`Could not update the system tray: ${trayResult.error}`, 'error');
        return;
      }

      let verifiedAutostartEnabled = false;
      try {
        const adapter = await getAutostartAdapter();
        if (adapter) {
          autostartAdapter = adapter;
          previousNativeAutostartEnabled = await adapter.isEnabled();
          const result = await syncAutostartPreference(adapter, requestedAutostartEnabled);
          if (!result.success || result.enabled === null) {
            await rollbackAutostartPreference();
            await rollbackTrayPreference();
            restoreAutostartPreferenceUi();
            setAutostartStatus(`Could not update autostart: ${result.error}`, 'error');
            return;
          }
          autostartControlAvailable = true;
          if (settingToggleAutostart) settingToggleAutostart.checked = result.enabled;
          storage.setItem(AUTOSTART_STORAGE_KEY, result.enabled.toString());
          verifiedAutostartEnabled = result.enabled;
        } else if (isNativeDesktopRuntime()) {
          autostartControlAvailable = false;
          await rollbackTrayPreference();
          setAutostartStatus('The installed desktop autostart service is unavailable', 'error');
          return;
        } else if (requestedAutostartEnabled) {
          autostartControlAvailable = false;
          await rollbackTrayPreference();
          if (settingToggleAutostart) settingToggleAutostart.checked = false;
          setAutostartStatus('Autostart is available only in the installed desktop app', 'error');
          return;
        }
      } catch (error) {
        autostartControlAvailable = false;
        await rollbackAutostartPreference();
        await rollbackTrayPreference();
        restoreAutostartPreferenceUi();
        setAutostartStatus(`Could not update autostart: ${getErrorMessage(error)}`, 'error');
        return;
      }

      if (isMenubarEnabled) {
        const committedTrayResult = await applyNativeTrayPreference(true);
        if (!committedTrayResult.success) {
          await rollbackAutostartPreference();
          await rollbackTrayPreference();
          restoreAutostartPreferenceUi();
          setAutostartStatus(
            `Could not finalize the system tray: ${committedTrayResult.error}`,
            'error'
          );
          return;
        }
      }

      // Apply staged settings only after native integration has succeeded.
      currentTheme = stagedTheme;
      workStartHour = stagedWorkStart;
      workEndHour = stagedWorkEnd;
      scrubStepMinutes = stagedScrubStep;

      storage.setItem('chronos-theme', currentTheme);
      storage.setItem('chronos-work-start', workStartHour.toString());
      storage.setItem('chronos-work-end', workEndHour.toString());
      storage.setItem('chronos-scrub-step', scrubStepMinutes.toString());
      storage.setItem('rtz-setting-menubar', isMenubarEnabled.toString());
      storage.setItem(AUTOSTART_STORAGE_KEY, verifiedAutostartEnabled.toString());

      setAutostartStatus(
        verifiedAutostartEnabled
          ? 'Enabled — starts quietly at login'
          : isNativeDesktopRuntime()
            ? 'Off — the app will not launch at login'
            : 'Available in the installed desktop app',
        verifiedAutostartEnabled ? 'success' : 'muted'
      );

      // Update Header Menu Bar Glance Button
      if (btnToggleMenubar) {
        if (isMenubarEnabled) {
          btnToggleMenubar.classList.remove('hidden');
          btnToggleMenubar.classList.add('flex');
        } else {
          btnToggleMenubar.classList.add('hidden');
          btnToggleMenubar.classList.remove('flex');
        }
      }

      applyTheme(currentTheme);
      renderCityRows();
      updateClocks();
      closeSettingsModal();
    } finally {
      desktopSettingsOperations.endMutation(operationToken);
      setDesktopSettingsBusy(false);
    }
  }

  if (settingsBtn) {
    settingsBtn.addEventListener('click', openSettingsModal);
  }
  if (closeSettingsBtn) {
    closeSettingsBtn.addEventListener('click', closeSettingsModal);
  }
  if (cancelSettingsBtn) {
    cancelSettingsBtn.addEventListener('click', closeSettingsModal);
  }
  if (saveSettingsBtn) {
    saveSettingsBtn.addEventListener('click', saveAndApplySettings);
  }
  if (resetDefaultsBtn) {
    resetDefaultsBtn.addEventListener('click', () => {
      if (typeof window !== 'undefined') {
        storage.removeItem('chronos-workspaces');
        storage.removeItem('chronos-active-workspace-id');
        storage.removeItem('rtz-workspaces-v3');
        storage.removeItem('rtz-active-workspace-id');
      }
      const localBaseCity = detectUserLocalCity();
      WORKSPACES = [
        {
          id: 'ws-main',
          name: 'My Workspace',
          cities: [localBaseCity],
        },
      ];
      activeWorkspaceId = 'ws-main';
      saveWorkspacesToStorage();
      renderCityRows();
      updateClocks();
      closeSettingsModal();
    });
  }
  if (settingsModal) {
    settingsModal.addEventListener('click', (e) => {
      if (e.target === settingsModal) closeSettingsModal();
    });
  }

  // Theme Staging
  if (themeOptionsContainer) {
    const themeBtns = themeOptionsContainer.querySelectorAll<HTMLElement>('[data-theme-val]');
    themeBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const val = btn.dataset.themeVal;
        if (val) {
          stagedTheme = val;
          renderSettingsModalUI();
        }
      });
    });
  }

  // Workday Starts Manual Typing
  if (settingWorkStartText) {
    settingWorkStartText.addEventListener('input', () => {
      const parsed = parseTimeStringToHour(settingWorkStartText.value);
      if (parsed !== null) stagedWorkStart = parsed;
    });
  }

  // Workday Ends Manual Typing
  if (settingWorkEndText) {
    settingWorkEndText.addEventListener('input', () => {
      const parsed = parseTimeStringToHour(settingWorkEndText.value);
      if (parsed !== null) stagedWorkEnd = parsed;
    });
  }

  // Scrub Step Presets
  if (stepOptionsContainer) {
    const stepBtns = stepOptionsContainer.querySelectorAll<HTMLElement>('[data-step-val]');
    stepBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const step = parseInt(btn.dataset.stepVal || '15', 10);
        stagedScrubStep = step;
        renderSettingsModalUI();
      });
    });
  }

  // Custom Step Minutes Input
  if (settingStepCustom) {
    settingStepCustom.addEventListener('input', () => {
      const val = parseInt(settingStepCustom.value, 10);
      if (!isNaN(val) && val >= 1 && val <= 120) {
        stagedScrubStep = val;
        // Un-highlight preset buttons if custom value doesn't match
        if (stepOptionsContainer) {
          const stepBtns = stepOptionsContainer.querySelectorAll<HTMLElement>('[data-step-val]');
          stepBtns.forEach((btn) => {
            if (parseInt(btn.dataset.stepVal || '15', 10) === stagedScrubStep) {
              btn.className = 'flex-1 min-w-[50px] py-1.5 rounded-lg border border-white/40 bg-white text-zinc-950 font-bold text-xs font-mono transition-all cursor-pointer text-center shadow-sm';
            } else {
              btn.className = 'flex-1 min-w-[50px] py-1.5 rounded-lg border border-[#272734] bg-[#14141c] text-zinc-300 text-xs font-mono hover:text-white transition-all cursor-pointer text-center';
            }
          });
        }
      }
    });
  }

  if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', async () => {
      const jsonStr = JSON.stringify({ version: 1, workspaces: WORKSPACES }, null, 2);
      
      // 1. Copy JSON to clipboard
      const copied = await copyToClipboard(jsonStr);

      // 2. Trigger native blob file download
      try {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const blobUrl = URL.createObjectURL(blob);
        const downloadAnchor = document.createElement('a');
        downloadAnchor.href = blobUrl;
        downloadAnchor.download = `realtimezones-workspaces-${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        document.body.removeChild(downloadAnchor);
        setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);
      } catch (_) {}

      // 3. Visual button feedback
      const originalText = exportJsonBtn.innerHTML;
      exportJsonBtn.classList.add('border-emerald-500/40', 'bg-emerald-950/20');
      exportJsonBtn.innerHTML = `
        <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
        <span class="text-emerald-400 font-semibold text-xs">${copied ? 'Exported & Copied JSON!' : 'Exported JSON (copy unavailable)'}</span>
      `;
      setTimeout(() => {
        exportJsonBtn.classList.remove('border-emerald-500/40', 'bg-emerald-950/20');
        exportJsonBtn.innerHTML = originalText;
      }, 2000);
    });
  }

  if (importJsonInput) {
    importJsonInput.addEventListener('change', (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      if (file.size > MAX_WORKSPACE_JSON_BYTES) {
        alert(`Workspace import error:\nThe selected file is too large. Maximum size is ${Math.floor(MAX_WORKSPACE_JSON_BYTES / 1024)} KiB.`);
        importJsonInput.value = '';
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        const rawContent = event.target?.result as string;
        const valResult = parseAndValidateWorkspaceJson(rawContent);
        if (valResult.success && valResult.workspaces && valResult.workspaces.length > 0) {
          WORKSPACES.splice(0, WORKSPACES.length, ...valResult.workspaces);
          activeWorkspaceId = WORKSPACES[0].id;
          if (workspaceNameEl) workspaceNameEl.textContent = WORKSPACES[0].name;
          saveWorkspacesToStorage();
          renderWorkspaceList();
          renderCityRows();
          closeSettingsModal();
        } else {
          alert(`Workspace import error:\n${valResult.error || 'Invalid or malformed workspace JSON format.'}`);
        }
      };
      reader.readAsText(file);
    });
  }

  // Global Keyboard Shortcuts
  window.addEventListener('keydown', (e) => {
    const isInputActive = ['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement?.tagName || '');

    // If Workspace dropdown is open, handle ArrowUp / ArrowDown / Enter
    if (workspaceDropdown && !workspaceDropdown.classList.contains('hidden')) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusedWsIndex = (focusedWsIndex + 1) % WORKSPACES.length;
        updateWorkspaceFocus();
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusedWsIndex = (focusedWsIndex - 1 + WORKSPACES.length) % WORKSPACES.length;
        updateWorkspaceFocus();
        return;
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (WORKSPACES[focusedWsIndex]) {
          activeWorkspaceId = WORKSPACES[focusedWsIndex].id;
          const currentWs = getActiveWorkspace();
          if (workspaceNameEl) workspaceNameEl.textContent = currentWs.name;
          closeWorkspaceDropdown();
          renderCityRows();
        }
        return;
      }
    }

    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      if (commandPaletteModal && !commandPaletteModal.classList.contains('hidden')) {
        closeCommandPalette();
      } else {
        openCommandPalette();
      }
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'm') {
      e.preventDefault();
      toggleMenuBarPopover();
    } else if ((e.metaKey || e.ctrlKey) && e.key === ',') {
      e.preventDefault();
      if (settingsModal && !settingsModal.classList.contains('hidden')) {
        closeSettingsModal();
      } else {
        openSettingsModal();
      }
    } else if (e.key === 'Escape') {
      closeMenuBarPopover();
      closeWelcomeModal();
      closeCommandPalette();
      closeSettingsModal();
      closeCreateWsModal();
      closeEditWorkspaceModal();
      closeWorkspaceDropdown();
      closeDateDropdown();
      closeCalendarDropdown();
    } else if (e.key === 'Enter' && welcomeModal && !welcomeModal.classList.contains('hidden')) {
      e.preventDefault();
      closeWelcomeModal();
    } else if (!isInputActive) {
      if (e.key.toLowerCase() === 'n') {
        e.preventDefault();
        snapToNow();
      } else if (e.key === 'ArrowLeft') {
        const stepFraction = scrubStepMinutes / 60;
        focusHour = Math.max(0, focusHour - (e.shiftKey ? 1 : stepFraction));
        updateClocks();
      } else if (e.key === 'ArrowRight') {
        const stepFraction = scrubStepMinutes / 60;
        focusHour = Math.min(23.75, focusHour + (e.shiftKey ? 1 : stepFraction));
        updateClocks();
      }
    }
  });

  // Welcome Modal Logic
  function openWelcomeModal() {
    if (!welcomeModal) return;
    const currentWs = getActiveWorkspace();
    const baseCity = currentWs.cities.find((c) => c.isBase) || currentWs.cities[0] || detectUserLocalCity();

    if (welcomeBaseCityName) {
      welcomeBaseCityName.textContent = `${baseCity.name}, ${baseCity.country}`;
    }
    if (welcomeBaseCityTz) {
      welcomeBaseCityTz.textContent = `${baseCity.timezone} • ${baseCity.statusLabel || 'Local Time'}`;
    }

    welcomeModal.classList.remove('hidden');
    welcomeModal.classList.add('flex');
  }

  function closeWelcomeModal() {
    if (welcomeModal) {
      welcomeModal.classList.add('hidden');
      welcomeModal.classList.remove('flex');
    }
    if (typeof window !== 'undefined') {
      storage.setItem('rtz-welcome-seen-v1', 'true');
    }
  }

  if (welcomeStartBtn) {
    welcomeStartBtn.addEventListener('click', closeWelcomeModal);
  }
  if (welcomeSkipBtn) {
    welcomeSkipBtn.addEventListener('click', closeWelcomeModal);
  }
  if (welcomeGuideBtn) {
    welcomeGuideBtn.addEventListener('click', () => {
      closeSettingsModal();
      openWelcomeModal();
    });
  }
  if (welcomeModal) {
    welcomeModal.addEventListener('click', (e) => {
      if (e.target === welcomeModal) closeWelcomeModal();
    });
  }

  const cmdTriggers = document.querySelectorAll('.trigger-cmd-k');
  cmdTriggers.forEach((btn) => {
    btn.addEventListener('click', () => openCommandPalette(''));
  });

  if (commandPaletteModal) {
    commandPaletteModal.addEventListener('click', (e) => {
      if (e.target === commandPaletteModal) closeCommandPalette();
    });
  }

  // First-Run Pure Native SVG Intro Splash Sequence
  function playIntroSequence(onComplete?: () => void) {
    if (!introSplash) {
      if (onComplete) onComplete();
      return;
    }

    introSplash.classList.remove('hidden', 'opacity-0');
    introSplash.classList.add('flex', 'opacity-100');

    let hasFinished = false;
    const finishIntro = () => {
      if (hasFinished) return;
      hasFinished = true;
      introSplash.classList.remove('opacity-100');
      introSplash.classList.add('opacity-0');
      setTimeout(() => {
        introSplash.classList.remove('flex');
        introSplash.classList.add('hidden');
        if (typeof window !== 'undefined') {
          storage.setItem('rtz-intro-seen-v1', 'true');
        }
        if (onComplete) onComplete();
      }, 700);
    };

    // Auto-advance after 2.6s pure SVG animation sequence
    setTimeout(() => {
      finishIntro();
    }, 2600);
  }

  // Initial render on boot: Synchronize active workspace name, dropdown list, city rows and clocks
  const currentBootWs = getActiveWorkspace();
  if (workspaceNameEl) workspaceNameEl.textContent = currentBootWs.name;
  renderWorkspaceList();
  renderCityRows();
  updateClocks();
  requestAnimationFrame(centerTimelineOnFocus);

  // Initialize Desktop & System Integration Settings on Boot
  if (typeof window !== 'undefined') {
    void (async () => {
      const initializationToken = desktopSettingsOperations.beginInitialization();
      if (initializationToken === null) return;
      setDesktopSettingsBusy(true);

      try {
        const storedMenubarEnabled = storage.getItem('rtz-setting-menubar') !== 'false';
        let nativeAutostartEnabled: boolean | null = false;
        let startHiddenRequested = false;

        if (isNativeDesktopRuntime()) {
          try {
            const { invoke } = await import('@tauri-apps/api/core');
            startHiddenRequested = await invoke<boolean>('get_start_hidden');
            const adapter = await getAutostartAdapter();
            nativeAutostartEnabled = adapter ? await adapter.isEnabled() : null;
          } catch (error) {
            nativeAutostartEnabled = null;
            console.warn(`Could not read desktop startup state during boot: ${getErrorMessage(error)}`);
          }
        }

        const bootState = resolveDesktopIntegrationBootState(
          storedMenubarEnabled,
          nativeAutostartEnabled,
          startHiddenRequested
        );
        if (bootState.repairedLegacyPreference) {
          storage.setItem('rtz-setting-menubar', 'true');
        }

        const trayResult = await applyNativeTrayPreference(bootState.trayEnabled);
        if (!trayResult.success) {
          console.warn(`Could not restore the system tray preference: ${trayResult.error}`);
        }

        if (btnToggleMenubar) {
          if (bootState.trayEnabled) {
            btnToggleMenubar.classList.remove('hidden');
            btnToggleMenubar.classList.add('flex');
          } else {
            btnToggleMenubar.classList.add('hidden');
            btnToggleMenubar.classList.remove('flex');
          }
        }
      } finally {
        desktopSettingsOperations.endInitialization(initializationToken);
        setDesktopSettingsBusy(false);
      }

      await refreshAutostartState();
    })();
  }

  // First-Time Launch Sequence (Intro Splash -> Welcome Modal)
  if (typeof window !== 'undefined') {
    const hasSeenIntro = storage.getItem('rtz-intro-seen-v1');
    const hasSeenWelcome = storage.getItem('rtz-welcome-seen-v1');

    if (!hasSeenIntro) {
      // First-ever launch: Play smooth SVG reveal once, then show welcome guide
      playIntroSequence(() => {
        if (!hasSeenWelcome) {
          openWelcomeModal();
        }
      });
    } else if (!hasSeenWelcome) {
      openWelcomeModal();
    }
  }
}
