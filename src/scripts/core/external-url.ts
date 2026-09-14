const MAX_EXTERNAL_CALENDAR_URL_LENGTH = 4096;

const ALLOWED_CALENDAR_ROUTES: Readonly<Record<string, string>> = Object.freeze({
  'calendar.google.com': '/calendar/render',
  'outlook.live.com': '/calendar/0/deeplink/compose'
});

export function isAllowedExternalCalendarUrl(value: unknown): value is string {
  if (typeof value !== 'string' || !value || value.length > MAX_EXTERNAL_CALENDAR_URL_LENGTH) {
    return false;
  }

  try {
    const url = new URL(value);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      url.port ||
      url.hash
    ) {
      return false;
    }

    const expectedPath = ALLOWED_CALENDAR_ROUTES[url.hostname.toLowerCase()];
    return expectedPath !== undefined && url.pathname === expectedPath;
  } catch {
    return false;
  }
}

function openInBrowser(url: string): boolean {
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    return true;
  } catch {
    try {
      return window.open(url, '_blank', 'noopener,noreferrer') !== null;
    } catch {
      return false;
    }
  }
}

export function openAllowedExternalCalendarUrl(value: string): boolean {
  if (!isAllowedExternalCalendarUrl(value) || typeof window === 'undefined') {
    return false;
  }

  const fallback = () => openInBrowser(value);

  try {
    const tauri = (window as any).__TAURI__;
    if (tauri?.opener && typeof tauri.opener.openUrl === 'function') {
      const result = tauri.opener.openUrl(value);
      if (result && typeof result.catch === 'function') {
        void result.catch(() => fallback());
      }
      return true;
    }
  } catch {
    // Try the invoke API or browser fallback below.
  }

  try {
    const tauri = (window as any).__TAURI__;
    if (tauri?.core && typeof tauri.core.invoke === 'function') {
      const result = tauri.core.invoke('plugin:opener|open_url', { url: value });
      if (result && typeof result.catch === 'function') {
        void result.catch(() => fallback());
      }
      return true;
    }
  } catch {
    // Use the browser fallback when the native bridge is unavailable.
  }

  return fallback();
}
