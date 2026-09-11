import { describe, it } from 'node:test';
import assert from 'node:assert';
import {
  validateWorkspaceData,
  parseAndValidateWorkspaceJson,
  escapeHtml
} from '../src/scripts/core/workspace-validator.ts';

describe('Workspace Import Validator & Safe Rendering', () => {
  it('successfully validates a well-formed workspace array', () => {
    const validData = [
      {
        id: 'ws-team',
        name: 'Engineering Team',
        cities: [
          { id: 'lon', name: 'London', country: 'United Kingdom', flag: '🇬🇧', timezone: 'Europe/London', isBase: true },
          { id: 'nyc', name: 'New York', country: 'United States', flag: '🇺🇸', timezone: 'America/New_York' }
        ]
      }
    ];
    const result = validateWorkspaceData(validData);
    assert.strictEqual(result.success, true);
    assert.ok(result.workspaces);
    assert.strictEqual(result.workspaces!.length, 1);
    assert.strictEqual(result.workspaces![0].name, 'Engineering Team');
    assert.strictEqual(result.workspaces![0].cities.length, 2);
  });

  it('successfully validates a single workspace object or versioned envelope', () => {
    const singleWs = {
      id: 'ws-single',
      name: 'Solo Sync',
      cities: [
        { id: 'tyo', name: 'Tokyo', country: 'Japan', flag: '🇯🇵', timezone: 'Asia/Tokyo' }
      ]
    };
    const result = validateWorkspaceData(singleWs);
    assert.strictEqual(result.success, true);
    assert.strictEqual(result.workspaces?.length, 1);
    assert.strictEqual(result.workspaces?.[0].id, 'ws-single');
  });

  it('requires supported schema version for workspace envelopes', () => {
    const workspace = {
      id: 'ws-versioned',
      name: 'Versioned Sync',
      cities: [{ id: 'lon', name: 'London', timezone: 'Europe/London' }]
    };

    assert.strictEqual(
      validateWorkspaceData({ version: 1, workspaces: [workspace] }).success,
      true
    );

    for (const version of [undefined, 0, 2, 999, '1', null]) {
      const result = validateWorkspaceData({ version, workspaces: [workspace] });
      assert.strictEqual(result.success, false, `Unsupported version should be rejected: ${String(version)}`);
    }
  });

  it('requires imported cities to match canonical IDs and timezone records', () => {
    const unknownCity = validateWorkspaceData([{
      id: 'ws-unknown-city',
      name: 'Unknown City Workspace',
      cities: [{ id: 'not-canonical', name: 'Made Up', country: 'Nowhere', timezone: 'UTC' }]
    }]);
    assert.strictEqual(unknownCity.success, false);

    const mismatchedTimezone = validateWorkspaceData([{
      id: 'ws-mismatched-timezone',
      name: 'Mismatched Timezone Workspace',
      cities: [{ id: 'lon', name: 'London', country: 'United Kingdom', timezone: 'America/New_York' }]
    }]);
    assert.strictEqual(mismatchedTimezone.success, false);

    const missingIdentity = validateWorkspaceData([{
      id: 'ws-missing-identity',
      name: 'Missing Identity Workspace',
      cities: [{ timezone: 'Europe/London' }]
    }]);
    assert.strictEqual(missingIdentity.success, false);
  });

  it('rejects prototype-pollution keys without mutating the imported object', () => {
    const maliciousPayload = JSON.parse('{"__proto__":{"polluted":"yes"},"id":"ws-1","name":"Hack","cities":[{"id":"lon","name":"London","timezone":"Europe/London"}]}');
    const result = validateWorkspaceData([maliciousPayload]);
    assert.strictEqual(result.success, false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(maliciousPayload, '__proto__'), true);
    assert.strictEqual((Object.prototype as any).polluted, undefined);
  });

  it('safely handles and rejects invalid JSON strings without throwing', () => {
    const result = parseAndValidateWorkspaceJson('{"incomplete_json": [');
    assert.strictEqual(result.success, false);
    assert.match(result.error || '', /invalid json/i);
  });

  it('rejects null, array of primitives, strings, and non-object inputs', () => {
    assert.strictEqual(validateWorkspaceData(null).success, false);
    assert.strictEqual(validateWorkspaceData(undefined).success, false);
    assert.strictEqual(validateWorkspaceData(42).success, false);
    assert.strictEqual(validateWorkspaceData('some random string').success, false);
    assert.strictEqual(validateWorkspaceData(['a', 'b', 'c']).success, false);
    assert.strictEqual(validateWorkspaceData([]).success, false);
  });

  it('rejects workspaces missing required fields like name or cities', () => {
    const noName = [{ id: 'ws-1', cities: [{ id: 'lon', name: 'London', timezone: 'Europe/London' }] }];
    assert.strictEqual(validateWorkspaceData(noName).success, false);

    const noCities = [{ id: 'ws-2', name: 'No Cities' }];
    assert.strictEqual(validateWorkspaceData(noCities).success, false);

    const emptyCities = [{ id: 'ws-3', name: 'Empty Cities', cities: [] }];
    assert.strictEqual(validateWorkspaceData(emptyCities).success, false);
  });

  it('rejects workspaces with invalid IANA timezone identifiers', () => {
    const invalidTzWs = [
      {
        id: 'ws-bad-tz',
        name: 'Bad Timezone',
        cities: [
          { id: 'lon', name: 'London', timezone: 'Europe/London' },
          { id: 'fake', name: 'Fake City', timezone: 'Mars/Curiosity_Rover' }
        ]
      }
    ];
    const result = validateWorkspaceData(invalidTzWs);
    assert.strictEqual(result.success, false);
    assert.ok(result.errors?.some((e) => /Mars\/Curiosity_Rover/i.test(e)));
  });

  it('rejects workspaces with duplicate city IDs within the same workspace', () => {
    const dupCityWs = [
      {
        id: 'ws-dup',
        name: 'Duplicate City IDs',
        cities: [
          { id: 'lon', name: 'London', timezone: 'Europe/London' },
          { id: 'lon', name: 'London Second', timezone: 'Europe/London' }
        ]
      }
    ];
    const result = validateWorkspaceData(dupCityWs);
    assert.strictEqual(result.success, false);
    assert.ok(result.errors?.some((e) => /duplicate.*lon/i.test(e)));
  });

  it('rejects excessively long workspace names and oversized collections', () => {
    const longName = 'A'.repeat(150);
    const resultLong = validateWorkspaceData([
      {
        id: 'ws-long',
        name: longName,
        cities: [{ id: 'lon', name: 'London', timezone: 'Europe/London' }]
      }
    ]);
    assert.strictEqual(resultLong.success, false);
    assert.ok(resultLong.errors?.some((e) => /exceeds maximum length/i.test(e)));

    // Oversized cities collection (>50)
    const tooManyCities = Array.from({ length: 60 }, (_, i) => ({
      id: `c-${i}`,
      name: `City ${i}`,
      timezone: 'UTC'
    }));
    const resultOversized = validateWorkspaceData([
      {
        id: 'ws-huge',
        name: 'Huge Workspace',
        cities: tooManyCities
      }
    ]);
    assert.strictEqual(resultOversized.success, false);
    assert.ok(resultOversized.errors?.some((e) => /too many cities/i.test(e)));
  });

  it('guards against prototype-pollution vectors in imported JSON without mutating the payload', () => {
    const maliciousPayload = JSON.parse('{"__proto__": {"polluted": "yes"}, "id": "ws-1", "name": "Hack", "cities": [{"id": "lon", "name": "London", "timezone": "Europe/London"}]}');
    const result = validateWorkspaceData([maliciousPayload]);
    assert.strictEqual((Object.prototype as any).polluted, undefined);
    assert.strictEqual(result.success, false);
    assert.strictEqual(Object.prototype.hasOwnProperty.call(maliciousPayload, '__proto__'), true);
  });

  it('escapes script-like names and user content for safe rendering', () => {
    const hostileInput = '<script>alert("x")</script>';
    const escaped = escapeHtml(hostileInput);
    assert.strictEqual(escaped, '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;');
    assert.strictEqual(escaped.includes('<script>'), false);

    const attrHostile = '"><img src=x onerror=alert(1)>';
    const escapedAttr = escapeHtml(attrHostile);
    assert.strictEqual(escapedAttr.includes('<img'), false);
    assert.strictEqual(escapedAttr.includes('"'), false);
  });

  it('preserves valid workspace data without unnecessary mutation during round-trip', () => {
    const original = [
      {
        id: 'ws-rt',
        name: 'Round Trip Team',
        cities: [
          { id: 'bom', name: 'Mumbai', country: 'India', flag: '🇮🇳', timezone: 'Asia/Kolkata', isBase: true },
          { id: 'sfo', name: 'San Francisco', country: 'United States', flag: '🇺🇸', timezone: 'America/Los_Angeles' }
        ]
      }
    ];
    const validated = validateWorkspaceData(original);
    assert.strictEqual(validated.success, true);
    assert.strictEqual(validated.workspaces?.[0].cities[0].id, 'bom');
    assert.strictEqual(validated.workspaces?.[0].cities[0].name, 'Mumbai');
    assert.strictEqual(validated.workspaces?.[0].cities[1].id, 'sfo');
  });
});
