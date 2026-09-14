(() => {
  const MAX_WORKSPACE_LENGTH = 256 * 1024;
  const allowedThemes = new Set(['dark', 'light', 'system']);
  let theme = 'system';

  try {
    const workspace = window.localStorage.getItem('workspace');
    if (workspace && workspace.length <= MAX_WORKSPACE_LENGTH) {
      const candidate = JSON.parse(workspace)?.theme;
      if (allowedThemes.has(candidate)) theme = candidate;
    } else if (!workspace) {
      const legacyTheme = window.localStorage.getItem('theme');
      if (allowedThemes.has(legacyTheme)) theme = legacyTheme;
    }
  } catch {
    // Theme bootstrap must never prevent the app from loading.
  }

  const prefersDark = typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.classList.toggle(
    'dark',
    theme === 'dark' || (theme === 'system' && prefersDark)
  );
})();
