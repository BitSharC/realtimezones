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
  let numWorking = 0;
  let numBorder = 0;
  let numSleep = 0;
  
  const sleepingCities: string[] = [];
  const borderCities: { name: string; localHour: number }[] = [];

  const getCityHourText = (tz: string) => {
    const start = new Date(this.getSelectedDate());
    start.setHours(startHour, 0, 0, 0);
    const offset = getTimezoneOffset(tz, start);
    const localTime = new Date(start.getTime() + offset * 60000);
    return localTime.getUTCHours();
  };
  
  // Home timezone status
  const homeStatus = getParticipantStatusForMeeting(homeTimezone, this.getSelectedDate(), startHour, durationMinutes);
  const homeLocalHour = getCityHourText(homeTimezone);
  if (homeStatus === 'working') {
    numWorking++;
  } else if (homeStatus === 'border') {
    numBorder++;
    borderCities.push({ name: "Your Location", localHour: homeLocalHour });
  } else {
    numSleep++;
    sleepingCities.push("Your Location");
  }

  // Evaluate other cities
  uniqueCities.forEach(city => {
    const status = getParticipantStatusForMeeting(city.timezone, this.getSelectedDate(), startHour, durationMinutes);
    const localHour = getCityHourText(city.timezone);
    
    if (status === 'working') {
      numWorking++;
    } else if (status === 'border') {
      numBorder++;
      borderCities.push({ name: city.name, localHour });
    } else {
      numSleep++;
      sleepingCities.push(city.name);
    }
  });

  let stars = 3;
  let label = 'Fair';
  
  if (numSleep > 0) {
    if (numSleep === P || (numSleep / P >= 0.5 && P >= 2) || (numWorking === 0 && numBorder === 0)) {
      stars = 1;
      label = 'Avoid';
    } else {
      stars = 2;
      label = 'Poor';
    }
  } else {
    const workingRatio = numWorking / P;
    if (numWorking === P) {
      stars = 5;
      label = 'Excellent';
    } else if (workingRatio >= 0.65) {
      stars = 4;
      label = 'Great';
    } else if (workingRatio >= 0.35 || (P === 1 && numBorder === 1)) {
      stars = 3;
      label = 'Fair';
    } else {
      stars = 2;
      label = 'Poor';
    }
  }

  const summary = `${numWorking} of ${P} participant${P > 1 ? 's' : ''} inside working hours.`;
  
  let details = '';
  if (sleepingCities.length > 0) {
    details = `${sleepingCities.join(', ')} will be sleeping.`;
  } else if (borderCities.length > 0) {
    const detailsArr = borderCities.map(c => {
      let formattedHour = '';
      if (this.is24HourFormat) {
        formattedHour = `${c.localHour.toString().padStart(2, '0')}:00`;
      } else {
        const ampm = c.localHour >= 12 ? 'PM' : 'AM';
        let displayHour = c.localHour % 12;
        if (displayHour === 0) displayHour = 12;
        formattedHour = `${displayHour}:00 ${ampm}`;
      }

      if (c.localHour >= 18 && c.localHour < 22) {
        return `${c.name} is approaching evening (${formattedHour})`;
      } else {
        return `${c.name} is starting their day (${formattedHour})`;
      }
    });
    details = detailsArr.join(', ') + '.';
  } else {
    details = 'All participants are inside optimal working hours.';
  }

  return { stars, label, summary, details };
}

interface SavedState {
  cities: string[]; // Timezone identifiers
  favorites: string[]; // Timezone identifiers
}

class RealTimeZonesApp {
  // State
  private homeTimezone: string;
  private selectedCities: City[] = [];
  private favoriteTimezones: Set<string> = new Set();
  private focusHour: number = new Date().getHours();
  private selectedDate: Date = new Date();
  private activeTheme: 'dark' | 'light' | 'system' = 'system';
  private meetingDurationMinutes: number = 60; // 60 minutes default
  private is24HourFormat: boolean = false; // 24-hour time format default false (12h)

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
  }

  private loadState() {
    // 1. Theme configuration
    this.activeTheme = (localStorage.getItem('theme') as 'dark' | 'light' | 'system') || 'system';

    // 2. Parse URL parameters (takes precedence over localStorage)
    const params = new URLSearchParams(window.location.search);
    const urlCities = params.get('cities');
    const urlFocus = params.get('focus');
    const urlDate = params.get('date');
    const urlDuration = params.get('duration');

    // Load favorites from local storage
    try {
      const storedFavorites = localStorage.getItem('rtz_favorites');
      if (storedFavorites) {
        const parsed = JSON.parse(storedFavorites);
        this.favoriteTimezones = new Set(parsed);
      }
    } catch (e) {
      console.error('Error loading favorites:', e);
    }

    if (urlCities) {
      // Recreate from URL params
      const cityList = urlCities.split(',');
      this.selectedCities = [];
      
      // Find matching cities from our dataset
      for (const cityName of cityList) {
        const decoded = decodeURIComponent(cityName);
        const match = cities.find((c: City) => c.name.toLowerCase() === decoded.toLowerCase() || c.timezone === decoded);
        if (match && !this.selectedCities.some(existing => existing.timezone === match.timezone)) {
          this.selectedCities.push(match);
        }
      }
    } else {
      // Load selected cities from localStorage
      try {
        const stored = localStorage.getItem('rtz_state');
        if (stored) {
          const parsed = JSON.parse(stored) as SavedState;
          this.selectedCities = [];
          for (const tz of parsed.cities) {
            const match = cities.find((c: City) => c.timezone === tz);
            if (match) this.selectedCities.push(match);
          }
        }
      } catch (e) {
        console.error('Error loading stored state:', e);
      }
    }

    // Default cities if empty
    if (this.selectedCities.length === 0) {
      // Add London, Tokyo, San Francisco as default tech grid
      const defaults = ["Europe/London", "Asia/Tokyo", "America/Los_Angeles"];
      for (const tz of defaults) {
        const match = cities.find((c: City) => c.timezone === tz);
        if (match) this.selectedCities.push(match);
      }
    }

    // Load Focus hour
    if (urlFocus) {
      const parsedFocus = parseInt(urlFocus);
      if (!isNaN(parsedFocus) && parsedFocus >= 0 && parsedFocus < 24) {
        this.focusHour = parsedFocus;
      }
    } else {
      this.focusHour = new Date().getHours();
    }

    // Load Date
    if (urlDate) {
      const parsedDate = new Date(urlDate);
      if (!isNaN(parsedDate.getTime())) {
        this.selectedDate = parsedDate;
        this.selectedDate.setHours(0, 0, 0, 0);
      }
    }

    // Load Duration
    if (urlDuration) {
      const parsedDur = parseInt(urlDuration);
      if (!isNaN(parsedDur) && parsedDur >= 15 && parsedDur <= 1440) {
        this.meetingDurationMinutes = parsedDur;
      }
    } else {
      const storedDur = localStorage.getItem('rtz_duration');
      if (storedDur) {
        const parsedDur = parseInt(storedDur);
        if (!isNaN(parsedDur) && parsedDur >= 15 && parsedDur <= 1440) {
          this.meetingDurationMinutes = parsedDur;
        }
      }
    }

    // Load Time Format
    const urlFormat = params.get('format');
    if (urlFormat) {
      this.is24HourFormat = urlFormat === '24h';
    } else {
      const storedFormat = localStorage.getItem('rtz_format');
      if (storedFormat) {
        this.is24HourFormat = storedFormat === '24h';
      } else {
        this.is24HourFormat = false;
      }
    }
  }

  private saveState() {
    const stateObj: SavedState = {
      cities: this.selectedCities.map(c => c.timezone),
      favorites: Array.from(this.favoriteTimezones)
    };
    localStorage.setItem('rtz_state', JSON.stringify(stateObj));
    localStorage.setItem('rtz_favorites', JSON.stringify(Array.from(this.favoriteTimezones)));
    localStorage.setItem('rtz_duration', this.meetingDurationMinutes.toString());
    localStorage.setItem('rtz_format', this.is24HourFormat ? '24h' : '12h');
    this.updateShareUrl();
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
    this.searchInput.addEventListener('input', () => this.handleSearchInput());
    this.searchModal.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
    
    // Close modal clicks
    this.searchModal.addEventListener('click', (e) => {
      if (e.target === this.searchModal || (e.target as HTMLElement).closest('.close-modal')) {
        this.closeSearch();
      }
    });

    // 3. Date switcher
    document.getElementById('prev-day')?.addEventListener('click', () => this.adjustDate(-1));
    document.getElementById('next-day')?.addEventListener('click', () => this.adjustDate(1));
    document.getElementById('reset-now')?.addEventListener('click', () => this.resetToNow());

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

    // 4. Focus Scrubber
    this.focusScrubberInput.addEventListener('input', () => {
      this.focusIndicator.classList.add('dragging');
      this.focusHour = parseInt(this.focusScrubberInput.value);
      this.updateFocusIndicatorPosition();
      this.updateFocusReadout();
      this.updateShareUrl();
      this.renderOverlapWidget();
      this.updateRowClockTimes();
    });
    this.focusScrubberInput.addEventListener('pointerdown', () => {
      this.focusIndicator.classList.add('dragging');
    });
    this.focusScrubberInput.addEventListener('pointerup', () => {
      this.focusIndicator.classList.remove('dragging');
    });
    this.focusScrubberInput.addEventListener('touchstart', () => {
      this.focusIndicator.classList.add('dragging');
    });
    this.focusScrubberInput.addEventListener('touchend', () => {
      this.focusIndicator.classList.remove('dragging');
    });

    // 5. Timeline scrubbing via mouse drag/touch
    this.timelineRowsContainer.addEventListener('pointerdown', (e) => this.handleTimelinePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handleTimelinePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handleTimelinePointerUp(e));

    // 6. Share trigger
    this.shareButton.addEventListener('click', () => this.copyShareLink());

    // 7. Calendar Export Dropdown
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

    // 8. Theme toggles
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme') as 'dark' | 'light' | 'system';
        this.setTheme(theme);
      });
    });

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
    this.scrollContainer.addEventListener('wheel', (e) => {
      if (e.deltaY !== 0 && e.deltaX === 0) {
        e.preventDefault();
        this.scrollContainer.scrollLeft += e.deltaY;
      }
    }, { passive: false });

    this.timelineRowsContainer.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.focusIndicator.classList.add('dragging');
      if (e.deltaY > 0) {
        this.focusHour = (this.focusHour + 1) % 24;
      } else {
        this.focusHour = (this.focusHour - 1 + 24) % 24;
      }
      this.focusScrubberInput.value = this.focusHour.toString();
      this.updateFocusIndicatorPosition();
      this.updateFocusReadout();
      this.updateShareUrl();
      this.renderOverlapWidget();
      this.updateRowClockTimes();
      
      // Restore animation transition after a short tick
      setTimeout(() => {
        if (!this.isDragging) {
          this.focusIndicator.classList.remove('dragging');
        }
      }, 50);
    }, { passive: false });

    // 8e. Time Format Switcher toggles
    document.getElementById('time-format-12h')?.addEventListener('click', () => this.setTimeFormat(false));
    document.getElementById('time-format-24h')?.addEventListener('click', () => this.setTimeFormat(true));

    // 8f. Custom Duration Slider input listener
    this.durationSliderInput.addEventListener('input', () => {
      this.setDuration(parseInt(this.durationSliderInput.value));
    });

    // 8h. Custom Duration Manual Input listener
    this.durationSliderValue.addEventListener('input', () => {
      const parsed = parseDurationInput(this.durationSliderValue.value);
      if (parsed !== null && parsed >= 15 && parsed <= 720) {
        this.meetingDurationMinutes = parsed;
        this.durationSliderInput.value = parsed.toString();
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

    // 8g. Custom hover tooltips
    this.setupTooltipListeners();

    // 9. Keyboard Help Trigger
    document.getElementById('trigger-keyboard-help')?.addEventListener('click', () => {
      this.keyboardHelpModal.classList.remove('hidden');
    });
    this.keyboardHelpModal.addEventListener('click', (e) => {
      if (e.target === this.keyboardHelpModal || (e.target as HTMLElement).closest('.close-modal')) {
        this.keyboardHelpModal.classList.add('hidden');
      }
    });

    // 10. Global keyboard shortcuts
    window.addEventListener('keydown', (e) => this.handleGlobalKeydowns(e));
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
    const isSearchOpen = !this.searchModal.classList.contains('hidden');
    const isKeyHelpOpen = !this.keyboardHelpModal.classList.contains('hidden');

    if (e.key === 'Escape') {
      if (isSearchOpen) this.closeSearch();
      if (isKeyHelpOpen) this.keyboardHelpModal.classList.add('hidden');
      this.calendarDropdownMenu.classList.add('hidden');
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
    const stickyWidth = 256;
    const viewportWidth = this.scrollContainer.clientWidth;
    const targetScroll = (hour * blockWidth) + stickyWidth - (viewportWidth / 2) + (blockWidth / 2);
    this.scrollContainer.scrollTo({ left: Math.max(0, targetScroll), behavior: 'smooth' });
  }

  private startTimeTicker() {
    // Update active vertical line position every minute
    setInterval(() => {
      this.updateCurrentTimeIndicator();
      this.updateRowClockTimes();
    }, 60000);
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
    
    // Only drag with left mouse click or touch
    if (e.button !== 0 && e.pointerType === 'mouse') return;

    this.isDragging = true;
    
    // Set capture for smooth drag outside viewport
    this.timelineRowsContainer.setPointerCapture(e.pointerId);

    // Initial snap
    this.updateFocusFromX(e.clientX, track);
  }

  private handleTimelinePointerMove(e: PointerEvent) {
    if (!this.isDragging) return;
    
    const track = (e.target as HTMLElement).closest('.timeline-hours-track') || document.querySelector('.timeline-hours-track');
    if (!track) return;

    this.updateFocusFromX(e.clientX, track);
  }

  private handleTimelinePointerUp(e?: PointerEvent) {
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
    const leftMargin = 256; // Left sticky panel
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
    
    const blockWidth = 48;
    const leftMargin = 256;
    const totalMinutes = hours * 60 + minutes;
    const indicatorLeft = leftMargin + (totalMinutes / 1440) * (24 * blockWidth);
    
    this.currentTimeLine.style.left = `${indicatorLeft}px`;
    
    // Set height dynamically based on timeline rows container height
    this.currentTimeLine.style.height = `${this.timelineRowsContainer.offsetHeight}px`;
  }

  private updateRowClockTimes() {
    const rows = this.timelineRowsContainer.querySelectorAll('.timeline-row');
    const baseDate = new Date(this.selectedDate);
    baseDate.setHours(this.focusHour, 0, 0, 0);

    rows.forEach(row => {
      const tz = row.getAttribute('data-timezone');
      if (!tz) return;

      const offsetMinutes = getTimezoneOffset(tz, baseDate);
      const localTime = new Date(baseDate.getTime() + offsetMinutes * 60000);
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
  private setTheme(theme: 'dark' | 'light' | 'system') {
    this.activeTheme = theme;
    localStorage.setItem('theme', theme);
    
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    this.updateThemeUI();
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

  // Renders the overlap slots recommendations
  private renderOverlapWidget() {
    const otherTimezones = this.selectedCities.map(c => c.timezone);
    const slots = calculateOverlap(this.selectedDate, this.homeTimezone, otherTimezones, this.meetingDurationMinutes);
    
    const sorted = [...slots].sort((a, b) => b.score - a.score);
    const bestSlots = sorted.slice(0, 3);
    
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
      <div class="flex flex-col justify-between items-start md:items-end gap-3 border-t md:border-t-0 md:border-l border-zinc-150 dark:border-zinc-800 md:pl-6 pt-4 md:pt-0">
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
      const isSelected = slot.homeHour === this.focusHour;
      btn.className = `px-3 py-1.5 text-xs font-mono rounded border transition-all duration-150 cursor-pointer ${
        isSelected 
          ? 'bg-zinc-900 border-zinc-900 text-white dark:bg-zinc-50 dark:border-zinc-50 dark:text-zinc-950 font-bold hover:opacity-90' 
          : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700 hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50'
      }`;
      
      const rank = index === 0 ? 'Best' : index === 1 ? '2nd' : '3rd';
      
      let formattedHour = '';
      if (this.is24HourFormat) {
        formattedHour = slot.homeHour.toString().padStart(2, '0') + ':00';
      } else {
        const ampm = slot.homeHour >= 12 ? 'PM' : 'AM';
        let displayHour = slot.homeHour % 12;
        if (displayHour === 0) displayHour = 12;
        formattedHour = `${displayHour}:00 ${ampm}`;
      }
      
      btn.textContent = `${rank}: ${formattedHour}`;
      
      btn.addEventListener('click', () => {
        this.focusHour = slot.homeHour;
        this.focusScrubberInput.value = this.focusHour.toString();
        this.updateFocusIndicatorPosition();
        this.updateFocusReadout();
        this.updateShareUrl();
        this.renderOverlapWidget();
        this.scrollTimelineToHour(slot.homeHour);
        this.updateRowClockTimes();
      });
      btnGroup.appendChild(btn);
    });
  }

  // Render everything
  public render() {
    this.saveState();

    // 1. Render Date UI labels
    const formatter = new Intl.DateTimeFormat('en-US', {
      weekday: 'long',
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
    this.selectedCities.forEach(city => {
      // Avoid duplicating home timezone if it is added
      if (city.timezone !== this.homeTimezone) {
        this.renderRow(city, false);
      }
    });

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

  private renderRow(city: City, isHome: boolean) {
    // Calculate offsets
    const offsetMinutes = getTimezoneOffset(city.timezone, this.selectedDate);

    const row = document.createElement('div');
    row.className = 'flex w-[1408px] shrink-0 h-16 items-center timeline-row group transition-colors duration-150 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/10';
    row.setAttribute('data-timezone', city.timezone);

    // Star/Favorite status
    const isStarred = this.favoriteTimezones.has(city.timezone);

    // Left metadata column (sticky)
    const leftPanel = document.createElement('div');
    leftPanel.className = 'city-header-panel sticky left-0 w-64 shrink-0 bg-zinc-50 dark:bg-zinc-950 z-20 h-full flex items-center justify-between px-4 border-r border-zinc-200 dark:border-zinc-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)] cursor-help';
    leftPanel.setAttribute('data-city-name', city.name);
    leftPanel.setAttribute('data-country', city.country);
    leftPanel.setAttribute('data-timezone', city.timezone);

    leftPanel.innerHTML = `
      <div class="flex items-center gap-2 overflow-hidden min-w-0 pr-2">
        ${
          isHome 
            ? `
              <span class="text-blue-500 dark:text-blue-400 shrink-0">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
              </span>
              `
            : `
              <button class="favorite-btn text-zinc-300 dark:text-zinc-700 hover:text-amber-500 dark:hover:text-amber-500 transition-colors cursor-pointer shrink-0 ${isStarred ? 'text-amber-500! dark:text-amber-500!' : ''}" title="Favorite/Pin City">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" viewBox="0 0 24 24" fill="${isStarred ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              </button>
              `
        }
        <div class="flex flex-col min-w-0">
          <div class="flex items-center gap-1.5 min-w-0">
            <span class="text-sm leading-none shrink-0" role="img" aria-label="${city.country} Flag">${getFlagEmoji(city.country, city.timezone)}</span>
            <span class="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate" title="${city.name}">${city.name}</span>
          </div>
          <span class="text-[11px] text-zinc-400 dark:text-zinc-500 truncate font-mono">${city.country === 'Home' ? 'Your Location' : city.country}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="flex flex-col items-end min-w-[72px] shrink-0 pr-1">
          <span class="row-clock-time font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">00:00</span>
          <span class="row-utc-offset font-mono text-[9px] text-zinc-400 dark:text-zinc-500 tracking-tight leading-none mt-1 select-none">${formatUtcOffset(offsetMinutes)}</span>
        </div>
        ${
          !isHome
            ? `
              <button class="remove-btn text-zinc-300 dark:text-zinc-700 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 cursor-pointer p-1 rounded hover:bg-zinc-100 dark:hover:bg-zinc-900" title="Remove city">
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
      hourBlock.className = `hour-block w-12 h-16 flex flex-col justify-center items-center font-mono border-r border-b border-zinc-200/50 dark:border-zinc-800/30 text-xs shrink-0 cursor-ew-resize transition-all ${categoryClass}`;
      hourBlock.setAttribute('data-hour-idx', h.toString());
      hourBlock.setAttribute('data-city-name', city.name);
      hourBlock.setAttribute('data-local-time', dataLocalTime);
      hourBlock.setAttribute('data-category', category);
      hourBlock.setAttribute('data-offset', formatUtcOffset(offset));
      hourBlock.setAttribute('data-weekday', localDayOfWeek);
      
      if (this.is24HourFormat) {
        hourBlock.innerHTML = `
          <span class="font-bold">${formattedLocalHour}</span>
          <span class="text-[9px] scale-90 opacity-60 mt-0.5">:00</span>
        `;
      } else {
        hourBlock.innerHTML = `
          <span class="font-bold">${formattedLocalHour}</span>
          <span class="text-[9px] scale-90 opacity-60 mt-0.5">${ampm}</span>
        `;
      }

      track.appendChild(hourBlock);
    }

    row.appendChild(track);
    this.timelineRowsContainer.appendChild(row);
  }

  // Tooltip event handlers
  private setupTooltipListeners() {
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
