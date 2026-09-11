import { cities, type City } from '../../data/cities.ts';
import { isValidIanaTimezone } from './timezone-engine.ts';

export type CanonicalCity = City;

export interface CityTime {
  id: string;
  name: string;
  country: string;
  flag: string;
  timezone: string;
  offsetHours: number;
  badge: string;
  statusLabel: string;
  isBase?: boolean;
}

/**
 * Returns the entire canonical city dataset.
 */
export function getCanonicalCities(): CanonicalCity[] {
  return cities;
}

/**
 * Find canonical city by stable ID (case-insensitive).
 */
export function findCityById(id: string): CanonicalCity | undefined {
  if (!id || typeof id !== 'string') return undefined;
  const cleanId = id.trim().toLowerCase();
  return cities.find((c) => c.id.toLowerCase() === cleanId);
}

/**
 * Find canonical city by name and optional country (case-insensitive).
 */
export function findCityByName(name: string, country?: string): CanonicalCity | undefined {
  if (!name || typeof name !== 'string') return undefined;
  const cleanName = name.trim().toLowerCase();
  if (country && typeof country === 'string') {
    const cleanCountry = country.trim().toLowerCase();
    return cities.find(
      (c) => c.name.toLowerCase() === cleanName && c.country.toLowerCase() === cleanCountry
    );
  }
  return cities.find((c) => c.name.toLowerCase() === cleanName);
}

/**
 * Find canonical city by timezone identifier (case-insensitive).
 */
export function findCityByTimezone(timezone: string): CanonicalCity | undefined {
  if (!timezone || typeof timezone !== 'string') return undefined;
  const cleanTz = timezone.trim().toLowerCase();
  return cities.find((c) => c.timezone.toLowerCase() === cleanTz);
}

/**
 * Validates an individual city record against the canonical registry.
 * Imported records must carry a known stable ID and agree with the
 * registry's name, country, and IANA timezone. The returned city is always
 * reconstructed from canonical data rather than copying untrusted fields.
 */
export function validateCity(city: unknown): { valid: boolean; error?: string; city?: CanonicalCity } {
  if (!city || typeof city !== 'object' || Array.isArray(city)) {
    return { valid: false, error: 'City record must be a non-null object' };
  }

  const c = city as Record<string, unknown>;
  if (typeof c.id !== 'string' || !c.id.trim()) {
    return { valid: false, error: 'City ID must be a non-empty canonical stable ID' };
  }
  if (typeof c.name !== 'string' || !c.name.trim()) {
    return { valid: false, error: 'City name must be a non-empty string' };
  }
  if (typeof c.timezone !== 'string' || !c.timezone.trim()) {
    return { valid: false, error: 'City timezone must be a non-empty string' };
  }

  const cleanId = c.id.trim();
  const cleanName = c.name.trim();
  const cleanTimezone = c.timezone.trim();
  if (!isValidIanaTimezone(cleanTimezone)) {
    return { valid: false, error: `Invalid IANA timezone identifier: "${cleanTimezone}"` };
  }

  const canonical = findCityById(cleanId);
  if (!canonical) {
    return { valid: false, error: `Unknown canonical city ID: "${cleanId}"` };
  }
  if (canonical.name.toLowerCase() !== cleanName.toLowerCase()) {
    return { valid: false, error: `City name does not match canonical ID "${canonical.id}"` };
  }
  if (cleanTimezone !== canonical.timezone) {
    return { valid: false, error: `Timezone does not match canonical city "${canonical.name}"` };
  }
  if (c.country !== undefined &&
      (typeof c.country !== 'string' || c.country.trim().toLowerCase() !== canonical.country.toLowerCase())) {
    return { valid: false, error: `Country does not match canonical city "${canonical.name}"` };
  }

  return { valid: true, city: { ...canonical } };
}

/**
 * Validates an entire dataset of canonical cities.
 * Enforces valid timezones, unique stable IDs, and prevents duplicate records.
 */
export function validateCityDataset(dataset: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!Array.isArray(dataset)) {
    return { valid: false, errors: ['Dataset must be an array of cities'] };
  }
  const idSet = new Set<string>();
  const recordSet = new Set<string>();

  dataset.forEach((city, idx) => {
    const record = city && typeof city === 'object' && !Array.isArray(city)
      ? city as Record<string, unknown>
      : null;
    const name = typeof record?.name === 'string' ? record.name.trim() : 'unknown';
    const id = typeof record?.id === 'string' ? record.id.trim() : '';
    const country = typeof record?.country === 'string' ? record.country.trim() : '';
    const timezone = typeof record?.timezone === 'string' ? record.timezone.trim() : '';

    const res = validateCity(city);
    if (!res.valid) {
      errors.push(`City at index ${idx} ("${name}"): ${res.error}`);
    }

    if (id) {
      const lowerId = id.toLowerCase();
      if (idSet.has(lowerId)) {
        errors.push(`Duplicate stable city ID detected: "${id}" (city: ${name})`);
      }
      idSet.add(lowerId);
    }

    if (name && country && timezone) {
      const recordKey = `${name.toLowerCase()}|${country.toLowerCase()}|${timezone.toLowerCase()}`;
      if (recordSet.has(recordKey)) {
        errors.push(`Duplicate city record detected: "${name}" in ${country} (${timezone})`);
      }
      recordSet.add(recordKey);
    }
  });

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Adapter converting a CanonicalCity to Chronos CityTime.
 */
export function toChronosCityTime(city: CanonicalCity, isBase: boolean = false): CityTime {
  return {
    id: city.id,
    name: city.name,
    country: city.country,
    flag: city.flag || '📍',
    timezone: city.timezone,
    offsetHours: 0,
    badge: isBase ? 'Base' : '+0h',
    statusLabel: isBase ? 'Base' : '',
    isBase
  };
}
