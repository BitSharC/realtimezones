(() => {
  const protocol = window.location.protocol;
  const isWebOrigin = protocol === 'http:' || protocol === 'https:';
  if (!isWebOrigin || !('serviceWorker' in navigator)) return;

  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {
      // Offline support is optional; application behavior remains local-first.
    });
  }, { once: true });
})();
