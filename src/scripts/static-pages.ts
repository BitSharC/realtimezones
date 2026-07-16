import { searchCities } from './city-db';

document.addEventListener('DOMContentLoaded', () => {
  // Theme Toggle Logic
  let activeTheme = 'system';
  try {
    const workspace = localStorage.getItem('workspace');
    if (workspace) {
      const data = JSON.parse(workspace);
      if (data && data.theme) {
        activeTheme = data.theme;
      }
    } else {
      const legacyTheme = localStorage.getItem('theme');
      if (legacyTheme) activeTheme = legacyTheme;
    }
  } catch (e) {}

  function applyTheme(theme: string) {
    activeTheme = theme;
    const root = document.documentElement;
    if (theme === 'dark' || (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    
    // Save theme
    try {
      const wsRaw = localStorage.getItem('workspace');
      let wsData = wsRaw ? JSON.parse(wsRaw) : null;
      if (wsData) {
        wsData.theme = theme;
        localStorage.setItem('workspace', JSON.stringify(wsData));
      }
    } catch (e) {}
    localStorage.setItem('theme', theme);

    // Sync button classes
    const buttons = document.querySelectorAll('.theme-btn');
    buttons.forEach(btn => {
      const t = btn.getAttribute('data-theme');
      if (t === activeTheme) {
        btn.classList.add('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50');
        btn.classList.remove('text-zinc-500', 'dark:text-zinc-400');
      } else {
        btn.classList.remove('bg-zinc-200', 'dark:bg-zinc-800', 'text-zinc-900', 'dark:text-zinc-50');
        btn.classList.add('text-zinc-500', 'dark:text-zinc-400');
      }
    });

    // Mobile theme switcher icon
    const mobileBtn = document.getElementById('theme-toggle-mobile');
    if (mobileBtn) {
      const iconSystem = mobileBtn.querySelector('.theme-icon-system');
      const iconLight = mobileBtn.querySelector('.theme-icon-light');
      const iconDark = mobileBtn.querySelector('.theme-icon-dark');
      if (iconSystem) iconSystem.classList.toggle('hidden', activeTheme !== 'system');
      if (iconLight) iconLight.classList.toggle('hidden', activeTheme !== 'light');
      if (iconDark) iconDark.classList.toggle('hidden', activeTheme !== 'dark');
    }
  }

  // Bind theme buttons click
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const theme = btn.getAttribute('data-theme');
      if (theme) applyTheme(theme);
    });
  });

  const mobileThemeToggle = document.getElementById('theme-toggle-mobile');
  if (mobileThemeToggle) {
    mobileThemeToggle.addEventListener('click', () => {
      let nextTheme: 'dark' | 'light' | 'system' = 'light';
      if (activeTheme === 'system') nextTheme = 'light';
      else if (activeTheme === 'light') nextTheme = 'dark';
      else nextTheme = 'system';
      applyTheme(nextTheme);
    });
  }

  // System preference listener
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    if (activeTheme === 'system') {
      const root = document.documentElement;
      if (e.matches) root.classList.add('dark');
      else root.classList.remove('dark');
    }
  });

  // Apply initial theme UI sync
  applyTheme(activeTheme);


  // Time Format Logic
  let is24HourFormat = false;
  try {
    const workspace = localStorage.getItem('workspace');
    if (workspace) {
      const data = JSON.parse(workspace);
      if (data && data.format24h !== undefined) {
        is24HourFormat = data.format24h;
      }
    } else {
      is24HourFormat = localStorage.getItem('timeFormat') === '24h';
    }
  } catch (e) {}

  function applyTimeFormat(is24h: boolean) {
    is24HourFormat = is24h;
    
    // Save format
    try {
      const wsRaw = localStorage.getItem('workspace');
      let wsData = wsRaw ? JSON.parse(wsRaw) : null;
      if (wsData) {
        wsData.format24h = is24HourFormat;
        localStorage.setItem('workspace', JSON.stringify(wsData));
      }
    } catch (e) {}
    localStorage.setItem('timeFormat', is24HourFormat ? '24h' : '12h');

    // Sync UI
    const btn12h = document.getElementById('time-format-12h');
    const btn24h = document.getElementById('time-format-24h');
    if (btn12h && btn24h) {
      if (is24HourFormat) {
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
  }

  // Bind format switcher clicks
  document.getElementById('time-format-12h')?.addEventListener('click', () => applyTimeFormat(false));
  document.getElementById('time-format-24h')?.addEventListener('click', () => applyTimeFormat(true));

  // Initialize format UI
  applyTimeFormat(is24HourFormat);


  // Settings Dropdown Menu Logic
  const settingsMenuButton = document.getElementById('settings-menu-button');
  const settingsDropdown = document.getElementById('settings-dropdown');
  const resetWorkspaceButton = document.getElementById('reset-workspace-button');

  if (settingsMenuButton && settingsDropdown) {
    settingsMenuButton.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = settingsDropdown.classList.contains('hidden');
      settingsDropdown.classList.toggle('hidden', !isHidden);
      settingsMenuButton.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
    });

    window.addEventListener('click', () => {
      settingsDropdown.classList.add('hidden');
      settingsMenuButton.setAttribute('aria-expanded', 'false');
    });
  }

  if (resetWorkspaceButton) {
    resetWorkspaceButton.addEventListener('click', (e) => {
      e.stopPropagation();
      if (settingsDropdown) settingsDropdown.classList.add('hidden');
      if (settingsMenuButton) settingsMenuButton.setAttribute('aria-expanded', 'false');
      
      const confirmReset = confirm("Reset workspace? All added cities, settings, and favorites will be permanently cleared.");
      if (confirmReset) {
        localStorage.removeItem('workspace');
        localStorage.removeItem('theme');
        localStorage.removeItem('timeFormat');
        window.location.href = '/';
      }
    });
  }


  // Keyboard Shortcuts Modal Logic
  const keyboardHelpModal = document.getElementById('keyboard-help-modal');
  const triggerKeyboardHelp = document.getElementById('trigger-keyboard-help');
  const triggerKeyboardHelpFooter = document.getElementById('trigger-keyboard-help-footer');

  function openKeyboardModal() {
    keyboardHelpModal?.classList.remove('hidden');
  }

  function closeKeyboardModal() {
    keyboardHelpModal?.classList.add('hidden');
  }

  triggerKeyboardHelp?.addEventListener('click', (e) => {
    e.stopPropagation();
    openKeyboardModal();
  });
  
  triggerKeyboardHelpFooter?.addEventListener('click', (e) => {
    e.stopPropagation();
    openKeyboardModal();
  });

  document.querySelectorAll('#keyboard-help-modal .close-modal').forEach(btn => {
    btn.addEventListener('click', closeKeyboardModal);
  });


  // Share / Copy Link button Logic
  const shareButton = document.getElementById('share-button');
  const shareToast = document.getElementById('share-toast');

  if (shareButton) {
    shareButton.addEventListener('click', async () => {
      try {
        // Copy the current page URL
        await navigator.clipboard.writeText(window.location.href);
        if (shareToast) {
          shareToast.classList.remove('opacity-0', 'translate-y-2');
          shareToast.classList.add('opacity-100', 'translate-y-0');
          setTimeout(() => {
            shareToast.classList.remove('opacity-100', 'translate-y-0');
            shareToast.classList.add('opacity-0', 'translate-y-2');
          }, 2500);
        }
      } catch (err) {
        console.error('Failed to copy link: ', err);
      }
    });
  }


  // Fuzzy City Search Modal Logic
  const searchModal = document.getElementById('search-modal');
  const searchInput = document.getElementById('search-input') as HTMLInputElement | null;
  const searchResults = document.getElementById('search-results');
  let selectedIndex = -1;

  function openSearch() {
    if (searchModal && searchInput) {
      searchModal.classList.remove('hidden');
      searchInput.value = '';
      searchInput.focus();
      renderSearchResults([]);
    }
  }

  function closeSearch() {
    searchModal?.classList.add('hidden');
  }

  // Bind all elements that should trigger search modal
  document.querySelectorAll('.trigger-add-city').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      openSearch();
    });
  });

  // Close buttons in search modal
  document.querySelectorAll('#search-modal .close-modal').forEach(btn => {
    btn.addEventListener('click', closeSearch);
  });

  // Click outside to close search modal
  searchModal?.addEventListener('click', (e) => {
    if (e.target === searchModal) {
      closeSearch();
    }
  });

  // Render search results HTML
  function renderSearchResults(results: any[]) {
    if (!searchResults) return;
    selectedIndex = -1;
    
    if (results.length === 0) {
      if (searchInput && searchInput.value.trim().length > 0) {
        searchResults.innerHTML = `
          <div class="px-4 py-6 text-center text-xs text-zinc-400 dark:text-zinc-500 font-mono">
            No matching cities found
          </div>
        `;
      } else {
        // Show some popular helper defaults
        searchResults.innerHTML = `
          <div class="px-4 py-2 text-[10px] text-zinc-400 dark:text-zinc-500 font-mono uppercase tracking-wider select-none">
            Popular Cities
          </div>
          <button type="button" class="search-result-item w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer" data-timezone="Europe/London" data-name="London">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-50">London</span>
              <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">United Kingdom • Europe</span>
            </div>
            <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">GMT</span>
          </button>
          <button type="button" class="search-result-item w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer" data-timezone="America/New_York" data-name="New York">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-50">New York</span>
              <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">United States • North America</span>
            </div>
            <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">EST</span>
          </button>
          <button type="button" class="search-result-item w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer" data-timezone="Asia/Tokyo" data-name="Tokyo">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-50">Tokyo</span>
              <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">Japan • Asia</span>
            </div>
            <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">JST</span>
          </button>
        `;
      }
    } else {
      searchResults.innerHTML = results.map((city, idx) => `
        <button 
          type="button" 
          class="search-result-item w-full text-left px-4 py-3 flex items-center justify-between hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors cursor-pointer" 
          data-timezone="${city.timezone}" 
          data-name="${city.name}"
          data-index="${idx}"
        >
          <div class="flex flex-col">
            <span class="text-xs font-semibold text-zinc-900 dark:text-zinc-50">${city.name}</span>
            <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">${city.country} • ${city.timezone.split('/')[0]}</span>
          </div>
          <span class="text-[10px] text-zinc-400 dark:text-zinc-500 font-mono">${city.timezone.split('/').pop()?.replace('_', ' ')}</span>
        </button>
      `).join('');
    }

    // Bind clicks to search results
    document.querySelectorAll('.search-result-item').forEach(btn => {
      btn.addEventListener('click', () => {
        const tz = btn.getAttribute('data-timezone');
        const name = btn.getAttribute('data-name');
        if (tz && name) {
          selectCity(tz, name);
        }
      });
    });
  }

  // Handle city selection: add to workspace and redirect to /
  function selectCity(timezone: string, name: string) {
    try {
      const wsRaw = localStorage.getItem('workspace');
      let wsData = wsRaw ? JSON.parse(wsRaw) : null;
      if (!wsData) {
        // Create a default workspace
        wsData = {
          version: 1,
          cities: ["UTC"], // default lists
          favorites: [],
          theme: activeTheme,
          format24h: is24HourFormat,
          focusTime: new Date().getHours()
        };
      }
      // Add city if not present
      if (!wsData.cities.includes(timezone)) {
        wsData.cities.push(timezone);
      }
      localStorage.setItem('workspace', JSON.stringify(wsData));
    } catch (e) {
      console.error('Failed to update workspace on selection: ', e);
    }
    
    // Redirect to home page with the city selected
    window.location.href = `/?cities=${encodeURIComponent(name)}`;
  }

  // Keyboard navigation inside search results
  searchInput?.addEventListener('input', () => {
    const results = searchCities(searchInput.value);
    renderSearchResults(results);
  });

  searchInput?.addEventListener('keydown', (e) => {
    const items = searchResults?.querySelectorAll('.search-result-item');
    if (!items || items.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = (selectedIndex + 1) % items.length;
      highlightItem(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = (selectedIndex - 1 + items.length) % items.length;
      highlightItem(items);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && selectedIndex < items.length) {
        const activeItem = items[selectedIndex] as HTMLButtonElement;
        activeItem.click();
      } else if (items.length > 0) {
        (items[0] as HTMLButtonElement).click();
      }
    }
  });

  function highlightItem(items: NodeListOf<Element>) {
    items.forEach((item, idx) => {
      if (idx === selectedIndex) {
        item.classList.add('bg-zinc-50', 'dark:bg-zinc-900');
        item.scrollIntoView({ block: 'nearest' });
      } else {
        item.classList.remove('bg-zinc-50', 'dark:bg-zinc-900');
      }
    });
  }

  // Global key listener for search (⌘K / Ctrl+K) and Help modal (?)
  window.addEventListener('keydown', (e) => {
    const isSearchOpen = !searchModal?.classList.contains('hidden');
    const isKeyHelpOpen = !keyboardHelpModal?.classList.contains('hidden');

    if (e.key === 'Escape') {
      if (isSearchOpen) closeSearch();
      if (isKeyHelpOpen) closeKeyboardModal();
      settingsDropdown?.classList.add('hidden');
      if (settingsMenuButton) settingsMenuButton.setAttribute('aria-expanded', 'false');
    }

    // Ctrl+K or Cmd+K to open search (unless typing in search already)
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      if (isSearchOpen) {
        closeSearch();
      } else {
        if (isKeyHelpOpen) closeKeyboardModal();
        openSearch();
      }
    }

    // ? key to open keyboard help (if not typing in input)
    if (e.key === '?' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
      e.preventDefault();
      if (isKeyHelpOpen) {
        closeKeyboardModal();
      } else {
        if (isSearchOpen) closeSearch();
        openKeyboardModal();
      }
    }
  });
});
