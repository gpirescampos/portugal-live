import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseIpmaWarnings } from '../../src/providers/ipma-warnings/parser.ts';

const fixture = async (name: string) => JSON.parse(await readFile(new URL(`../fixtures/providers/${name}`, import.meta.url), 'utf8'));
const areas = new Map([['LIS', { idAreaAviso: 'LIS', latitude: 38.72, longitude: -9.14, label: 'Lisboa' }]]);

test('normalizes active and future warnings at an area representative point', async () => {
  const parsed = parseIpmaWarnings(await fixture('ipma-warnings.json'), '2026-09-22T12:00:00Z', new Date('2026-09-22T12:00:00Z'), areas);
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.records[0].kind, 'weather-warning');
  assert.deepEqual(parsed.records[0].geometry, { type: 'Point', coordinates: [-9.14, 38.72] });
  assert.equal(parsed.records[0].properties.severity, 'yellow');
  assert.equal(parsed.records[0].temporalClass, 'current');
});

test('rejects malformed, expired, and unmapped warning records', async () => {
  const parsed = parseIpmaWarnings(await fixture('ipma-warnings-malformed.json'), '2026-09-22T12:00:00Z', new Date('2026-09-22T12:00:00Z'), areas);
  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.rejected, 1);
});

test('reports a malformed response envelope', () => {
  const parsed = parseIpmaWarnings({ data: [] }, '2026-09-22T12:00:00Z');
  assert.equal(parsed.error?.code, 'parse');
});
