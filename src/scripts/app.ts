import { searchCities } from './city-db';
import {
  getTimezoneOffset,
  formatOffset,
  formatUtcOffset,
  getHourCategory,
  getParticipantStatusForMeeting,
  calculateOverlap,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateIcsContent
} from './time-utils';
import { cities, type City } from '../data/cities';

// Country Name to ISO 3166-1 alpha-2 Code mapping for Cities
const countryToIso: Record<string, string> = {
  "United States": "US",
  "Canada": "CA",
  "Mexico": "MX",
  "Brazil": "BR",
  "Argentina": "AR",
  "Colombia": "CO",
  "Chile": "CL",
  "Peru": "PE",
  "Venezuela": "VE",
  "Ecuador": "EC",
  "Guatemala": "GT",
  "Costa Rica": "CR",
  "Panama": "PA",
  "Cuba": "CU",
  "United Kingdom": "GB",
  "France": "FR",
  "Germany": "DE",
  "Netherlands": "NL",
  "Ireland": "IE",
  "Belgium": "BE",
  "Spain": "ES",
  "Italy": "IT",
  "Switzerland": "CH",
  "Austria": "AT",
  "Sweden": "SE",
  "Norway": "NO",
  "Denmark": "DK",
  "Finland": "FI",
  "Portugal": "PT",
  "Poland": "PL",
  "Czech Republic": "CZ",
  "Hungary": "HU",
  "Greece": "GR",
  "Turkey": "TR",
  "Russia": "RU",
  "Ukraine": "UA",
  "Iceland": "IS",
  "Japan": "JP",
  "South Korea": "KR",
  "Singapore": "SG",
  "Hong Kong": "HK",
  "Taiwan": "TW",
  "China": "CN",
  "Thailand": "TH",
  "Indonesia": "ID",
  "Philippines": "PH",
  "Malaysia": "MY",
  "Vietnam": "VN",
  "India": "IN",
  "Pakistan": "PK",
  "Bangladesh": "BD",
  "Sri Lanka": "LK",
  "Nepal": "NP",
  "Kazakhstan": "KZ",
  "Uzbekistan": "UZ",
  "United Arab Emirates": "AE",
  "Saudi Arabia": "SA",
  "Israel": "IL",
  "Jordan": "JO",
  "Lebanon": "LB",
  "Iraq": "IQ",
  "Iran": "IR",
  "Qatar": "QA",
  "Kuwait": "KW",
  "Australia": "AU",
  "New Zealand": "NZ",
  "Fiji": "FJ",
  "Egypt": "EG",
  "South Africa": "ZA",
  "Kenya": "KE",
  "Nigeria": "NG",
  "Morocco": "MA",
  "Tunisia": "TN",
  "Ethiopia": "ET",
  "Ghana": "GH"
};

// Convert Country Name to Unicode Emoji Flag (falls back to a default globe or map pin for Home)
function getFlagEmoji(countryName: string, timezone: string): string {
  if (countryName === "Home") {
    // Resolve home timezone to a country flag from the database if possible
    const match = cities.find(c => c.timezone === timezone);
    if (match) {
      return getFlagEmoji(match.country, timezone);
    }
    return "📍"; // fallback icon for location
  }
  const code = countryToIso[countryName];
  if (!code) return "🌐"; // fallback globe
  
  const codePoints = code
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}

// Parse manually typed meeting duration input (e.g. 90, 1.5h, 1h 30m) into minutes
function parseDurationInput(input: string): number | null {
  const clean = input.trim().toLowerCase();
  if (!clean) return null;

  // 1. Check if it's a pure integer (e.g. "90")
  if (/^\d+$/.test(clean)) {
    return parseInt(clean, 10);
  }

  // 2. Check if it's a plain decimal (e.g. "1.5" or "0.75")
  if (/^\d+\.\d+$/.test(clean)) {
    return Math.round(parseFloat(clean) * 60);
  }

  // 3. Parse patterns like: "1.5h", "1.5 h", "1h", "2 hours", "90m", "90 mins", "1h 30m", "1h30", "1 hr 15 min"
  const hourMinRegex = /^(?:(\d+(?:\.\d+)?)\s*(?:h|hrs?|hours?))?\s*(?:(\d+)\s*(?:m|mins?|minutes?))?$/;
  const match = clean.match(hourMinRegex);
  if (match) {
    const hours = match[1] ? parseFloat(match[1]) : 0;
    const minutes = match[2] ? parseInt(match[2], 10) : 0;
    if (hours > 0 || minutes > 0) {
      return Math.round(hours * 60 + minutes);
    }
  }

  // 4. Fallback: try to strip non-digit characters and parse as minutes
  const justNumbers = clean.replace(/[^\d]/g, '');
  if (justNumbers) {
    return parseInt(justNumbers, 10);
  }

  return null;
}

// Generate dynamic meeting quality summary and details
function getOverlapExplanation(
  this: RealTimeZonesApp,
  citiesList: City[],
  homeTimezone: string,
  startHour: number,
  durationMinutes: number
) {
  const participantTimezones = [homeTimezone];
  const uniqueCities: City[] = [];
  
  citiesList.forEach(c => {
    if (!participantTimezones.includes(c.timezone)) {
      participantTimezones.push(c.timezone);
      uniqueCities.push(c);
    }
  });

  const P = participantTimezones.length;
  if (P === 0) {
    return { stars: 0, label: 'None', score: 0, details: '', summary: '' };
  }
  let numWorking = 0;
  let numBorder = 0;
  let numSleep = 0;
  
  const nonWorkingCities: { name: string; localHour: number }[] = [];

  const getCityHourText = (tz: string) => {
    const start = new Date(this.getSelectedDate());
    start.setHours(startHour, 0, 0, 0);
    const offset = getTimezoneOffset(tz, start);
    const localTime = new Date(start.getTime() + offset * 60000);
    return localTime.getUTCHours();
  };

  const getContextualTimeOfDay = (hour: number): string => {
    if (hour >= 6 && hour < 8) return "starting their day";
    if (hour >= 8 && hour < 12) return "in their morning";
    if (hour >= 12 && hour < 17) return "in their afternoon";
    if (hour >= 17 && hour < 19) return "approaching evening";
    if (hour >= 19 && hour < 22) return "winding down their day";
    return "sleeping"; // 22:00 to 05:59
  };
  
  // Home timezone status
  const homeStatus = getParticipantStatusForMeeting(homeTimezone, this.getSelectedDate(), startHour, durationMinutes);
  const homeLocalHour = getCityHourText(homeTimezone);
  if (homeStatus === 'working') {
    numWorking++;
  } else if (homeStatus === 'border') {
    numBorder++;
    nonWorkingCities.push({ name: "Your Location", localHour: homeLocalHour });
  } else {
    numSleep++;
    nonWorkingCities.push({ name: "Your Location", localHour: homeLocalHour });
  }

  // Evaluate other cities
  uniqueCities.forEach(city => {
    const status = getParticipantStatusForMeeting(city.timezone, this.getSelectedDate(), startHour, durationMinutes);
    const localHour = getCityHourText(city.timezone);
    
    if (status === 'working') {
      numWorking++;
    } else if (status === 'border') {
      numBorder++;
      nonWorkingCities.push({ name: city.name, localHour });
    } else {
      numSleep++;
      nonWorkingCities.push({ name: city.name, localHour });
    }
  });

  // Calculate score out of 100
  const score = Math.round((100 * numWorking + 60 * numBorder + (-20) * numSleep) / P);

  let stars = 3;
  let label = 'Fair';

  // Fine-tuned mapping
  if (numWorking === P) {
    stars = 5;
    label = 'Excellent';
  } else if (score >= 80) {
    stars = 4;
    label = 'Great';
  } else if (score >= 60 && numWorking > 0) {
    stars = 3;
    label = 'Fair';
  } else if (score >= 35) {
    stars = 2;
    label = 'Poor';
  } else {
    stars = 1;
    label = 'Avoid';
  }

  const summary = `${numWorking} of ${P} participant${P > 1 ? 's' : ''} inside working hours.`;
  
  let details = '';
  if (nonWorkingCities.length > 0) {
    const detailsArr = nonWorkingCities.map(c => {
      let formattedHour = '';
      if (this.is24HourFormat) {
        formattedHour = `${c.localHour.toString().padStart(2, '0')}:00`;
      } else {
        const ampm = c.localHour >= 12 ? 'PM' : 'AM';
        let displayHour = c.localHour % 12;
        if (displayHour === 0) displayHour = 12;
        formattedHour = `${displayHour}:00 ${ampm}`;
      }

      const phrase = getContextualTimeOfDay(c.localHour);
      return `${c.name} is ${phrase} (${formattedHour})`;
    });
    details = detailsArr.join(', ') + '.';
  } else {
    details = 'All participants are inside optimal working hours.';
  }

  return { stars, label, summary, details, score };
}

export interface WorkspaceData {
  cities: string[];
  favorites: string[];
  theme: 'dark' | 'light' | 'system';
  timeFormat: '12h' | '24h';
  duration: number;
  focusTime: number;
  workingHours: { start: number; end: number } | null;
  timelineScrollLeft: number;
  version: number;
  lastUpdated: number;
}

function validateWorkspace(data: any): data is WorkspaceData {
  if (!data || typeof data !== 'object') return false;
  if (!Array.isArray(data.cities) || !data.cities.every(c => typeof c === 'string')) return false;
  if (!Array.isArray(data.favorites) || !data.favorites.every(f => typeof f === 'string')) return false;
  if (data.theme !== 'dark' && data.theme !== 'light' && data.theme !== 'system') return false;
  if (data.timeFormat !== '12h' && data.timeFormat !== '24h') return false;
  if (typeof data.duration !== 'number' || data.duration < 15 || data.duration > 1440) return false;
  if (typeof data.focusTime !== 'number' || data.focusTime < 0 || data.focusTime > 23) return false;
  if (typeof data.timelineScrollLeft !== 'number') return false;
  if (typeof data.version !== 'number') return false;
  return true;
}

function migrateWorkspace(): WorkspaceData | null {
  const legacyStateStr = localStorage.getItem('rtz_state');
  const legacyFavStr = localStorage.getItem('rtz_favorites');
  const legacyTheme = localStorage.getItem('theme');
  const legacyDur = localStorage.getItem('rtz_duration');
  const legacyFormat = localStorage.getItem('rtz_format');

  if (!legacyStateStr && !legacyFavStr && !legacyTheme && !legacyDur && !legacyFormat) {
    return null;
  }

  let citiesList: string[] = [];
  try {
    if (legacyStateStr) {
      const parsed = JSON.parse(legacyStateStr);
      if (parsed && Array.isArray(parsed.cities)) {
        citiesList = parsed.cities;
      }
    }
  } catch (e) {}

  let favoritesList: string[] = [];
  try {
    if (legacyFavStr) {
      const parsed = JSON.parse(legacyFavStr);
      if (Array.isArray(parsed)) {
        favoritesList = parsed;
      }
    }
  } catch (e) {}

  const theme = (legacyTheme as 'dark' | 'light' | 'system') || 'system';

  let duration = 60;
  if (legacyDur) {
    const parsed = parseInt(legacyDur, 10);
    if (!isNaN(parsed) && parsed >= 15 && parsed <= 1440) {
      duration = parsed;
    }
  }

  const timeFormat = legacyFormat === '24h' ? '24h' : '12h';

  const data: WorkspaceData = {
    cities: citiesList,
    favorites: favoritesList,
    theme,
    timeFormat,
    duration,
    focusTime: new Date().getHours(),
    workingHours: null,
    timelineScrollLeft: 0,
    version: 1,
    lastUpdated: Date.now()
  };

  // Clear legacy keys
  localStorage.removeItem('rtz_state');
  localStorage.removeItem('rtz_favorites');
  localStorage.removeItem('theme');
  localStorage.removeItem('rtz_duration');
  localStorage.removeItem('rtz_format');

  return data;
}

function createFreshWorkspace(): WorkspaceData {
  return {
    cities: [],
    favorites: [],
    theme: 'system',
    timeFormat: '12h',
    duration: 60,
    focusTime: new Date().getHours(),
    workingHours: null,
    timelineScrollLeft: 0,
    version: 1,
    lastUpdated: Date.now()
  };
}

class RealTimeZonesApp {
  // State
  private homeTimezone: string;
  private selectedCities: City[] = [];
  private favoriteTimezones: Set<string> = new Set();
  private focusHour: number = new Date().getHours();
  private selectedDate: Date = new Date();
  private activeTheme: 'dark' | 'light' | 'system' = 'system';
  private meetingDurationMinutes: number = 60;
  public is24HourFormat: boolean = false;
  private isFirstVisit = false;
  private saveDebounceTimeout: number | null = null;
  private activeElementBeforeResetModal: HTMLElement | null = null;
  private touchStartPos: { x: number; y: number } | null = null;
  private touchStartTrack: Element | null = null;

  // DOM Elements cache
  private scrollContainer!: HTMLDivElement;
  private timelineRowsContainer!: HTMLDivElement;
  private focusIndicator!: HTMLDivElement;
  private currentTimeLine!: HTMLDivElement;
  private searchModal!: HTMLDivElement;
  private searchInput!: HTMLInputElement;
  private searchResults!: HTMLDivElement;
  private selectedDateLabel!: HTMLButtonElement;
  private datePickerInput!: HTMLInputElement;
  private shareButton!: HTMLButtonElement;
  private shareToast!: HTMLDivElement;
  private overlapWidget!: HTMLDivElement;
  private calendarDropdownButton!: HTMLButtonElement;
  private calendarDropdownMenu!: HTMLDivElement;
  private keyboardHelpModal!: HTMLDivElement;
  private tooltipEl!: HTMLDivElement;
  
  // Settings / Reset elements
  private settingsMenuButton!: HTMLButtonElement;
  private settingsDropdown!: HTMLDivElement;
  private resetWorkspaceButton!: HTMLButtonElement;
  private resetConfirmModal!: HTMLDivElement;
  private btnConfirmCancel!: HTMLButtonElement;
  private btnConfirmReset!: HTMLButtonElement;
  private workspaceToast!: HTMLDivElement;

  // Scrubber elements
  private focusScrubberInput!: HTMLInputElement;
  private focusTimeReadout!: HTMLSpanElement;

  // Duration slider elements
  private durationSliderInput!: HTMLInputElement;
  private durationSliderValue!: HTMLInputElement;

  // Drag-to-scrub state
  private isDragging = false;

  constructor() {
    this.homeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.selectedDate.setHours(0, 0, 0, 0); // normalize date to start of day
  }

  public getSelectedDate() {
    return this.selectedDate;
  }

  public init() {
    this.cacheElements();
    this.loadState();
    this.setupEventListeners();
    this.setTheme(this.activeTheme); // enforce FOUC class and active button UI
    this.updateTimeFormatButtonsUI();
    this.updateDurationSliderUI();
    this.render();
    this.startTimeTicker();
  }

  private cacheElements() {
    this.scrollContainer = document.getElementById('timeline-scroll-container') as HTMLDivElement;
    this.timelineRowsContainer = document.getElementById('timeline-rows') as HTMLDivElement;
    this.focusIndicator = document.getElementById('focus-indicator') as HTMLDivElement;
    this.currentTimeLine = document.getElementById('current-time-line') as HTMLDivElement;
    this.searchModal = document.getElementById('search-modal') as HTMLDivElement;
    this.searchInput = document.getElementById('search-input') as HTMLInputElement;
    this.searchResults = document.getElementById('search-results') as HTMLDivElement;
    this.selectedDateLabel = document.getElementById('selected-date-label') as HTMLButtonElement;
    this.datePickerInput = document.getElementById('date-picker-input') as HTMLInputElement;
    this.shareButton = document.getElementById('share-button') as HTMLButtonElement;
    this.shareToast = document.getElementById('share-toast') as HTMLDivElement;
    this.overlapWidget = document.getElementById('overlap-widget') as HTMLDivElement;
    this.calendarDropdownButton = document.getElementById('calendar-dropdown-button') as HTMLButtonElement;
    this.calendarDropdownMenu = document.getElementById('calendar-dropdown-menu') as HTMLDivElement;
    this.keyboardHelpModal = document.getElementById('keyboard-help-modal') as HTMLDivElement;
    this.focusScrubberInput = document.getElementById('focus-scrubber') as HTMLInputElement;
    this.focusTimeReadout = document.getElementById('focus-time-readout') as HTMLSpanElement;
    this.tooltipEl = document.getElementById('app-tooltip') as HTMLDivElement;
    this.durationSliderInput = document.getElementById('duration-slider') as HTMLInputElement;
    this.durationSliderValue = document.getElementById('duration-slider-value') as HTMLInputElement;

    // Cache Settings elements
    this.settingsMenuButton = document.getElementById('settings-menu-button') as HTMLButtonElement;
    this.settingsDropdown = document.getElementById('settings-dropdown') as HTMLDivElement;
    this.resetWorkspaceButton = document.getElementById('reset-workspace-button') as HTMLButtonElement;
    this.resetConfirmModal = document.getElementById('reset-confirm-modal') as HTMLDivElement;
    this.btnConfirmCancel = document.getElementById('btn-confirm-cancel') as HTMLButtonElement;
    this.btnConfirmReset = document.getElementById('btn-confirm-reset') as HTMLButtonElement;
    this.workspaceToast = document.getElementById('workspace-toast') as HTMLDivElement;
  }

  private loadState() {
    // 1. Determine if first visit
    this.isFirstVisit = !localStorage.getItem('workspace') &&
                         !localStorage.getItem('rtz_state') &&
                         !localStorage.getItem('rtz_favorites') &&
                         !localStorage.getItem('theme') &&
                         !localStorage.getItem('rtz_duration') &&
                         !localStorage.getItem('rtz_format');

    // 2. Load workspace data (with migration and failsafe)
    let wsData: WorkspaceData | null = null;
    try {
      const rawWs = localStorage.getItem('workspace');
      if (rawWs) {
        const parsed = JSON.parse(rawWs);
        if (validateWorkspace(parsed)) {
          wsData = parsed;
        } else {
          // Version migration or corrupted reset safely
          if (parsed && typeof parsed.version === 'number' && parsed.version !== 1) {
            console.warn(`Incompatible workspace version ${parsed.version}. Resetting safely.`);
          }
          wsData = createFreshWorkspace();
        }
      } else {
        // Try migration from legacy keys
        wsData = migrateWorkspace();
        if (!wsData && this.isFirstVisit) {
          wsData = createFreshWorkspace();
        }
      }
    } catch (e) {
      console.error('Error parsing workspace from localStorage. Creating fresh workspace.', e);
      wsData = createFreshWorkspace();
    }

    if (!wsData) {
      wsData = createFreshWorkspace();
    }

    // 3. Parse URL parameters (takes precedence over stored workspace)
    const params = new URLSearchParams(window.location.search);
    const urlCities = params.get('cities');
    const urlFocus = params.get('focus');
    const urlDate = params.get('date');
    const urlDuration = params.get('duration');
    const urlFormat = params.get('format');

    // Theme (Astro inline script also reads this unified key)
    this.activeTheme = wsData.theme;

    // Load Favorites
    this.favoriteTimezones = new Set(wsData.favorites);

    // Load Cities
    if (urlCities) {
      const cityList = urlCities.split(',');
      this.selectedCities = [];
      for (const cityName of cityList) {
        const decoded = decodeURIComponent(cityName);
        const match = cities.find((c: City) => c.name.toLowerCase() === decoded.toLowerCase() || c.timezone === decoded);
        if (match && !this.selectedCities.some(existing => existing.timezone === match.timezone)) {
          this.selectedCities.push(match);
        }
      }
    } else {
      this.selectedCities = [];
      for (const tz of wsData.cities) {
        const match = cities.find((c: City) => c.timezone === tz);
        if (match) this.selectedCities.push(match);
      }
    }

    // Load Focus Hour
    if (urlFocus) {
      const parsedFocus = parseInt(urlFocus, 10);
      if (!isNaN(parsedFocus) && parsedFocus >= 0 && parsedFocus < 24) {
        this.focusHour = parsedFocus;
      }
    } else {
      this.focusHour = wsData.focusTime;
    }

    // Load Date: Priority is Shared URL -> Today -> Never an old saved date
    if (urlDate) {
      const parsedDate = new Date(urlDate);
      if (!isNaN(parsedDate.getTime())) {
        this.selectedDate = parsedDate;
        this.selectedDate.setHours(0, 0, 0, 0);
      }
    } else {
      this.selectedDate = new Date();
      this.selectedDate.setHours(0, 0, 0, 0);
    }

    // Load Duration
    if (urlDuration) {
      const parsedDur = parseInt(urlDuration, 10);
      if (!isNaN(parsedDur) && parsedDur >= 15 && parsedDur <= 1440) {
        this.meetingDurationMinutes = parsedDur;
      }
    } else {
      this.meetingDurationMinutes = wsData.duration;
    }

    // Load Time Format
    if (urlFormat) {
      this.is24HourFormat = urlFormat === '24h';
    } else {
      this.is24HourFormat = wsData.timeFormat === '24h';
    }

    // Save initial workspace data if first visit or newly migrated to avoid mismatched states
    if (this.isFirstVisit) {
      // First visit has empty workspace, save it immediately
      this.saveState();
    } else {
      // Show top-right premium toast if restored
      // We wait for the DOM load / render to show the toast
      const restoreWorkspaceState = () => {
        // Restore timeline scroll position
        if (wsData && typeof wsData.timelineScrollLeft === 'number' && this.scrollContainer) {
          this.scrollContainer.scrollLeft = wsData.timelineScrollLeft;
        }
        this.showWorkspaceRestoredToast();
      };
      if (document.readyState === 'complete') {
        restoreWorkspaceState();
      } else {
        window.addEventListener('load', restoreWorkspaceState);
      }
    }
  }

  private showWorkspaceRestoredToast() {
    if (!this.workspaceToast) return;
    this.workspaceToast.classList.remove('opacity-0', '-translate-y-2');
    this.workspaceToast.classList.add('opacity-100', 'translate-y-0');
    setTimeout(() => {
      this.workspaceToast.classList.remove('opacity-100', 'translate-y-0');
      this.workspaceToast.classList.add('opacity-0', '-translate-y-2');
    }, 2000);
  }

  private saveState() {
    const wsData: WorkspaceData = {
      cities: this.selectedCities.map(c => c.timezone),
      favorites: Array.from(this.favoriteTimezones),
      theme: this.activeTheme,
      timeFormat: this.is24HourFormat ? '24h' : '12h',
      duration: this.meetingDurationMinutes,
      focusTime: this.focusHour,
      workingHours: null,
      timelineScrollLeft: this.scrollContainer ? this.scrollContainer.scrollLeft : 0,
      version: 1,
      lastUpdated: Date.now()
    };
    try {
      localStorage.setItem('workspace', JSON.stringify(wsData));
    } catch (e) {
      console.error('Failed to write to localStorage:', e);
    }
    this.updateShareUrl();
  }

  private saveStateDebounced() {
    if (this.saveDebounceTimeout) {
      clearTimeout(this.saveDebounceTimeout);
    }
    this.saveDebounceTimeout = window.setTimeout(() => {
      this.saveState();
    }, 300);
  }

  private updateShareUrl() {
    const params = new URLSearchParams();
    params.set('cities', this.selectedCities.map(c => encodeURIComponent(c.name)).join(','));
    params.set('focus', this.focusHour.toString());
    params.set('date', this.selectedDate.toISOString().split('T')[0]);
    params.set('duration', this.meetingDurationMinutes.toString());
    params.set('format', this.is24HourFormat ? '24h' : '12h');
    window.history.replaceState(null, '', `?${params.toString()}`);
  }

  private setupEventListeners() {
    // 1. Add city triggers
    const addCityBtns = document.querySelectorAll('.trigger-add-city');
    addCityBtns.forEach(btn => {
      btn.addEventListener('click', () => this.openSearch());
    });

    // 2. Search Modal interactions
    if (this.searchInput && this.searchModal) {
      this.searchInput.addEventListener('input', () => this.handleSearchInput());
      this.searchModal.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
      
      // Close modal clicks
      this.searchModal.addEventListener('click', (e) => {
        if (e.target === this.searchModal || (e.target as HTMLElement).closest('.close-modal')) {
          this.closeSearch();
        }
      });
    }

    // 3. Date switcher
    document.getElementById('prev-day')?.addEventListener('click', () => this.adjustDate(-1));
    document.getElementById('next-day')?.addEventListener('click', () => this.adjustDate(1));
    document.getElementById('reset-now')?.addEventListener('click', () => this.resetToNow());

    if (this.selectedDateLabel && this.datePickerInput) {
      this.selectedDateLabel.addEventListener('click', () => {
        this.datePickerInput.showPicker();
      });
      this.datePickerInput.addEventListener('change', () => {
        if (this.datePickerInput.value) {
          this.selectedDate = new Date(this.datePickerInput.value);
          this.selectedDate.setHours(0, 0, 0, 0);
          this.saveState();
          this.render();
        }
      });
    }

    // 4. Focus Scrubber
    if (this.focusScrubberInput) {
      this.focusScrubberInput.addEventListener('input', () => {
        if (this.focusIndicator) this.focusIndicator.classList.add('dragging');
        this.focusHour = parseInt(this.focusScrubberInput.value);
        this.updateFocusIndicatorPosition();
        this.updateFocusReadout();
        this.updateShareUrl();
        this.renderOverlapWidget();
        this.updateRowClockTimes();
      });
      this.focusScrubberInput.addEventListener('pointerdown', () => {
        if (this.focusIndicator) this.focusIndicator.classList.add('dragging');
      });
      this.focusScrubberInput.addEventListener('pointerup', () => {
        if (this.focusIndicator) this.focusIndicator.classList.remove('dragging');
      });
      this.focusScrubberInput.addEventListener('touchstart', () => {
        if (this.focusIndicator) this.focusIndicator.classList.add('dragging');
      });
      this.focusScrubberInput.addEventListener('touchend', () => {
        if (this.focusIndicator) this.focusIndicator.classList.remove('dragging');
      });
    }

    // 5. Timeline scrubbing via mouse drag/touch
    if (this.timelineRowsContainer) {
      this.timelineRowsContainer.addEventListener('pointerdown', (e) => this.handleTimelinePointerDown(e));
      window.addEventListener('pointermove', (e) => this.handleTimelinePointerMove(e));
      window.addEventListener('pointerup', (e) => this.handleTimelinePointerUp(e));
    }

    // 6. Share trigger
    if (this.shareButton) {
      this.shareButton.addEventListener('click', () => this.copyShareLink());
    }

    // 7. Calendar Export Dropdown
    if (this.calendarDropdownButton && this.calendarDropdownMenu) {
      this.calendarDropdownButton.addEventListener('click', (e) => {
        e.stopPropagation();
        this.calendarDropdownMenu.classList.toggle('hidden');
      });
      window.addEventListener('click', () => {
        this.calendarDropdownMenu.classList.add('hidden');
      });
      
      document.getElementById('export-google')?.addEventListener('click', () => this.exportCalendar('google'));
      document.getElementById('export-outlook')?.addEventListener('click', () => this.exportCalendar('outlook'));
      document.getElementById('export-apple')?.addEventListener('click', () => this.exportCalendar('apple'));
      document.getElementById('export-ics')?.addEventListener('click', () => this.exportCalendar('ics'));
    }

    // 8. Theme toggles
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme') as 'dark' | 'light' | 'system';
        this.setTheme(theme, true);
      });
    });

    // Mobile Theme Toggle Click Event (Cycles through System -> Light -> Dark)
    const mobileThemeToggle = document.getElementById('theme-toggle-mobile');
    if (mobileThemeToggle) {
      mobileThemeToggle.addEventListener('click', () => {
        let nextTheme: 'dark' | 'light' | 'system' = 'light';
        if (this.activeTheme === 'system') {
          nextTheme = 'light';
        } else if (this.activeTheme === 'light') {
          nextTheme = 'dark';
        } else {
          nextTheme = 'system';
        }
        this.setTheme(nextTheme, true);
      });
    }

    // 8b. Add media query listener for system prefers-color-scheme
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      if (this.activeTheme === 'system') {
        const root = document.documentElement;
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      }
    });

    // 8c. Duration selector buttons
    const durationButtons = document.querySelectorAll('.duration-btn');
    durationButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const duration = parseInt(btn.getAttribute('data-duration') || '60');
        this.setDuration(duration);
      });
    });

    // 8d. Mouse wheel scrolling and scrubbing
    if (this.scrollContainer) {
      this.scrollContainer.addEventListener('wheel', (e) => {
        if (e.deltaY !== 0 && e.deltaX === 0) {
          e.preventDefault();
          this.scrollContainer.scrollLeft += e.deltaY;
        }
      }, { passive: false });
    }

    if (this.timelineRowsContainer) {
      this.timelineRowsContainer.addEventListener('wheel', (e) => {
        e.preventDefault();
        if (this.focusIndicator) this.focusIndicator.classList.add('dragging');
        if (e.deltaY > 0) {
          this.focusHour = (this.focusHour + 1) % 24;
        } else {
          this.focusHour = (this.focusHour - 1 + 24) % 24;
        }
        if (this.focusScrubberInput) this.focusScrubberInput.value = this.focusHour.toString();
        this.updateFocusIndicatorPosition();
        this.updateFocusReadout();
        this.updateShareUrl();
        this.renderOverlapWidget();
        this.updateRowClockTimes();
        
        // Restore animation transition after a short tick
        setTimeout(() => {
          if (!this.isDragging && this.focusIndicator) {
            this.focusIndicator.classList.remove('dragging');
          }
        }, 50);
      }, { passive: false });
    }

    // 8e. Time Format Switcher toggles
    document.getElementById('time-format-12h')?.addEventListener('click', () => this.setTimeFormat(false));
    document.getElementById('time-format-24h')?.addEventListener('click', () => this.setTimeFormat(true));

    // 8f. Custom Duration Slider input listener
    if (this.durationSliderInput) {
      this.durationSliderInput.addEventListener('input', () => {
        this.setDuration(parseInt(this.durationSliderInput.value));
      });
    }

    // 8h. Custom Duration Manual Input listener
    if (this.durationSliderValue) {
      this.durationSliderValue.addEventListener('input', () => {
        const parsed = parseDurationInput(this.durationSliderValue.value);
        if (parsed !== null && parsed >= 15 && parsed <= 720) {
          this.meetingDurationMinutes = parsed;
          if (this.durationSliderInput) this.durationSliderInput.value = parsed.toString();
          this.updateDurationButtonsUI();
          this.render();
        }
      });

      this.durationSliderValue.addEventListener('change', () => {
        const parsed = parseDurationInput(this.durationSliderValue.value);
        if (parsed !== null && parsed > 0) {
          const clamped = Math.max(15, Math.min(720, parsed));
          this.setDuration(clamped);
        } else {
          this.updateDurationSliderUI();
        }
      });

      this.durationSliderValue.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          this.durationSliderValue.blur();
        }
      });
    }

    // 8g. Custom hover tooltips
    this.setupTooltipListeners();

    // 9. Keyboard Help Trigger
    document.getElementById('trigger-keyboard-help')?.addEventListener('click', () => {
      if (this.keyboardHelpModal) this.keyboardHelpModal.classList.remove('hidden');
    });
    if (this.keyboardHelpModal) {
      this.keyboardHelpModal.addEventListener('click', (e) => {
        if (e.target === this.keyboardHelpModal || (e.target as HTMLElement).closest('.close-modal')) {
          this.keyboardHelpModal.classList.add('hidden');
        }
      });
    }

    // 10. Global keyboard shortcuts
    window.addEventListener('keydown', (e) => this.handleGlobalKeydowns(e));

    // 11. Settings & Reset triggers
    this.settingsMenuButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.settingsDropdown) {
        const isHidden = this.settingsDropdown.classList.contains('hidden');
        this.settingsDropdown.classList.toggle('hidden', !isHidden);
        this.settingsMenuButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
      }
    });

    window.addEventListener('click', () => {
      this.settingsDropdown?.classList.add('hidden');
      this.settingsMenuButton?.setAttribute('aria-expanded', 'false');
    });

    this.resetWorkspaceButton?.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.settingsDropdown) this.settingsDropdown.classList.add('hidden');
      if (this.settingsMenuButton) this.settingsMenuButton.setAttribute('aria-expanded', 'false');
      this.openResetModal();
    });

    this.btnConfirmCancel?.addEventListener('click', () => this.closeResetModal());
    this.btnConfirmReset?.addEventListener('click', () => this.confirmResetWorkspace());

    this.resetConfirmModal?.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.closeResetModal();
        e.preventDefault();
      }

      if (e.key === 'Tab') {
        const focusable = this.resetConfirmModal.querySelectorAll('button');
        if (focusable.length > 0) {
          const first = focusable[0] as HTMLElement;
          const last = focusable[focusable.length - 1] as HTMLElement;

          if (e.shiftKey) {
            if (document.activeElement === first) {
              last.focus();
              e.preventDefault();
            }
          } else {
            if (document.activeElement === last) {
              first.focus();
              e.preventDefault();
            }
          }
        }
      }
    });

    this.resetConfirmModal?.addEventListener('click', (e) => {
      if (e.target === this.resetConfirmModal) {
        this.closeResetModal();
      }
    });

    // 12. Save timeline position on scroll
    this.scrollContainer?.addEventListener('scroll', () => {
      this.saveStateDebounced();
    });

    // 13. Update positions on window resize
    window.addEventListener('resize', () => {
      if (this.focusIndicator) this.updateFocusIndicatorPosition();
      if (this.currentTimeLine) this.updateCurrentTimeIndicator();
    });
  }

  private setDuration(minutes: number) {
    this.meetingDurationMinutes = minutes;
    this.saveState();
    this.updateFocusIndicatorPosition();
    this.updateFocusReadout();
    this.renderOverlapWidget();
    this.updateDurationButtonsUI();
    this.updateDurationSliderUI();
  }

  private updateDurationButtonsUI() {
    const durationButtons = document.querySelectorAll('.duration-btn');
    durationButtons.forEach(btn => {
      const dur = parseInt(btn.getAttribute('data-duration') || '60');
      if (dur === this.meetingDurationMinutes) {
        btn.classList.add('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50', 'font-bold');
        btn.classList.remove('text-zinc-500', 'dark:text-zinc-400');
      } else {
        btn.classList.remove('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50', 'font-bold');
        btn.classList.add('text-zinc-500', 'dark:text-zinc-400');
      }
    });
  }

  private updateDurationSliderUI() {
    if (!this.durationSliderInput || !this.durationSliderValue) return;
    this.durationSliderInput.value = this.meetingDurationMinutes.toString();
    
    // Don't overwrite active manual typing
    if (document.activeElement === this.durationSliderValue) return;

    const hrs = Math.floor(this.meetingDurationMinutes / 60);
    const mins = this.meetingDurationMinutes % 60;
    let label = '';
    if (hrs > 0 && mins > 0) {
      label = `${hrs}h ${mins}m`;
    } else if (hrs > 0) {
      label = `${hrs}h`;
    } else {
      label = `${mins}m`;
    }
    this.durationSliderValue.value = label;
  }

  private setTimeFormat(is24h: boolean) {
    this.is24HourFormat = is24h;
    this.saveState();
    this.render();
    this.updateTimeFormatButtonsUI();
  }

  private updateTimeFormatButtonsUI() {
    const btn12h = document.getElementById('time-format-12h');
    const btn24h = document.getElementById('time-format-24h');
    if (!btn12h || !btn24h) return;

    if (this.is24HourFormat) {
      btn24h.classList.add('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50', 'font-bold');
      btn24h.classList.remove('text-zinc-500', 'dark:text-zinc-400');
      btn12h.classList.remove('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50', 'font-bold');
      btn12h.classList.add('text-zinc-500', 'dark:text-zinc-400');
    } else {
      btn12h.classList.add('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50', 'font-bold');
      btn12h.classList.remove('text-zinc-500', 'dark:text-zinc-400');
      btn24h.classList.remove('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50', 'font-bold');
      btn24h.classList.add('text-zinc-500', 'dark:text-zinc-400');
    }
  }

  private handleGlobalKeydowns(e: KeyboardEvent) {
    if (!this.searchModal || !this.keyboardHelpModal) return;
    const isSearchOpen = !this.searchModal.classList.contains('hidden');
    const isKeyHelpOpen = !this.keyboardHelpModal.classList.contains('hidden');

    if (e.key === 'Escape') {
      if (isSearchOpen) this.closeSearch();
      if (isKeyHelpOpen) this.keyboardHelpModal.classList.add('hidden');
      if (this.resetConfirmModal && !this.resetConfirmModal.classList.contains('hidden')) this.closeResetModal();
      this.calendarDropdownMenu.classList.add('hidden');
      this.settingsDropdown.classList.add('hidden');
    }

    // Ctrl+K or Cmd+K: Search Palette
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isSearchOpen) {
        this.closeSearch();
      } else {
        this.openSearch();
      }
    }

    // Arrow keys: Shift Focus Hour (only if search is closed and not typing in inputs)
    if (!isSearchOpen && document.activeElement?.tagName !== 'INPUT') {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        this.focusHour = (this.focusHour - 1 + 24) % 24;
        this.focusScrubberInput.value = this.focusHour.toString();
        this.updateFocusIndicatorPosition();
        this.updateFocusReadout();
        this.updateShareUrl();
        this.renderOverlapWidget();
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        this.focusHour = (this.focusHour + 1) % 24;
        this.focusScrubberInput.value = this.focusHour.toString();
        this.updateFocusIndicatorPosition();
        this.updateFocusReadout();
        this.updateShareUrl();
        this.renderOverlapWidget();
      }
    }
  }

  private openResetModal() {
    this.activeElementBeforeResetModal = document.activeElement as HTMLElement;
    this.resetConfirmModal.classList.remove('hidden');
    this.resetConfirmModal.setAttribute('aria-hidden', 'false');
    this.btnConfirmCancel.focus();
  }

  private closeResetModal() {
    this.resetConfirmModal.classList.add('hidden');
    this.resetConfirmModal.setAttribute('aria-hidden', 'true');
    if (this.activeElementBeforeResetModal) {
      this.activeElementBeforeResetModal.focus();
    }
  }

  private confirmResetWorkspace() {
    localStorage.removeItem('workspace');
    this.closeResetModal();
    window.location.href = window.location.pathname; // reload without query string parameters
  }

  private adjustDate(days: number) {
    this.selectedDate.setDate(this.selectedDate.getDate() + days);
    this.saveState();
    this.render();
  }

  private resetToNow() {
    this.selectedDate = new Date();
    this.selectedDate.setHours(0, 0, 0, 0);
    this.focusHour = new Date().getHours();
    this.focusScrubberInput.value = this.focusHour.toString();
    this.saveState();
    this.render();
    
    // Smoothly scroll container to center current hour
    this.scrollTimelineToHour(this.focusHour);
  }

  private scrollTimelineToHour(hour: number) {
    const blockWidth = 48;
    const headerCol = this.scrollContainer?.querySelector('.sticky') as HTMLElement;
    const stickyWidth = headerCol ? headerCol.offsetWidth : 256;
    const viewportWidth = this.scrollContainer.clientWidth;
    const targetScroll = (hour * blockWidth) + stickyWidth - (viewportWidth / 2) + (blockWidth / 2);
    this.scrollContainer.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }

  private startTimeTicker() {
    // Update active vertical line position and row clock times every second for realtime precision
    setInterval(() => {
      this.updateCurrentTimeIndicator();
      this.updateRowClockTimes();
    }, 1000);
  }

  // Search Logic
  private openSearch() {
    this.searchModal.classList.remove('hidden');
    this.searchInput.value = '';
    this.searchResults.innerHTML = '';
    this.searchInput.focus();
    this.handleSearchInput(); // populate empty state/popular
  }

  private closeSearch() {
    this.searchModal.classList.add('hidden');
  }

  private handleSearchInput() {
    const query = this.searchInput.value;
    const results = searchCities(query, 6);

    if (results.length === 0) {
      if (query.trim() === '') {
        // Show some recommended or popular tech cities that aren't already selected
        const popular = ["New York", "London", "Tokyo", "San Francisco", "Singapore", "Berlin"];
        const filtered = cities
          .filter((c: City) => popular.includes(c.name) && !this.selectedCities.some(sc => sc.timezone === c.timezone))
          .slice(0, 5);

        this.renderSearchResults(filtered, true);
      } else {
        this.searchResults.innerHTML = `
          <div class="px-4 py-8 text-center text-zinc-400 dark:text-zinc-500 font-mono text-sm">
            No cities match "${query}"
          </div>
        `;
      }
      return;
    }

    this.renderSearchResults(results, false);
  }

  private renderSearchResults(citiesList: City[], isPopular: boolean) {
    this.searchResults.innerHTML = '';
    
    if (isPopular) {
      const label = document.createElement('div');
      label.className = 'px-4 py-2 text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider';
      label.textContent = 'Popular Cities';
      this.searchResults.appendChild(label);
    }

    citiesList.forEach((city, index) => {
      const btn = document.createElement('button');
      btn.className = `w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 transition-colors text-left focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:outline-none search-result-item ${index === 0 ? 'bg-zinc-100 dark:bg-zinc-900' : ''}`;
      btn.setAttribute('data-timezone', city.timezone);
      btn.setAttribute('data-city', city.name);

      const offsetMinutes = getTimezoneOffset(city.timezone);
      const relativeOffset = offsetMinutes - getTimezoneOffset(this.homeTimezone);
      const relativeStr = relativeOffset === 0 ? 'Home' : formatOffset(relativeOffset);

      btn.innerHTML = `
        <div class="flex flex-col">
          <span class="font-medium text-zinc-900 dark:text-zinc-50">${city.name}</span>
          <span class="text-xs text-zinc-500 dark:text-zinc-400 font-mono">${city.country} • ${city.timezone.split('/')[0]}</span>
        </div>
        <div class="flex items-center gap-2">
          <span class="px-2 py-0.5 rounded text-xs font-mono bg-zinc-200/50 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">${relativeStr}</span>
          <span class="text-zinc-400 dark:text-zinc-600 font-mono text-xs">UTC ${formatOffset(offsetMinutes)}</span>
        </div>
      `;

      btn.addEventListener('click', () => this.addCity(city));
      this.searchResults.appendChild(btn);
    });
  }

  private handleSearchKeydown(e: KeyboardEvent) {
    const items = this.searchResults.querySelectorAll('.search-result-item');
    if (items.length === 0) return;

    let activeIndex = -1;
    items.forEach((item, idx) => {
      if (item === document.activeElement || item.classList.contains('bg-zinc-100') || item.classList.contains('dark:bg-zinc-900')) {
        activeIndex = idx;
      }
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      let nextIdx = 0;
      if (document.activeElement !== this.searchInput && activeIndex !== -1) {
        nextIdx = (activeIndex + 1) % items.length;
      }
      items.forEach(it => it.classList.remove('bg-zinc-100', 'dark:bg-zinc-900'));
      (items[nextIdx] as HTMLButtonElement).focus();
      items[nextIdx].classList.add('bg-zinc-100', 'dark:bg-zinc-900');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      let prevIdx = items.length - 1;
      if (document.activeElement !== this.searchInput && activeIndex !== -1) {
        prevIdx = (activeIndex - 1 + items.length) % items.length;
      }
      items.forEach(it => it.classList.remove('bg-zinc-100', 'dark:bg-zinc-900'));
      (items[prevIdx] as HTMLButtonElement).focus();
      items[prevIdx].classList.add('bg-zinc-100', 'dark:bg-zinc-900');
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = document.activeElement?.closest('.search-result-item') || items[0];
      if (target) {
        const tz = target.getAttribute('data-timezone');
        const name = target.getAttribute('data-city');
        const match = cities.find((c: City) => c.timezone === tz && c.name === name);
        if (match) this.addCity(match);
      }
    }
  }

  private addCity(city: City) {
    if (!this.selectedCities.some(c => c.timezone === city.timezone)) {
      this.selectedCities.push(city);
      this.saveState();
      this.render();
      // Scroll to added row
      setTimeout(() => {
        const rows = this.timelineRowsContainer.querySelectorAll('.timeline-row');
        if (rows.length > 0) {
          rows[rows.length - 1].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }
      }, 50);
    }
    this.closeSearch();
  }

  private removeCity(timezone: string) {
    this.selectedCities = this.selectedCities.filter(c => c.timezone !== timezone);
    this.saveState();
    this.render();
  }

  private toggleFavorite(timezone: string) {
    if (this.favoriteTimezones.has(timezone)) {
      this.favoriteTimezones.delete(timezone);
    } else {
      this.favoriteTimezones.add(timezone);
    }
    this.saveState();
    this.render();
  }

  // Timeline Drag Scruber Events
  private handleTimelinePointerDown(e: PointerEvent) {
    const track = (e.target as HTMLElement).closest('.timeline-hours-track');
    if (!track) return;
    
    if (e.pointerType === 'touch') {
      // Record starting touch position and track
      this.touchStartPos = { x: e.clientX, y: e.clientY };
      this.touchStartTrack = track;
      return; // Do not start drag-scrubbing or capture pointer yet to allow scrolling
    }

    // Only drag with left mouse click
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    this.isDragging = true;
    
    // Set capture for smooth drag outside viewport
    this.timelineRowsContainer.setPointerCapture(e.pointerId);

    // Initial snap
    this.updateFocusFromX(e.clientX, track);
  }

  private handleTimelinePointerMove(e: PointerEvent) {
    if (e.pointerType === 'touch') return;
    if (!this.isDragging) return;
    
    const track = (e.target as HTMLElement).closest('.timeline-hours-track') || document.querySelector('.timeline-hours-track');
    if (!track) return;

    this.updateFocusFromX(e.clientX, track);
  }

  private handleTimelinePointerUp(e?: PointerEvent) {
    if (e && e.pointerType === 'touch') {
      if (this.touchStartPos && this.touchStartTrack) {
        const dx = e.clientX - this.touchStartPos.x;
        const dy = e.clientY - this.touchStartPos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        // If the touch moved less than 8px, treat it as a tap/click
        if (distance < 8) {
          this.updateFocusFromX(e.clientX, this.touchStartTrack);
        }
      }
      this.touchStartPos = null;
      this.touchStartTrack = null;
      return;
    }

    if (this.isDragging) {
      this.isDragging = false;
      if (e && this.timelineRowsContainer.hasPointerCapture(e.pointerId)) {
        this.timelineRowsContainer.releasePointerCapture(e.pointerId);
      }
      this.saveState();
    }
  }

  private updateFocusFromX(clientX: number, track: Element) {
    const rect = track.getBoundingClientRect();
    const x = clientX - rect.left;
    const blockWidth = 48; // 48px
    const rawCol = Math.floor(x / blockWidth);
    const col = Math.max(0, Math.min(23, rawCol));
    
    if (this.focusHour !== col) {
      this.focusHour = col;
      this.focusScrubberInput.value = this.focusHour.toString();
      this.updateFocusIndicatorPosition();
      this.updateFocusReadout();
      this.updateShareUrl();
      this.renderOverlapWidget();
      this.updateRowClockTimes();
    }
  }

  private updateFocusIndicatorPosition() {
    const blockWidth = 48;
    const headerCol = this.scrollContainer?.querySelector('.sticky') as HTMLElement;
    const leftMargin = headerCol ? headerCol.offsetWidth : 256; // Left sticky panel
    const positionLeft = leftMargin + this.focusHour * blockWidth;
    this.focusIndicator.style.left = `${positionLeft}px`;
    
    // Set width dynamically based on meeting duration
    const durationHours = this.meetingDurationMinutes / 60;
    this.focusIndicator.style.width = `${durationHours * blockWidth}px`;
    
    // Set height dynamically based on timeline rows container height
    this.focusIndicator.style.height = `${this.timelineRowsContainer.offsetHeight}px`;
    
    // Toggle active classes in individual elements covered by the meeting block
    const allBlocks = this.timelineRowsContainer.querySelectorAll('.hour-block');
    allBlocks.forEach(block => {
      const idx = parseInt(block.getAttribute('data-hour-idx') || '-1');
      const inDuration = (idx >= this.focusHour && idx < this.focusHour + Math.ceil(durationHours)) ||
                         (this.focusHour + durationHours > 24 && (idx < (this.focusHour + durationHours) % 24)); // handle wrapping if any
      
      if (inDuration) {
        block.classList.add('ring-2', 'ring-blue-500', 'z-10', 'bg-blue-500/10', 'border-blue-500/30');
      } else {
        block.classList.remove('ring-2', 'ring-blue-500', 'z-10', 'bg-blue-500/10', 'border-blue-500/30');
      }
    });
  }

  private updateCurrentTimeIndicator() {
    const now = new Date();
    // Calculate percentage based on current home timezone time
    const homeOffset = getTimezoneOffset(this.homeTimezone, now);
    const homeLocalTime = new Date(now.getTime() + homeOffset * 60000);
    const hours = homeLocalTime.getUTCHours();
    const minutes = homeLocalTime.getUTCMinutes();
    const seconds = homeLocalTime.getUTCSeconds();
    
    const blockWidth = 48;
    const headerCol = this.scrollContainer?.querySelector('.sticky') as HTMLElement;
    const leftMargin = headerCol ? headerCol.offsetWidth : 256;
    const totalMinutes = hours * 60 + minutes + (seconds / 60);
    const indicatorLeft = leftMargin + (totalMinutes / 1440) * (24 * blockWidth);
    
    this.currentTimeLine.style.left = `${indicatorLeft}px`;
    
    // Set height dynamically based on timeline rows container height
    this.currentTimeLine.style.height = `${this.timelineRowsContainer.offsetHeight}px`;
  }

  private updateRowClockTimes() {
    const rows = this.timelineRowsContainer.querySelectorAll('.timeline-row');
    const now = new Date();

    rows.forEach(row => {
      const tz = row.getAttribute('data-timezone');
      if (!tz) return;

      const offsetMinutes = getTimezoneOffset(tz, now);
      const localTime = new Date(now.getTime() + offsetMinutes * 60000);
      const localHour = localTime.getUTCHours();
      const localMin = localTime.getUTCMinutes();
      
      let formattedTime = '';
      if (this.is24HourFormat) {
        formattedTime = localHour.toString().padStart(2, '0') + ':' + localMin.toString().padStart(2, '0');
      } else {
        const ampm = localHour >= 12 ? 'PM' : 'AM';
        let displayHour = localHour % 12;
        if (displayHour === 0) displayHour = 12;
        formattedTime = displayHour.toString().padStart(2, '0') + ':' + localMin.toString().padStart(2, '0') + ' ' + ampm;
      }
      
      const clockElement = row.querySelector('.row-clock-time');
      if (clockElement) {
        clockElement.textContent = formattedTime;
      }
    });
  }

  // Copy shareable URL
  private copyShareLink() {
    this.updateShareUrl();
    const shareUrl = window.location.href;
    
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        // Show beautiful inline notification
        this.shareToast.classList.remove('opacity-0', 'translate-y-2');
        this.shareToast.classList.add('opacity-100', 'translate-y-0');
        
        setTimeout(() => {
          this.shareToast.classList.remove('opacity-100', 'translate-y-0');
          this.shareToast.classList.add('opacity-0', 'translate-y-2');
        }, 2000);
      })
      .catch(err => {
        console.error('Failed to copy share link:', err);
      });
  }

  // Calendar exports
  private exportCalendar(type: 'google' | 'outlook' | 'apple' | 'ics') {
    // Update active label text
    const displayNames = {
      google: 'Google Calendar',
      outlook: 'Outlook Calendar',
      apple: 'Apple Calendar',
      ics: 'ICS File'
    };
    const labelSpan = this.calendarDropdownButton.querySelector('.calendar-label') as HTMLSpanElement;
    if (labelSpan) {
      labelSpan.textContent = displayNames[type];
    }

    // Calculate exact start date/time
    const start = new Date(this.selectedDate);
    start.setHours(this.focusHour, 0, 0, 0);

    const timezoneDisplay = this.selectedCities.map(c => `${c.name} (${new Intl.DateTimeFormat('en-US', { timeZone: c.timezone, hour: '2-digit', minute: '2-digit', hour12: !this.is24HourFormat }).format(start)})`).join('\n• ');
    
    const details = {
      title: 'Sync: Team Timezone Coordination',
      startDate: start,
      durationMinutes: this.meetingDurationMinutes,
      description: `Coordinated via RealTimeZones.\n\nMeeting Times:\n• ${timezoneDisplay}\n\nJoin the coordinate board: ${window.location.href}`
    };

    if (type === 'google') {
      window.open(generateGoogleCalendarUrl(details), '_blank');
    } else if (type === 'outlook') {
      window.open(generateOutlookCalendarUrl(details), '_blank');
    } else if (type === 'ics' || type === 'apple') {
      const content = generateIcsContent(details);
      const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `real-time-zones-meeting.ics`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }
  }

  // Theme settings
  private setTheme(theme: 'dark' | 'light' | 'system', save: boolean = false) {
    this.activeTheme = theme;
    localStorage.setItem('theme', theme);
    
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    this.updateThemeUI();
    if (save) {
      this.saveState();
    }
  }

  private updateThemeUI() {
    const buttons = document.querySelectorAll('.theme-btn');
    buttons.forEach(btn => {
      const t = btn.getAttribute('data-theme');
      if (t === this.activeTheme) {
        btn.classList.add('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50');
        btn.classList.remove('text-zinc-500', 'dark:text-zinc-400');
      } else {
        btn.classList.remove('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50');
        btn.classList.add('text-zinc-500', 'dark:text-zinc-400');
      }
    });

    // Update mobile theme toggle icons visibility
    const mobileBtn = document.getElementById('theme-toggle-mobile');
    if (mobileBtn) {
      const iconSystem = mobileBtn.querySelector('.theme-icon-system');
      const iconLight = mobileBtn.querySelector('.theme-icon-light');
      const iconDark = mobileBtn.querySelector('.theme-icon-dark');

      if (iconSystem) iconSystem.classList.toggle('hidden', this.activeTheme !== 'system');
      if (iconLight) iconLight.classList.toggle('hidden', this.activeTheme !== 'light');
      if (iconDark) iconDark.classList.toggle('hidden', this.activeTheme !== 'dark');

      const displayNames = { system: 'System Preference', light: 'Light Mode', dark: 'Dark Mode' };
      mobileBtn.title = `Theme: ${displayNames[this.activeTheme] || this.activeTheme} (Click to switch)`;
    }
  }

  private updateFocusReadout() {
    const startHour = this.focusHour;
    const endTotalMinutes = startHour * 60 + this.meetingDurationMinutes;
    const endHour = Math.floor(endTotalMinutes / 60) % 24;
    const endMinutes = endTotalMinutes % 60;
    
    let startHoursStr = '';
    let endHoursStr = '';
    
    if (this.is24HourFormat) {
      startHoursStr = `${startHour.toString().padStart(2, '0')}:00`;
      endHoursStr = `${endHour.toString().padStart(2, '0')}:${endMinutes.toString().padStart(2, '0')}`;
    } else {
      const startPeriod = startHour >= 12 ? 'PM' : 'AM';
      let startH = startHour % 12;
      if (startH === 0) startH = 12;
      startHoursStr = `${startH}:00 ${startPeriod}`;
      
      const endPeriod = (Math.floor(endTotalMinutes / 60) % 24) >= 12 ? 'PM' : 'AM';
      let endH = endHour % 12;
      if (endH === 0) endH = 12;
      endHoursStr = `${endH}:${endMinutes.toString().padStart(2, '0')} ${endPeriod}`;
    }
    
    let line = '━━━━';
    if (this.meetingDurationMinutes === 30) line = '━━';
    else if (this.meetingDurationMinutes === 60) line = '━━━━━━';
    else if (this.meetingDurationMinutes === 90) line = '━━━━━━━━━━';
    else if (this.meetingDurationMinutes === 120) line = '━━━━━━━━━━━━━━';
    else {
      const numChars = Math.max(2, Math.floor(this.meetingDurationMinutes / 15));
      line = '━'.repeat(numChars);
    }
    
    this.focusTimeReadout.textContent = `${startHoursStr} ${line} ${endHoursStr}`;
  }

  // Calculates the best meeting hours for the group based on participant availability
  private calculateBestTimes(): { hour: number; score: number; numWorking: number }[] {
    const participantTimezones = [this.homeTimezone];
    this.selectedCities.forEach(c => {
      if (!participantTimezones.includes(c.timezone)) {
        participantTimezones.push(c.timezone);
      }
    });

    const totalCities = participantTimezones.length;
    const results: { hour: number; score: number; numWorking: number }[] = [];

    for (let h = 0; h < 24; h++) {
      let numWorking = 0;
      let numBorder = 0;
      let numSleep = 0;

      for (const tz of participantTimezones) {
        const status = getParticipantStatusForMeeting(tz, this.selectedDate, h, this.meetingDurationMinutes);
        if (status === 'working') {
          numWorking++;
        } else if (status === 'border') {
          numBorder++;
        } else {
          numSleep++;
        }
      }

      const score = (100 * numWorking + 60 * numBorder + (-20) * numSleep) / totalCities;
      results.push({ hour: h, score, numWorking });
    }

    // Rank and Sort
    results.sort((a, b) => {
      // 1. Sort by score in descending order
      if (Math.abs(b.score - a.score) > 1e-9) {
        return b.score - a.score;
      }
      // 2. Tie breaker: prioritize hours with more Working (Green) participants
      if (b.numWorking !== a.numWorking) {
        return b.numWorking - a.numWorking;
      }
      // 3. Followed by hours closer to standard mid-day times (12:00 PM / hour 12)
      const distA = Math.abs(a.hour - 12);
      const distB = Math.abs(b.hour - 12);
      if (distA !== distB) {
        return distA - distB; // smaller distance comes first
      }
      // Default fallback
      return a.hour - b.hour;
    });

    return results.slice(0, 3);
  }

  // Renders the overlap slots recommendations
  private renderOverlapWidget() {
    const bestSlots = this.calculateBestTimes();
    
    this.overlapWidget.innerHTML = '';
    
    const explanation = getOverlapExplanation.call(this, this.selectedCities, this.homeTimezone, this.focusHour, this.meetingDurationMinutes);
    
    let starsStr = '';
    for (let i = 0; i < 5; i++) {
      starsStr += i < explanation.stars ? '★' : '☆';
    }

    let badgeColorClass = '';
    if (explanation.label === 'Excellent' || explanation.label === 'Great') {
      badgeColorClass = 'bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400';
    } else if (explanation.label === 'Fair') {
      badgeColorClass = 'bg-amber-500/10 border-amber-500/20 text-amber-600 dark:text-amber-400';
    } else if (explanation.label === 'Poor') {
      badgeColorClass = 'bg-orange-500/10 border-orange-500/20 text-orange-600 dark:text-orange-400';
    } else {
      badgeColorClass = 'bg-red-500/10 border-red-500/20 text-red-600 dark:text-red-400';
    }

    const widgetContent = document.createElement('div');
    widgetContent.className = 'grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch w-full';
    
    widgetContent.innerHTML = `
      <!-- Left Side: Quality Summary -->
      <div class="flex flex-col justify-between gap-3">
        <div>
          <h4 class="text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Meeting Quality</h4>
          
          <div class="flex items-center gap-3 mt-2">
            <span class="text-xl font-bold tracking-wider text-amber-500 font-mono select-none">${starsStr}</span>
            <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold font-mono border uppercase tracking-wider ${badgeColorClass}">
              ${explanation.label}
            </span>
          </div>
          
          <p class="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mt-3 leading-relaxed">
            ${explanation.summary}
          </p>
          <p class="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
            ${explanation.details}
          </p>
        </div>
      </div>
      
      <!-- Right Side: Smart Recommendations -->
      <div class="flex flex-col justify-between items-start md:items-end gap-3 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 md:pl-6 pt-4 md:pt-0">
        <div class="w-full md:text-right">
          <h4 class="text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Smart Recommendations</h4>
          <p class="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1">
            Best times based on participant availability for ${this.meetingDurationMinutes}m.
          </p>
          <div class="flex flex-wrap gap-2 mt-3 md:justify-end" id="recommended-slots-btn-group"></div>
        </div>
      </div>
    `;
    
    this.overlapWidget.appendChild(widgetContent);
    
    const btnGroup = widgetContent.querySelector('#recommended-slots-btn-group') as HTMLDivElement;
    
    bestSlots.forEach((slot, index) => {
      const btn = document.createElement('button');
      const isSelected = slot.hour === this.focusHour;
      btn.className = `px-3 py-1.5 text-xs font-mono rounded border transition-all duration-150 cursor-pointer ${
        isSelected 
          ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950 font-bold hover:opacity-90' 
          : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
      }`;
      
      const rank = index === 0 ? 'Best' : index === 1 ? '2nd' : '3rd';
      
      let formattedHour = '';
      if (this.is24HourFormat) {
        formattedHour = slot.hour.toString().padStart(2, '0') + ':00';
      } else {
        const ampm = slot.hour >= 12 ? 'PM' : 'AM';
        let displayHour = slot.hour % 12;
        if (displayHour === 0) displayHour = 12;
        formattedHour = `${displayHour}:00 ${ampm}`;
      }
      
      btn.textContent = `${rank}: ${formattedHour}`;
      
      btn.addEventListener('click', () => {
        this.focusHour = slot.hour;
        this.focusScrubberInput.value = this.focusHour.toString();
        this.updateFocusIndicatorPosition();
        this.updateFocusReadout();
        this.updateShareUrl();
        this.renderOverlapWidget();
        this.scrollTimelineToHour(slot.hour);
        this.updateRowClockTimes();
      });
      btnGroup.appendChild(btn);
    });
  }

  // Render everything
  public render() {
    this.saveStateDebounced();
    if (!this.selectedDateLabel) return;

    // 1. Render Date UI labels
    const showShortWeekday = window.innerWidth < 640;
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: showShortWeekday ? 'short' : 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
    this.selectedDateLabel.textContent = formatter.format(this.selectedDate);
    this.datePickerInput.value = this.selectedDate.toISOString().split('T')[0];

    // 2. Render timelines hours header
    // Clean and rebuild
    const timelineHeaders = document.getElementById('timeline-headers') as HTMLDivElement;
    timelineHeaders.innerHTML = '';
    
    for (let h = 0; h < 24; h++) {
      const hourDiv = document.createElement('div');
      hourDiv.className = 'w-12 h-10 flex flex-col justify-center items-center font-mono text-[10px] text-zinc-500 dark:text-zinc-400 font-semibold select-none';
      
      // Display AM/PM or numbers
      let label = '';
      if (this.is24HourFormat) {
        label = h.toString().padStart(2, '0');
      } else {
        if (h === 0) label = '12A';
        else if (h === 12) label = '12P';
        else if (h < 12) label = `${h}A`;
        else label = `${h - 12}P`;
      }

      hourDiv.textContent = label;
      timelineHeaders.appendChild(hourDiv);
    }

    // 3. Render Timeline Rows
    this.timelineRowsContainer.innerHTML = '';

    // ALWAYS display Pinned Home Row first
    this.renderRow({
      name: "Your Location",
      country: "Home",
      timezone: this.homeTimezone,
      population: 0
    }, true);

    // Render other selected cities
    const nonHomeCities = this.selectedCities.filter(c => c.timezone !== this.homeTimezone);
    nonHomeCities.forEach(city => {
      this.renderRow(city, false);
    });

    if (nonHomeCities.length === 0) {
      this.renderEmptyStateRow();
    }

    // 4. Update dynamic positioning elements
    this.updateFocusIndicatorPosition();
    this.updateCurrentTimeIndicator();
    this.updateRowClockTimes();
    this.updateFocusReadout();

    // 5. Render Overlap recommendation widget
    this.renderOverlapWidget();

    // 6. Update duration buttons states
    this.updateDurationButtonsUI();
  }

  private renderEmptyStateRow() {
    const row = document.createElement('div');
    row.className = 'flex w-[1312px] sm:w-[1408px] shrink-0 h-24 items-center bg-zinc-50/50 dark:bg-zinc-950/10 border-b border-zinc-200/50 dark:border-zinc-800/30';
    row.innerHTML = `
      <div class="sticky left-0 w-full md:w-[600px] px-6 py-4 flex items-center gap-4 text-zinc-500 dark:text-zinc-450 z-20">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-zinc-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>
        </svg>
        <div class="flex flex-col">
          <span class="text-xs font-semibold text-zinc-700 dark:text-zinc-300">Start by adding teammates or cities you work with.</span>
          <button type="button" class="trigger-add-city text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 dark:hover:text-blue-300 underline font-mono text-left mt-1 cursor-pointer">
            Add teammate / city (+ or ⌘K)
          </button>
        </div>
      </div>
    `;

    const addCityBtn = row.querySelector('.trigger-add-city');
    if (addCityBtn) {
      addCityBtn.addEventListener('click', () => this.openSearch());
    }

    this.timelineRowsContainer.appendChild(row);
  }

  private renderRow(city: City, isHome: boolean) {
    // Calculate offsets
    const offsetMinutes = getTimezoneOffset(city.timezone, this.selectedDate);

    const row = document.createElement('div');
    row.className = 'flex w-[1312px] sm:w-[1408px] shrink-0 h-16 items-center timeline-row transition-colors duration-150 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/10';
    row.setAttribute('data-timezone', city.timezone);

    // Star/Favorite status
    const isStarred = this.favoriteTimezones.has(city.timezone);

    // Left metadata column (sticky)
    const leftPanel = document.createElement('div');
    leftPanel.className = 'city-header-panel sticky left-0 w-40 sm:w-64 shrink-0 bg-zinc-50 dark:bg-zinc-950 z-20 h-full flex items-center justify-between px-2 sm:px-4 border-r border-zinc-200 dark:border-zinc-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] cursor-help';
    leftPanel.setAttribute('data-city-name', city.name);
    leftPanel.setAttribute('data-country', city.country);
    leftPanel.setAttribute('data-timezone', city.timezone);

    leftPanel.innerHTML = `
      <div class="flex items-center gap-1 sm:gap-2 overflow-hidden min-w-0 pr-1 sm:pr-2">
        ${
          isHome 
            ? `
              <span class="text-blue-500 dark:text-blue-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </span>
              `
            : `
              <button class="favorite-btn hidden sm:flex text-zinc-300 dark:text-zinc-700 hover:text-amber-500 dark:hover:text-amber-500 transition-colors cursor-pointer shrink-0 ${isStarred ? 'text-amber-500! dark:text-amber-500!' : ''}" title="Favorite/Pin City">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
              `
        }
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-1 min-w-0">
            <span class="text-xs sm:text-sm leading-none shrink-0" role="img" aria-label="${city.country} Flag">${getFlagEmoji(city.country, city.timezone)}</span>
            <span class="font-medium text-xs sm:text-sm text-zinc-900 dark:text-zinc-50 truncate" title="${city.name}">${city.name}</span>
          </div>
          <span class="hidden sm:block text-[11px] text-zinc-400 dark:text-zinc-500 truncate font-mono">${city.country === 'Home' ? 'Your Location' : city.country}</span>
        </div>
      </div>
      <div class="flex items-center gap-1 sm:gap-2 shrink-0">
        <div class="flex flex-col items-end min-w-[54px] sm:min-w-[72px] shrink-0 pr-0.5 sm:pr-1">
          <span class="row-clock-time font-mono text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-200">00:00</span>
          <span class="row-utc-offset font-mono text-[9px] text-zinc-400 dark:text-zinc-500 tracking-tight leading-none mt-0.5 sm:mt-1 select-none">${formatUtcOffset(offsetMinutes)}</span>
        </div>
        ${
          !isHome
            ? `
              <button class="remove-btn text-zinc-400 dark:text-zinc-650 hover:text-red-500 dark:hover:text-red-400 transition-colors cursor-pointer p-0.5 sm:p-1 rounded hover:bg-zinc-150 dark:hover:bg-zinc-900 shrink-0" title="Remove city">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              </button>
              `
            : ''
        }
      </div>
    `;

    // Hook up delete and star button click events
    const removeBtn = leftPanel.querySelector('.remove-btn');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.removeCity(city.timezone);
      });
    }

    const favBtn = leftPanel.querySelector('.favorite-btn');
    if (favBtn) {
      favBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.toggleFavorite(city.timezone);
      });
    }

    // Drag and Drop City Reordering
    leftPanel.setAttribute('draggable', 'true');
    leftPanel.classList.add('cursor-grab', 'active:cursor-grabbing');

    leftPanel.addEventListener('dragstart', (e) => {
      e.dataTransfer?.setData('text/plain', city.timezone);
      row.classList.add('opacity-40', 'bg-zinc-100/50', 'dark:bg-zinc-900/50');
    });

    leftPanel.addEventListener('dragend', () => {
      row.classList.remove('opacity-40', 'bg-zinc-100/50', 'dark:bg-zinc-900/50');
      this.timelineRowsContainer.querySelectorAll('.timeline-row').forEach((r) => {
        r.classList.remove('border-t-2', 'border-t-emerald-500', 'border-b-2', 'border-b-emerald-500');
      });
    });

    row.addEventListener('dragover', (e) => {
      e.preventDefault();
      const rect = row.getBoundingClientRect();
      const midY = rect.top + rect.height / 2;
      if (e.clientY < midY) {
        row.classList.add('border-t-2', 'border-t-emerald-500');
        row.classList.remove('border-b-2', 'border-b-emerald-500');
      } else {
        row.classList.add('border-b-2', 'border-b-emerald-500');
        row.classList.remove('border-t-2', 'border-t-emerald-500');
      }
    });

    row.addEventListener('dragleave', () => {
      row.classList.remove('border-t-2', 'border-t-emerald-500', 'border-b-2', 'border-b-emerald-500');
    });

    row.addEventListener('drop', (e) => {
      e.preventDefault();
      row.classList.remove('border-t-2', 'border-t-emerald-500', 'border-b-2', 'border-b-emerald-500');
      const srcTz = e.dataTransfer?.getData('text/plain');
      if (srcTz && srcTz !== city.timezone) {
        const srcIdx = this.cities.findIndex((c) => c.timezone === srcTz);
        let targetIdx = this.cities.findIndex((c) => c.timezone === city.timezone);
        if (srcIdx !== -1 && targetIdx !== -1) {
          const rect = row.getBoundingClientRect();
          const midY = rect.top + rect.height / 2;
          if (e.clientY >= midY && srcIdx > targetIdx) {
            targetIdx += 1;
          }
          const [moved] = this.cities.splice(srcIdx, 1);
          this.cities.splice(targetIdx, 0, moved);
          this.saveCities();
          this.renderRows();
        }
      }
    });

    row.appendChild(leftPanel);

    // Right 24 hour track column
    const track = document.createElement('div');
    track.className = 'flex w-[1152px] shrink-0 timeline-hours-track relative select-none';

    const baseHourDate = new Date(this.selectedDate);

    for (let h = 0; h < 24; h++) {
      // Calculate local hour for this block
      const dateAtHour = new Date(baseHourDate);
      dateAtHour.setHours(h, 0, 0, 0);

      const offset = getTimezoneOffset(city.timezone, dateAtHour);
      const localTime = new Date(dateAtHour.getTime() + offset * 60000);
      const localHour = localTime.getUTCHours();
      const category = getHourCategory(localHour);

      const localDayOfWeek = new Intl.DateTimeFormat('en-US', { weekday: 'long', timeZone: city.timezone }).format(dateAtHour);

      let displayHour = localHour;
      let ampm = localHour >= 12 ? 'pm' : 'am';
      let dataLocalTime = '';
      
      if (this.is24HourFormat) {
        dataLocalTime = `${localHour.toString().padStart(2, '0')}:00`;
      } else {
        displayHour = localHour % 12;
        if (displayHour === 0) displayHour = 12;
        dataLocalTime = `${displayHour}:00 ${ampm.toUpperCase()}`;
      }

      const formattedLocalHour = displayHour.toString().padStart(2, '0');

      // Setup styling based on category
      let categoryClass = '';
      if (category === 'working') {
        categoryClass = 'bg-emerald-500/5 text-emerald-600 dark:text-emerald-400 border-emerald-500/10 dark:border-emerald-500/10 hover:bg-emerald-500/10';
      } else if (category === 'border') {
        categoryClass = 'bg-amber-500/5 text-amber-600 dark:text-amber-400 border-amber-500/10 dark:border-amber-500/10 hover:bg-amber-500/10';
      } else {
        categoryClass = 'bg-red-500/2 text-zinc-400 dark:text-zinc-500 border-red-500/5 dark:border-red-500/5 hover:bg-red-500/5';
      }

      const hourBlock = document.createElement('div');
      hourBlock.className = `hour-block w-12 h-16 flex flex-col items-center justify-center font-mono border-r border-b border-zinc-200/50 dark:border-zinc-800/30 text-xs shrink-0 cursor-ew-resize transition-all ${categoryClass}`;
      hourBlock.setAttribute('data-hour-idx', h.toString());
      hourBlock.setAttribute('data-city-name', city.name);
      hourBlock.setAttribute('data-local-time', dataLocalTime);
      hourBlock.setAttribute('data-category', category);
      hourBlock.setAttribute('data-offset', formatUtcOffset(offset));
      hourBlock.setAttribute('data-weekday', localDayOfWeek);
      
      if (this.is24HourFormat) {
        hourBlock.innerHTML = `
          <span class="font-bold">${formattedLocalHour}</span>
          <span class="text-[10px] tracking-tighter opacity-60 mt-0.5">:00</span>
        `;
      } else {
        hourBlock.innerHTML = `
          <span class="font-bold">${formattedLocalHour}</span>
          <span class="text-[10px] tracking-tighter opacity-60 mt-0.5">${ampm}</span>
        `;
      }

      track.appendChild(hourBlock);
    }

    row.appendChild(track);
    this.timelineRowsContainer.appendChild(row);
  }

  // Tooltip event handlers
  private setupTooltipListeners() {
    if (!this.timelineRowsContainer) return;
    this.timelineRowsContainer.addEventListener('mouseover', (e) => {
      const target = e.target as HTMLElement;
      
      const hourBlock = target.closest('.hour-block') as HTMLDivElement;
      if (hourBlock) {
        this.showCellTooltip(hourBlock);
        return;
      }

      const cityHeader = target.closest('.city-header-panel') as HTMLDivElement;
      if (cityHeader) {
        this.showCityTooltip(cityHeader);
        return;
      }
    });

    this.timelineRowsContainer.addEventListener('mousemove', (e) => {
      this.positionTooltip(e);
    });

    this.timelineRowsContainer.addEventListener('mouseout', (e) => {
      const target = e.target as HTMLElement;
      const related = e.relatedTarget as HTMLElement;
      
      if (
        (target.closest('.hour-block') && (!related || !related.closest('.hour-block'))) ||
        (target.closest('.city-header-panel') && (!related || !related.closest('.city-header-panel')))
      ) {
        this.hideTooltip();
      }
    });
  }

  private showCellTooltip(el: HTMLDivElement) {
    const weekday = el.getAttribute('data-weekday') || '';
    const time = el.getAttribute('data-local-time') || '';
    const category = el.getAttribute('data-category') || '';
    const offset = el.getAttribute('data-offset') || '';
    const city = el.getAttribute('data-city-name') || '';
    
    let categoryLabel = 'Working Hours';
    let bulletClass = 'bg-emerald-500';
    if (category === 'border') {
      categoryLabel = 'Border Hours';
      bulletClass = 'bg-amber-500';
    } else if (category === 'sleep') {
      categoryLabel = 'Sleep Hours';
      bulletClass = 'bg-red-500';
    }

    this.tooltipEl.innerHTML = `
      <div class="font-bold text-zinc-300">${weekday}</div>
      <div class="text-[13px] font-extrabold text-white my-0.5">${time}</div>
      <div class="flex items-center gap-1 mt-1 text-[10px]">
        <span class="w-1.5 h-1.5 rounded-full ${bulletClass}"></span>
        <span class="font-semibold text-zinc-200">${categoryLabel}</span>
      </div>
      <div class="text-zinc-400 mt-1.5 text-[9px] font-semibold">${offset}</div>
      <div class="text-zinc-400 text-[9px]">${city}</div>
    `;
    
    this.tooltipEl.classList.remove('opacity-0', 'scale-95');
    this.tooltipEl.classList.add('opacity-100', 'scale-100');
  }

  private showCityTooltip(el: HTMLDivElement) {
    const cityName = el.getAttribute('data-city-name') || '';
    const countryName = el.getAttribute('data-country') || '';
    const timezone = el.getAttribute('data-timezone') || '';
    
    const now = new Date();
    const offset = getTimezoneOffset(timezone, now);
    const localTime = new Date(now.getTime() + offset * 60000);
    const localHour = localTime.getUTCHours();
    const localMin = localTime.getUTCMinutes();
    
    let formattedTime = '';
    if (this.is24HourFormat) {
      formattedTime = localHour.toString().padStart(2, '0') + ':' + localMin.toString().padStart(2, '0');
    } else {
      const ampm = localHour >= 12 ? 'PM' : 'AM';
      let displayHour = localHour % 12;
      if (displayHour === 0) displayHour = 12;
      formattedTime = displayHour.toString().padStart(2, '0') + ':' + localMin.toString().padStart(2, '0') + ' ' + ampm;
    }
    
    const offsetStr = formatUtcOffset(offset);

    this.tooltipEl.innerHTML = `
      <div class="font-bold text-white text-xs">${cityName}</div>
      <div class="text-zinc-400 text-[9px]">${countryName === 'Home' ? 'Your Location' : countryName}</div>
      <div class="mt-2 text-zinc-400 text-[9px] uppercase tracking-wider font-semibold">Current Time</div>
      <div class="text-sm font-extrabold text-white">${formattedTime}</div>
      <div class="mt-2 text-zinc-400 text-[9px] uppercase tracking-wider font-semibold">Timezone</div>
      <div class="text-zinc-300 text-[9px] break-all leading-tight">${timezone}</div>
      <div class="text-zinc-400 font-bold mt-1 text-[9px]">${offsetStr}</div>
    `;

    this.tooltipEl.classList.remove('opacity-0', 'scale-95');
    this.tooltipEl.classList.add('opacity-100', 'scale-100');
  }

  private positionTooltip(e: MouseEvent) {
    let left = e.clientX + 12;
    let top = e.clientY + 12;
    
    const tooltipWidth = this.tooltipEl.offsetWidth || 160;
    const tooltipHeight = this.tooltipEl.offsetHeight || 130;
    
    if (left + tooltipWidth > window.innerWidth) {
      left = e.clientX - tooltipWidth - 12;
    }
    if (top + tooltipHeight > window.innerHeight) {
      top = e.clientY - tooltipHeight - 12;
    }
    
    this.tooltipEl.style.left = `${left}px`;
    this.tooltipEl.style.top = `${top}px`;
  }

  private hideTooltip() {
    this.tooltipEl.classList.remove('opacity-100', 'scale-100');
    this.tooltipEl.classList.add('opacity-0', 'scale-95');
  }
}

// Instantiate and initialize when DOM is loaded
let app: RealTimeZonesApp;
document.addEventListener('DOMContentLoaded', () => {
  app = new RealTimeZonesApp();
  app.init();
});
