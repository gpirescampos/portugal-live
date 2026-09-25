import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseFirmsCsv } from '../../src/providers/firms/parser.ts';

const validCsv = readFileSync(new URL('../fixtures/providers/firms-noaa20.csv', import.meta.url), 'utf8');
const malformedCsv = readFileSync(new URL('../fixtures/providers/firms-malformed.csv', import.meta.url), 'utf8');

test('normalizes a NOAA-20 VIIRS row as a satellite thermal detection', () => {
  const fetchedAt = '2026-09-22T10:00:00.000Z';
  const parsed = parseFirmsCsv({ regionId: 'mainland', csv: validCsv, fetchedAt }, new Date(fetchedAt));
  assert.equal(parsed.error, undefined);
  assert.equal(parsed.rejected, 0);
  assert.equal(parsed.records.length, 1);
  const record = parsed.records[0];
  assert.equal(record.providerId, 'firms');
  assert.equal(record.kind, 'thermal-detection');
  assert.equal(record.quality, 'satellite-detected');
  assert.deepEqual(record.geometry, { type: 'Point', coordinates: [-9.01103, 38.92216] });
  assert.equal(record.observedAt, '2026-09-22T01:12:00.000Z');
  assert.equal(record.properties.satellite, 'NOAA-20');
  assert.equal(record.properties.instrument, 'VIIRS');
  assert.equal(record.properties.confidence, 'nominal');
  assert.equal(record.properties.frpMw, 4.2);
  assert.equal(record.properties.regionId, 'mainland');
  assert.equal(record.provenance.transport, 'brokered');
});

test('filters detections outside the trailing 24-hour interval', () => {
  const csv = validCsv.replace('2026-09-22,0112', '2026-09-21,0900');
  const parsed = parseFirmsCsv({ regionId: 'mainland', csv, fetchedAt: '2026-09-22T10:00:00.000Z' }, new Date('2026-09-22T10:00:00.000Z'));
  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.rejected, 0);
});

test('rejects malformed records but retains valid partial rows', () => {
  const parsed = parseFirmsCsv({ regionId: 'mainland', csv: `${validCsv}${malformedCsv.split('\n')[1]}\n`, fetchedAt: '2026-09-22T10:00:00.000Z' }, new Date('2026-09-22T10:00:00.000Z'));
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.rejected, 1);
});

test('reports an HTML or non-FIRMS response as a parse error', () => {
  const parsed = parseFirmsCsv({ regionId: 'mainland', csv: '<html>rate limited</html>', fetchedAt: '2026-09-22T10:00:00.000Z' });
  assert.equal(parsed.error?.code, 'parse');
});

test('stable IDs deduplicate identical observations from overlapping region requests', () => {
  const now = new Date('2026-09-22T10:00:00.000Z');
  const first = parseFirmsCsv({ regionId: 'mainland', csv: validCsv, fetchedAt: now.toISOString() }, now).records[0];
  const second = parseFirmsCsv({ regionId: 'madeira', csv: validCsv, fetchedAt: now.toISOString() }, now).records[0];
  assert.equal(first.id, second.id);
});

test('supports quoted CSV values and rejects impossible UTC dates', () => {
  const quoted = validCsv.replace('NOAA-20,VIIRS,n', '"NOAA-20","VIIRS","n"');
  const good = parseFirmsCsv({ regionId: 'mainland', csv: quoted, fetchedAt: '2026-09-22T10:00:00.000Z' }, new Date('2026-09-22T10:00:00.000Z'));
  assert.equal(good.records[0].properties.satellite, 'NOAA-20');
  const invalidDate = validCsv.replace('2026-09-22,0112', '2026-02-31,0112');
  assert.equal(parseFirmsCsv({ regionId: 'mainland', csv: invalidDate, fetchedAt: '2026-09-22T10:00:00.000Z' }).rejected, 1);
});

test('normalizes acquisition times when FIRMS omits leading zeroes', () => {
  const csv = validCsv.replace('2026-09-22,0112', '2026-09-22,206');
  const parsed = parseFirmsCsv({ regionId: 'mainland', csv, fetchedAt: '2026-09-22T10:00:00.000Z' }, new Date('2026-09-22T10:00:00.000Z'));
  assert.equal(parsed.rejected, 0);
  assert.equal(parsed.records[0].observedAt, '2026-09-22T02:06:00.000Z');
});
