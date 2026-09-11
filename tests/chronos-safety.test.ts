import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const chronosSource = readFileSync(
  resolve(process.cwd(), 'src/scripts/chronos-interactions.ts'),
  'utf8'
);

describe('Chronos imported-value rendering safety', () => {
  it('escapes imported city names in every timeline attribute sink', () => {
    assert.match(
      chronosSource,
      /title="\$\{localTime\} \$\{escapeHtml\(city\.name\)\}"/
    );
    assert.match(
      chronosSource,
      /title="Unavailable DST time in \$\{escapeHtml\(city\.name\)\}"/
    );
  });

  it('escapes imported status and badge values before HTML insertion', () => {
    assert.match(chronosSource, /\$\{escapeHtml\(badge\)\}/);
    assert.match(chronosSource, /\$\{escapeHtml\(statusLabel\)\}/);
  });
});
