import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  type CanonicalCity,
  validateCity,
  validateCityDataset,
  findCityById,
  findCityByName,
  getCanonicalCities,
  toChronosCityTime
} from '../src/scripts/core/city-registry.ts';

describe('Canonical City & Timezone Registry', () => {
  it('validates every city in the canonical dataset has a valid IANA timezone identifier', () => {
    const cities = getCanonicalCities();
    assert.ok(cities.length > 100, `Dataset should have >100 cities, got ${cities.length}`);
    const validation = validateCityDataset(cities);
    assert.strictEqual(validation.valid, true, `Errors found: ${validation.errors.join('; ')}`);
  });

  it('rejects an invalid IANA timezone identifier with a clear message', () => {
    const invalidCity: CanonicalCity = {
      id: 'fake-city',
      name: 'Fakeville',
      country: 'Nowhere',
      timezone: 'Invalid/Nonexistent_Timezone',
      population: 100000,
      flag: '🏳️'
    };
    const result = validateCity(invalidCity);
    assert.strictEqual(result.valid, false);
    assert.match(result.error || '', /invalid.*timezone/i);
  });

  it('correctly maps Quito to America/Guayaquil and rejects America/Quito', () => {
    const quito = findCityByName('Quito');
    assert.ok(quito, 'Quito should be present in the canonical dataset');
    assert.strictEqual(quito!.timezone, 'America/Guayaquil');
    assert.strictEqual(quito!.country, 'Ecuador');

    const quitoWithOldTz: CanonicalCity = {
      id: 'qui-invalid',
      name: 'Quito',
      country: 'Ecuador',
      timezone: 'America/Quito',
      population: 2011000,
      flag: '🇪🇨'
    };
    const result = validateCity(quitoWithOldTz);
    assert.strictEqual(result.valid, false);
    assert.match(result.error || '', /invalid.*timezone/i);
  });

  it('detects duplicate stable city IDs in a dataset', () => {
    const duplicateDataset: CanonicalCity[] = [
      { id: 'lon', name: 'London', country: 'United Kingdom', timezone: 'Europe/London', population: 8982000, flag: '🇬🇧' },
      { id: 'lon', name: 'Duplicate London', country: 'United Kingdom', timezone: 'Europe/London', population: 100000, flag: '🇬🇧' },
    ];
    const result = validateCityDataset(duplicateDataset);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((err) => /duplicate.*id.*lon/i.test(err)));
  });

  it('allows different cities that share the same timezone', () => {
    const sameTzDataset: CanonicalCity[] = [
      { id: 'lon', name: 'London', country: 'United Kingdom', timezone: 'Europe/London', population: 8982000, flag: '🇬🇧' },
      { id: 'man', name: 'Manchester', country: 'United Kingdom', timezone: 'Europe/London', population: 553000, flag: '🇬🇧' },
      { id: 'nyc', name: 'New York', country: 'United States', timezone: 'America/New_York', population: 8336817, flag: '🇺🇸' },
      { id: 'bos', name: 'Boston', country: 'United States', timezone: 'America/New_York', population: 650779, flag: '🇺🇸' }
    ];
    const result = validateCityDataset(sameTzDataset);
    assert.strictEqual(result.valid, true);
  });

  it('rejects identical duplicate city records (same name, country, timezone)', () => {
    const duplicateRecordDataset: CanonicalCity[] = [
      { id: 'nbo1', name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi', population: 4397000, flag: '🇰🇪' },
      { id: 'nbo2', name: 'Nairobi', country: 'Kenya', timezone: 'Africa/Nairobi', population: 4397000, flag: '🇰🇪' },
    ];
    const result = validateCityDataset(duplicateRecordDataset);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.some((err) => /duplicate.*record.*Nairobi/i.test(err)));
  });

  it('provides canonical lookup by stable ID used by both web and desktop', () => {
    const bombay = findCityById('bom');
    assert.ok(bombay);
    assert.strictEqual(bombay!.name, 'Mumbai');
    assert.strictEqual(bombay!.timezone, 'Asia/Kolkata');

    const tokyo = findCityById('tyo');
    assert.ok(tokyo);
    assert.strictEqual(tokyo!.name, 'Tokyo');
    assert.strictEqual(tokyo!.timezone, 'Asia/Tokyo');

    const sf = findCityById('sfo');
    assert.ok(sf);
    assert.strictEqual(sf!.name, 'San Francisco');
    assert.strictEqual(sf!.timezone, 'America/Los_Angeles');

    const nyc = findCityById('nyc');
    assert.ok(nyc);
    assert.strictEqual(nyc!.name, 'New York');
    assert.strictEqual(nyc!.timezone, 'America/New_York');

    const london = findCityById('lon');
    assert.ok(london);
    assert.strictEqual(london!.name, 'London');
    assert.strictEqual(london!.timezone, 'Europe/London');

    const dubai = findCityById('dxb');
    assert.ok(dubai);
    assert.strictEqual(dubai!.name, 'Dubai');
    assert.strictEqual(dubai!.timezone, 'Asia/Dubai');

    const kathmandu = findCityById('ktm');
    assert.ok(kathmandu);
    assert.strictEqual(kathmandu!.name, 'Kathmandu');
    assert.strictEqual(kathmandu!.timezone, 'Asia/Kathmandu');
  });

  it('maintains half-hour and quarter-hour timezone records valid', () => {
    const kathmandu = findCityByName('Kathmandu');
    assert.ok(kathmandu);
    assert.strictEqual(kathmandu!.timezone, 'Asia/Kathmandu'); // +5:45

    const mumbai = findCityByName('Mumbai');
    assert.ok(mumbai);
    assert.strictEqual(mumbai!.timezone, 'Asia/Kolkata'); // +5:30

    const adelaide = findCityByName('Adelaide');
    assert.ok(adelaide);
    assert.strictEqual(adelaide!.timezone, 'Australia/Adelaide'); // +9:30

    const tehran = findCityByName('Tehran');
    assert.ok(tehran);
    assert.strictEqual(tehran!.timezone, 'Asia/Tehran'); // +3:30
  });

  it('converts canonical city to Chronos CityTime via adapter without losing properties', () => {
    const london = findCityById('lon');
    assert.ok(london);
    const chronosCity = toChronosCityTime(london!, true);
    assert.strictEqual(chronosCity.id, 'lon');
    assert.strictEqual(chronosCity.name, 'London');
    assert.strictEqual(chronosCity.country, 'United Kingdom');
    assert.strictEqual(chronosCity.timezone, 'Europe/London');
    assert.strictEqual(chronosCity.flag, '🇬🇧');
    assert.strictEqual(chronosCity.isBase, true);
    assert.strictEqual(chronosCity.badge, 'Base');
  });

  it('does not silently convert invalid imported city records into unrelated cities', () => {
    const invalidImport = { id: 'unknown-id-xyz', name: 'MadeUpCity', timezone: 'Not/A_Zone' };
    const validated = validateCity(invalidImport);
    assert.strictEqual(validated.valid, false);
    assert.ok(validated.error);
  });

  it('returns validation errors instead of throwing for malformed dataset members', () => {
    assert.doesNotThrow(() => validateCityDataset([null as unknown as CanonicalCity]));
    const result = validateCityDataset([null as unknown as CanonicalCity]);
    assert.strictEqual(result.valid, false);
    assert.ok(result.errors.length > 0);
  });
});
