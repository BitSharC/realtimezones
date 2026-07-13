import { searchCities } from './city-db';
import {
  getTimezoneOffset,
  formatOffset,
  getHourCategory,
  calculateOverlap,
  generateGoogleCalendarUrl,
  generateOutlookCalendarUrl,
  generateIcsContent
} from './time-utils';
import { cities, type City } from '../data/cities';

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
  
  // Scrubber elements
  private focusScrubberInput!: HTMLInputElement;
  private focusTimeReadout!: HTMLSpanElement;

  // Drag-to-scrub state
  private isDragging = false;


  constructor() {
    this.homeTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    this.selectedDate.setHours(0, 0, 0, 0); // normalize date to start of day
  }

  public init() {
    this.cacheElements();
    this.loadState();
    this.setupEventListeners();
    this.updateThemeUI();
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
  }

  private loadState() {
    // 1. Theme configuration
    this.activeTheme = (localStorage.getItem('theme') as 'dark' | 'light' | 'system') || 'system';

    // 2. Parse URL parameters (takes precedence over localStorage)
    const params = new URLSearchParams(window.location.search);
    const urlCities = params.get('cities');
    const urlFocus = params.get('focus');
    const urlDate = params.get('date');

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
  }

  private saveState() {
    const stateObj: SavedState = {
      cities: this.selectedCities.map(c => c.timezone),
      favorites: Array.from(this.favoriteTimezones)
    };
    localStorage.setItem('rtz_state', JSON.stringify(stateObj));
    localStorage.setItem('rtz_favorites', JSON.stringify(Array.from(this.favoriteTimezones)));
    this.updateShareUrl();
  }

  private updateShareUrl() {
    const params = new URLSearchParams();
    params.set('cities', this.selectedCities.map(c => encodeURIComponent(c.name)).join(','));
    params.set('focus', this.focusHour.toString());
    params.set('date', this.selectedDate.toISOString().split('T')[0]);
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
    this.searchInput.addEventListener('keydown', (e) => this.handleSearchKeydown(e));
    
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
      this.focusHour = parseInt(this.focusScrubberInput.value);
      this.updateFocusIndicatorPosition();
      this.updateFocusReadout();
      this.updateShareUrl();
      this.renderOverlapWidget();
    });

    // 5. Timeline scrubbing via mouse drag/touch
    this.timelineRowsContainer.addEventListener('pointerdown', (e) => this.handleTimelinePointerDown(e));
    window.addEventListener('pointermove', (e) => this.handleTimelinePointerMove(e));
    window.addEventListener('pointerup', () => this.handleTimelinePointerUp());

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
    document.getElementById('export-ics')?.addEventListener('click', () => this.exportCalendar('ics'));

    // 8. Theme toggles
    const themeButtons = document.querySelectorAll('.theme-btn');
    themeButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const theme = btn.getAttribute('data-theme') as 'dark' | 'light' | 'system';
        this.setTheme(theme);
      });
    });

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
      btn.className = `w-full px-4 py-3 flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-900 border-b border-zinc-100 dark:border-zinc-800 transition-colors text-left focus:bg-zinc-100 dark:focus:bg-zinc-900 focus:outline-none search-result-item ${index === 0 ? 'bg-zinc-50 dark:bg-zinc-900/50' : ''}`;
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
      if (item === document.activeElement || item.classList.contains('bg-zinc-50') || item.classList.contains('dark:bg-zinc-900/50')) {
        activeIndex = idx;
      }
    });

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIdx = (activeIndex + 1) % items.length;
      items.forEach(it => it.classList.remove('bg-zinc-50', 'dark:bg-zinc-900/50'));
      (items[nextIdx] as HTMLButtonElement).focus();
      items[nextIdx].classList.add('bg-zinc-50', 'dark:bg-zinc-900/50');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIdx = (activeIndex - 1 + items.length) % items.length;
      items.forEach(it => it.classList.remove('bg-zinc-50', 'dark:bg-zinc-900/50'));
      (items[prevIdx] as HTMLButtonElement).focus();
      items[prevIdx].classList.add('bg-zinc-50', 'dark:bg-zinc-900/50');
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

  private handleTimelinePointerUp() {
    if (this.isDragging) {
      this.isDragging = false;
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
    }
  }

  private updateFocusIndicatorPosition() {
    const blockWidth = 48;
    const leftMargin = 256; // Left sticky panel
    const positionLeft = leftMargin + this.focusHour * blockWidth;
    this.focusIndicator.style.left = `${positionLeft}px`;
    
    // Toggle active classes in individual elements
    const allBlocks = this.timelineRowsContainer.querySelectorAll('.hour-block');
    allBlocks.forEach(block => {
      const idx = parseInt(block.getAttribute('data-hour-idx') || '-1');
      if (idx === this.focusHour) {
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
  }

  private updateRowClockTimes() {
    const rows = this.timelineRowsContainer.querySelectorAll('.timeline-row');
    const now = new Date();

    rows.forEach(row => {
      const tz = row.getAttribute('data-timezone');
      if (!tz) return;

      const offsetMinutes = getTimezoneOffset(tz, now);
      const localTime = new Date(now.getTime() + offsetMinutes * 60000);
      const formattedTime = localTime.getUTCHours().toString().padStart(2, '0') + ':' + localTime.getUTCMinutes().toString().padStart(2, '0');
      
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
  private exportCalendar(type: 'google' | 'outlook' | 'ics') {
    // Calculate exact start date/time
    // Selected Date is set to 00:00:00 of Home timezone local day.
    // Meeting starts at this.focusHour of selectedDate in Home timezone.
    const start = new Date(this.selectedDate);
    start.setHours(this.focusHour, 0, 0, 0);

    const timezoneDisplay = this.selectedCities.map(c => `${c.name} (${new Intl.DateTimeFormat('en-US', { timeZone: c.timezone, hour: '2-digit', minute: '2-digit', hour12: false }).format(start)})`).join('\n• ');
    
    const details = {
      title: 'Sync: Team Timezone Coordination',
      startDate: start,
      durationMinutes: 60,
      description: `Coordinated via RealTimeZones.\n\nMeeting Times:\n• ${timezoneDisplay}\n\nJoin the coordinate board: ${window.location.href}`
    };

    if (type === 'google') {
      window.open(generateGoogleCalendarUrl(details), '_blank');
    } else if (type === 'outlook') {
      window.open(generateOutlookCalendarUrl(details), '_blank');
    } else if (type === 'ics') {
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
    const hours = this.focusHour.toString().padStart(2, '0');
    this.focusTimeReadout.textContent = `${hours}:00`;
  }

  // Renders the overlap slots recommendations
  private renderOverlapWidget() {
    const otherTimezones = this.selectedCities.map(c => c.timezone);
    const slots = calculateOverlap(this.selectedDate, this.homeTimezone, otherTimezones);
    
    // Sort slots by score descending
    const sorted = [...slots].sort((a, b) => b.score - a.score);
    
    // Extract top 3 scoring slots
    const bestSlots = sorted.slice(0, 3);
    
    this.overlapWidget.innerHTML = '';
    
    // Determine overall current slot rating
    const currentSlot = slots.find(s => s.homeHour === this.focusHour);
    let slotRatingText = "Sleep Hours Included";
    let slotRatingClass = "text-red-500 dark:text-red-400 bg-red-500/10 border-red-500/20";
    
    if (currentSlot) {
      const ratings = Object.values(currentSlot.ratings);
      if (ratings.every(r => r === 'working')) {
        slotRatingText = "Perfect Working Overlap";
        slotRatingClass = "text-emerald-500 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
      } else if (ratings.every(r => r === 'working' || r === 'border')) {
        slotRatingText = "Good Border Overlap";
        slotRatingClass = "text-amber-500 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
      }
    }

    // Top Header Readout
    const header = document.createElement('div');
    header.className = 'flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4';
    header.innerHTML = `
      <div>
        <h4 class="text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Overlap Health</h4>
        <div class="flex items-center gap-2 mt-1">
          <span class="px-2 py-0.5 rounded text-xs font-mono border ${slotRatingClass}">${slotRatingText}</span>
          <span class="text-sm font-mono text-zinc-500 dark:text-zinc-400">Hour ${this.focusHour.toString().padStart(2, '0')}:00 (Home)</span>
        </div>
      </div>
      <div class="flex flex-col items-start md:items-end">
        <h4 class="text-xs font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">Smart Recommendations</h4>
        <div class="flex gap-2 mt-1" id="recommended-slots-btn-group"></div>
      </div>
    `;
    this.overlapWidget.appendChild(header);

    const btnGroup = header.querySelector('#recommended-slots-btn-group') as HTMLDivElement;
    
    bestSlots.forEach((slot, index) => {
      const btn = document.createElement('button');
      // Highlight slot button if it is currently selected
      const isSelected = slot.homeHour === this.focusHour;
      btn.className = `px-3 py-1 text-xs font-mono rounded border transition-all ${
        isSelected 
          ? 'bg-blue-500 border-blue-500 text-white dark:text-zinc-950 font-bold' 
          : 'bg-zinc-100 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-700'
      }`;
      
      // Determine label text (ordinal rank)
      const rank = index === 0 ? 'Best' : index === 1 ? '2nd' : '3rd';
      const formattedHour = slot.homeHour.toString().padStart(2, '0') + ':00';
      btn.textContent = `${rank}: ${formattedHour}`;
      
      btn.addEventListener('click', () => {
        this.focusHour = slot.homeHour;
        this.focusScrubberInput.value = this.focusHour.toString();
        this.updateFocusIndicatorPosition();
        this.updateFocusReadout();
        this.updateShareUrl();
        this.renderOverlapWidget();
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
      hourDiv.className = 'w-12 h-10 flex flex-col justify-center items-center font-mono text-[10px] text-zinc-400 dark:text-zinc-500 select-none';
      
      // Display AM/PM or numbers
      let label = '';
      if (h === 0) label = '12A';
      else if (h === 12) label = '12P';
      else if (h < 12) label = `${h}A`;
      else label = `${h - 12}P`;

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
  }

  private renderRow(city: City, isHome: boolean) {
    
    // Calculate offsets
    const offsetMinutes = getTimezoneOffset(city.timezone, this.selectedDate);
    const homeOffsetMinutes = getTimezoneOffset(this.homeTimezone, this.selectedDate);
    const relativeOffset = offsetMinutes - homeOffsetMinutes;
    
    // Format offset tag
    let offsetTag = '';
    if (isHome) {
      offsetTag = 'HOME';
    } else {
      const formattedDiff = formatOffset(relativeOffset);
      offsetTag = relativeOffset === 0 ? 'Home' : `${formattedDiff}h`;
    }

    const row = document.createElement('div');
    row.className = 'flex h-16 items-center timeline-row group transition-colors duration-150 hover:bg-zinc-100/30 dark:hover:bg-zinc-900/10';
    row.setAttribute('data-timezone', city.timezone);

    // Star/Favorite status
    const isStarred = this.favoriteTimezones.has(city.timezone);

    // Left metadata column (sticky)
    const leftPanel = document.createElement('div');
    leftPanel.className = 'sticky left-0 w-64 bg-zinc-50 dark:bg-zinc-950 z-20 h-full flex items-center justify-between px-4 border-r border-zinc-200 dark:border-zinc-800 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]';
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
          <span class="font-medium text-sm text-zinc-900 dark:text-zinc-50 truncate" title="${city.name}">${city.name}</span>
          <span class="text-[11px] text-zinc-400 dark:text-zinc-500 truncate font-mono">${city.country}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 shrink-0">
        <div class="flex flex-col items-end">
          <span class="row-clock-time font-mono text-sm font-bold text-zinc-800 dark:text-zinc-200">00:00</span>
          <span class="text-[9px] font-mono text-zinc-400 dark:text-zinc-500 uppercase tracking-wider">${offsetTag}</span>
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
    track.className = 'flex timeline-hours-track relative select-none';

    const baseHourDate = new Date(this.selectedDate);

    for (let h = 0; h < 24; h++) {
      // Calculate local hour for this block
      const dateAtHour = new Date(baseHourDate);
      dateAtHour.setHours(h, 0, 0, 0);

      const offset = getTimezoneOffset(city.timezone, dateAtHour);
      const localTime = new Date(dateAtHour.getTime() + offset * 60000);
      const localHour = localTime.getUTCHours();
      const category = getHourCategory(localHour);

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
      
      const formattedLocalHour = localHour.toString().padStart(2, '0');
      hourBlock.innerHTML = `
        <span class="font-bold">${formattedLocalHour}</span>
        <span class="text-[9px] scale-90 opacity-60 mt-0.5">${localHour >= 12 ? 'pm' : 'am'}</span>
      `;

      track.appendChild(hourBlock);
    }

    row.appendChild(track);
    this.timelineRowsContainer.appendChild(row);
  }
}

// Instantiate and initialize when DOM is loaded
let app: RealTimeZonesApp;
document.addEventListener('DOMContentLoaded', () => {
  app = new RealTimeZonesApp();
  app.init();
});
