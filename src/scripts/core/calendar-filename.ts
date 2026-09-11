/**
 * Core Calendar Filename Sanitizer
 *
 * Prevents path-traversal attacks, neutralizes control characters,
 * strips unsafe filesystem separators, enforces length bounds,
 * and guarantees a clean .ics filename ending across web and desktop platforms.
 */

const WINDOWS_RESERVED = new Set([
  'con', 'prn', 'aux', 'nul',
  'com1', 'com2', 'com3', 'com4', 'com5', 'com6', 'com7', 'com8', 'com9',
  'lpt1', 'lpt2', 'lpt3', 'lpt4', 'lpt5', 'lpt6', 'lpt7', 'lpt8', 'lpt9'
]);

function sanitizeCandidate(input: unknown): string {
  if (typeof input !== 'string' || !input) return '';

  // Remove null bytes and controls, then flatten all path-like separators.
  let sanitized = input
    .replace(/[\r\n\t]+/g, '-')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, '')
    .replace(/[/\\]+/g, '-')
    .replace(/[<>:"|?*]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');

  // Parent-directory markers must never survive as dots in the basename.
  while (sanitized.includes('..')) {
    sanitized = sanitized.replace(/\.\.+/g, '-');
  }

  // Strip every existing extension so the result has exactly one .ics suffix.
  while (/\.ics$/i.test(sanitized)) {
    sanitized = sanitized.slice(0, -4);
  }
  sanitized = sanitized.replace(/^[.\-\s]+|[.\-\s]+$/g, '');
  if (!sanitized) return '';

  // Keep the basename portable on filesystems with a 255-byte name limit.
  if (sanitized.length > 60) {
    sanitized = sanitized.slice(0, 60).replace(/[.\-\s]+$/, '');
  }
  if (!sanitized) return '';

  // Windows reserves device names even when followed by another extension.
  const firstNamePart = sanitized.split('.')[0].toLowerCase();
  if (WINDOWS_RESERVED.has(firstNamePart)) {
    sanitized = `rtz-${sanitized}`;
  }

  return `${sanitized}.ics`;
}

export function sanitizeCalendarFilename(
  input: string | null | undefined,
  fallback = 'realtimezones-meeting.ics'
): string {
  return sanitizeCandidate(input) || sanitizeCandidate(fallback) || 'realtimezones-meeting.ics';
}
