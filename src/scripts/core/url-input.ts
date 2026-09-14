export const MAX_SHARED_CITY_COUNT = 50;
export const MAX_SHARED_CITY_PARAM_LENGTH = 4096;
export const MAX_SHARED_CITY_VALUE_LENGTH = 128;

const CONTROL_CHARACTER_PATTERN = /[\u0000-\u001F\u007F]/;

/**
 * Decodes the comma-separated city parameter used by share links. Malformed
 * entries are ignored and oversized input is rejected before any city lookup.
 */
export function parseSharedCityNames(rawValue: string | null): string[] {
  if (!rawValue || rawValue.length > MAX_SHARED_CITY_PARAM_LENGTH) return [];

  const encodedValues = rawValue.split(',');
  if (encodedValues.length > MAX_SHARED_CITY_COUNT) return [];

  const values: string[] = [];
  for (const encodedValue of encodedValues) {
    if (!encodedValue || encodedValue.length > MAX_SHARED_CITY_VALUE_LENGTH * 4) continue;

    let decoded: string;
    try {
      decoded = decodeURIComponent(encodedValue);
    } catch {
      continue;
    }

    const cleanValue = decoded.trim();
    if (
      cleanValue &&
      cleanValue.length <= MAX_SHARED_CITY_VALUE_LENGTH &&
      !CONTROL_CHARACTER_PATTERN.test(cleanValue)
    ) {
      values.push(cleanValue);
    }
  }

  return values;
}

/**
 * Parses only a complete decimal integer inside an explicit inclusive range.
 * Partial values such as "12abc" are rejected rather than truncated.
 */
export function parseBoundedInteger(
  rawValue: string | null,
  minimum: number,
  maximum: number
): number | null {
  if (
    typeof rawValue !== 'string' ||
    !Number.isInteger(minimum) ||
    !Number.isInteger(maximum) ||
    minimum > maximum ||
    !/^-?\d+$/.test(rawValue)
  ) {
    return null;
  }

  const parsed = Number(rawValue);
  return Number.isSafeInteger(parsed) && parsed >= minimum && parsed <= maximum ? parsed : null;
}
