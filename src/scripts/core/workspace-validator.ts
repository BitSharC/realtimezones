import { isValidIanaTimezone } from './timezone-engine.ts';
import { findCityById } from './city-registry.ts';

export interface ValidatedWorkspaceCity {
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

export interface ValidatedWorkspace {
  id: string;
  name: string;
  cities: ValidatedWorkspaceCity[];
}

export interface WorkspaceValidationResult {
  success: boolean;
  workspaces?: ValidatedWorkspace[];
  error?: string;
  errors?: string[];
}

const MAX_WORKSPACES = 20;
const MAX_CITIES_PER_WORKSPACE = 50;
const MAX_NAME_LENGTH = 100;
const MAX_ID_LENGTH = 50;
const SUPPORTED_WORKSPACE_VERSION = 1;

function hasUnsafePrototypeKeys(value: Record<string, unknown>): boolean {
  return ['__proto__', 'constructor', 'prototype'].some((key) =>
    Object.prototype.hasOwnProperty.call(value, key)
  );
}

/**
 * Escapes user-controlled text to prevent XSS when inserting into HTML templates.
 */
export function escapeHtml(str: string): string {
  if (!str || typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Validates untrusted workspace data (parsed JSON or raw object).
 */
export function validateWorkspaceData(data: unknown): WorkspaceValidationResult {
  const errors: string[] = [];

  if (!data || typeof data !== 'object') {
    return { success: false, error: 'Imported workspace data must be a valid JSON object or array' };
  }

  // Handle versioned envelopes, single workspace objects, or legacy arrays.
  let rawList: unknown[];
  if (Array.isArray(data)) {
    rawList = data;
  } else {
    const envelope = data as Record<string, unknown>;
    if (Object.prototype.hasOwnProperty.call(envelope, 'workspaces')) {
      if (envelope.version !== SUPPORTED_WORKSPACE_VERSION) {
        return {
          success: false,
          error: `Unsupported workspace schema version: expected ${SUPPORTED_WORKSPACE_VERSION}`
        };
      }
      if (!Array.isArray(envelope.workspaces)) {
        return { success: false, error: 'Invalid workspace schema: workspaces must be an array' };
      }
      rawList = envelope.workspaces;
    } else if ('version' in envelope) {
      return { success: false, error: 'Invalid workspace schema: expected a versioned workspace envelope' };
    } else if ('name' in envelope && 'cities' in envelope) {
      rawList = [data];
    } else {
      return { success: false, error: 'Invalid workspace schema: expected a workspace object or array of workspaces' };
    }
  }

  if (rawList.length === 0) {
    return { success: false, error: 'Workspace list is empty' };
  }

  if (rawList.length > MAX_WORKSPACES) {
    return { success: false, error: `Too many workspaces: received ${rawList.length}, maximum allowed is ${MAX_WORKSPACES}` };
  }

  const validatedWorkspaces: ValidatedWorkspace[] = [];
  const wsIdSet = new Set<string>();

  for (let wIdx = 0; wIdx < rawList.length; wIdx++) {
    const rawWs = rawList[wIdx];
    if (!rawWs || typeof rawWs !== 'object' || Array.isArray(rawWs)) {
      errors.push(`Workspace #${wIdx + 1} is not a valid object`);
      continue;
    }

    const ws = rawWs as Record<string, unknown>;

    // Reject pollution vectors without mutating the caller's parsed object.
    if (hasUnsafePrototypeKeys(ws)) {
      errors.push(`Workspace #${wIdx + 1} contains unsafe object keys`);
      continue;
    }

    // Validate workspace name
    if (typeof ws.name !== 'string' || !ws.name.trim()) {
      errors.push(`Workspace #${wIdx + 1} is missing a valid name`);
      continue;
    }
    const cleanWsName = ws.name.trim();
    if (cleanWsName.length > MAX_NAME_LENGTH) {
      errors.push(`Workspace #${wIdx + 1} name exceeds maximum length of ${MAX_NAME_LENGTH} characters`);
      continue;
    }

    // Validate workspace id
    let wsId = typeof ws.id === 'string' && ws.id.trim() ? ws.id.trim() : `ws-${Date.now()}-${wIdx}`;
    if (wsId.length > MAX_ID_LENGTH) {
      wsId = wsId.slice(0, MAX_ID_LENGTH);
    }
    if (wsIdSet.has(wsId.toLowerCase())) {
      wsId = `${wsId}-${wIdx}`;
    }
    wsIdSet.add(wsId.toLowerCase());

    // Validate cities collection
    if (!Array.isArray(ws.cities) || ws.cities.length === 0) {
      errors.push(`Workspace "${cleanWsName}" must have at least one city`);
      continue;
    }

    if (ws.cities.length > MAX_CITIES_PER_WORKSPACE) {
      errors.push(`Workspace "${cleanWsName}" has too many cities (${ws.cities.length} > ${MAX_CITIES_PER_WORKSPACE})`);
      continue;
    }

    const validatedCities: ValidatedWorkspaceCity[] = [];
    const cityIdSet = new Set<string>();

    for (let cIdx = 0; cIdx < ws.cities.length; cIdx++) {
      const rawCity = ws.cities[cIdx];
      if (!rawCity || typeof rawCity !== 'object' || Array.isArray(rawCity)) {
        errors.push(`Workspace "${cleanWsName}": City #${cIdx + 1} is not a valid object`);
        continue;
      }

      const c = rawCity as Record<string, unknown>;

      const rawCityRecord = rawCity as Record<string, unknown>;
      if (hasUnsafePrototypeKeys(rawCityRecord)) {
        errors.push(`Workspace "${cleanWsName}": City #${cIdx + 1} contains unsafe object keys`);
        continue;
      }

      // Imported city records must use the canonical stable ID and its
      // canonical identity fields. Do not infer a city from an arbitrary
      // timezone or copy user-controlled city metadata into the workspace.
      if (typeof rawCityRecord.id !== 'string' || !rawCityRecord.id.trim()) {
        errors.push(`Workspace "${cleanWsName}": City #${cIdx + 1} is missing a canonical city ID`);
        continue;
      }
      // Validate timezone
      if (typeof c.timezone !== 'string' || !c.timezone.trim()) {
        errors.push(`Workspace "${cleanWsName}": City #${cIdx + 1} is missing a timezone`);
        continue;
      }
      const cleanTz = c.timezone.trim();
      if (!isValidIanaTimezone(cleanTz)) {
        errors.push(`Workspace "${cleanWsName}": Invalid timezone "${cleanTz}" in city "${c.name || `#${cIdx + 1}`}"`);
        continue;
      }
      const canonicalCity = findCityById(rawCityRecord.id.trim());
      if (!canonicalCity) {
        errors.push(`Workspace "${cleanWsName}": Unknown canonical city ID "${rawCityRecord.id.trim()}"`);
        continue;
      }
      if (cleanTz !== canonicalCity.timezone) {
        errors.push(`Workspace "${cleanWsName}": Timezone does not match canonical city "${canonicalCity.name}"`);
        continue;
      }

      // Validate city name
      if (typeof c.name !== 'string' || !c.name.trim()) {
        errors.push(`Workspace "${cleanWsName}": City #${cIdx + 1} is missing a canonical city name`);
        continue;
      }
      const cityName = c.name.trim();
      if (cityName.toLowerCase() !== canonicalCity.name.toLowerCase()) {
        errors.push(`Workspace "${cleanWsName}": City name does not match canonical city "${canonicalCity.name}"`);
        continue;
      }
      if (cityName.length > MAX_NAME_LENGTH) {
        errors.push(`Workspace "${cleanWsName}": City name exceeds maximum length`);
        continue;
      }

      if (c.country !== undefined &&
          (typeof c.country !== 'string' || c.country.trim().toLowerCase() !== canonicalCity.country.toLowerCase())) {
        errors.push(`Workspace "${cleanWsName}": Country does not match canonical city "${canonicalCity.name}"`);
        continue;
      }

      // City ID
      const cityId = canonicalCity.id;

      if (cityIdSet.has(cityId)) {
        errors.push(`Workspace "${cleanWsName}": Duplicate city ID "${cityId}" detected`);
        continue;
      }
      cityIdSet.add(cityId);

      const country = canonicalCity.country;
      const flag = canonicalCity.flag || '📍';
      const isBase = c.isBase === true || cIdx === 0;

      validatedCities.push({
        id: cityId,
        name: canonicalCity.name,
        country,
        flag,
        timezone: canonicalCity.timezone,
        offsetHours: typeof c.offsetHours === 'number' && Number.isFinite(c.offsetHours) ? c.offsetHours : 0,
        badge: isBase ? 'Base' : '+0h',
        statusLabel: isBase ? 'Base' : '',
        isBase
      });
    }

    if (validatedCities.length > 0) {
      validatedWorkspaces.push({
        id: wsId,
        name: cleanWsName,
        cities: validatedCities
      });
    }
  }

  if (errors.length > 0 || validatedWorkspaces.length === 0) {
    return {
      success: false,
      error: errors.join('; ') || 'Invalid workspace structure',
      errors
    };
  }

  return {
    success: true,
    workspaces: validatedWorkspaces
  };
}

/**
 * Safely parses and validates workspace JSON string.
 */
export function parseAndValidateWorkspaceJson(jsonString: string): WorkspaceValidationResult {
  if (!jsonString || typeof jsonString !== 'string') {
    return { success: false, error: 'Empty JSON content' };
  }
  try {
    const parsed = JSON.parse(jsonString);
    return validateWorkspaceData(parsed);
  } catch (err) {
    return {
      success: false,
      error: `Invalid JSON syntax: ${(err as Error).message || 'parse error'}`
    };
  }
}
