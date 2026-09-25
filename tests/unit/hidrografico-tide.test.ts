import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { parseTideLocations } from '../../src/providers/hidrografico-tide/parser.ts';
import { hidrograficoTideAdapter, TIDE_LOCATIONS_URL } from '../../src/providers/hidrografico-tide/adapter.ts';

const fetchedAt = '2026-09-24T21:36:00.000Z';

test('normalizes latest station value, datum, UTC and quality disclosure; keeps no-data stations unavailable', async () => {
  const payload = JSON.parse(await readFile(new URL('../fixtures/providers/hidrografico-tide.json', import.meta.url), 'utf8'));
  const parsed = parseTideLocations(payload, fetchedAt, new Date(fetchedAt));
  assert.equal(parsed.rejected, 1);
  assert.equal(parsed.records.length, 2);
  const reading = parsed.records.find((record) => record.properties.stationId === '152-303')!;
  assert.equal(reading.id, 'hidrografico-tide:152-303');
  assert.deepEqual(reading.geometry, { type: 'Point', coordinates: [-9.16325, 38.700194] });
  assert.equal(reading.observedAt, '2026-09-24T21:35:00.000Z');
  assert.equal(reading.properties.heightMetres, 1.555);
  assert.equal(reading.properties.verticalDatum, 'ZH');
  assert.equal(reading.properties.verticalCrs, 'EPSG:10349');
  assert.equal(reading.properties.qualityControl, 'not-performed');
  const empty = parsed.records.find((record) => record.properties.stationId === '999-001')!;
  assert.equal(empty.observedAt, null);
  assert.equal(empty.freshness, 'unavailable');
  assert.equal(empty.properties.heightMetres, undefined);
});

test('rejects malformed GeoJSON, coordinates, IDs, timestamps and heights', () => {
  const bad = { type: 'FeatureCollection', features: [
    { type: 'Feature', id: 'bad id', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { id: 'bad id', title: 'X', last_date_time: '2026-09-24T21:35:00Z', last_sea_surface_height: 1 } },
    { type: 'Feature', id: '1-2', geometry: { type: 'Point', coordinates: [181, 0] }, properties: { id: '1-2', title: 'X', last_date_time: '2026-09-24T21:35:00Z', last_sea_surface_height: 1 } },
    { type: 'Feature', id: '2-3', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { id: '2-3', title: 'X', last_date_time: '2026-09-24 21:35:00', last_sea_surface_height: 1 } },
    { type: 'Feature', id: '3-4', geometry: { type: 'Point', coordinates: [0, 0] }, properties: { id: '3-4', title: 'X', last_date_time: '2026-09-24T21:35:00Z', last_sea_surface_height: '1' } },
  ] };
  assert.equal(parseTideLocations(bad, fetchedAt).rejected, 4);
});

test('rejects schema drift and over-limit responses', () => {
  assert.equal(parseTideLocations([], fetchedAt).error?.code, 'parse');
  const tooMany = { type: 'FeatureCollection', numberReturned: 101, features: [] };
  assert.equal(parseTideLocations(tooMany, fetchedAt).error?.code, 'validation');
});

test('marks old samples stale while retaining the station record', async () => {
  const payload = JSON.parse(await readFile(new URL('../fixtures/providers/hidrografico-tide.json', import.meta.url), 'utf8'));
  payload.features = payload.features.slice(0, 1);
  payload.features[0].properties.last_date_time = '2026-09-24T19:00:00Z';
  const parsed = parseTideLocations(payload, fetchedAt, new Date(fetchedAt));
  assert.equal(parsed.records[0].freshness, 'stale');
});

test('uses a fixed bounded IH route and surfaces failed upstream responses', async () => {
  const originalFetch = globalThis.fetch;
  const calls: string[] = [];
  try {
    globalThis.fetch = async (input) => {
      calls.push(String(input));
      return new Response(JSON.stringify({ type: 'FeatureCollection', features: [] }), { status: 200, headers: { 'content-type': 'application/json' } });
    };
    const result = await hidrograficoTideAdapter.fetch({ signal: new AbortController().signal, now: new Date(fetchedAt), endpoint: TIDE_LOCATIONS_URL });
    assert.equal(result.status.state, 'unavailable');
    assert.deepEqual(calls, [TIDE_LOCATIONS_URL]);

    const rejectedEndpoint = await hidrograficoTideAdapter.fetch({ signal: new AbortController().signal, now: new Date(fetchedAt), endpoint: 'https://example.com/collections/tide_obs_nrt/instances/l1/locations?limit=100' });
    assert.equal(rejectedEndpoint.status.state, 'error');
    assert.equal(calls.length, 1);

    globalThis.fetch = async () => new Response('unavailable', { status: 503 });
    const failed = await hidrograficoTideAdapter.fetch({ signal: new AbortController().signal, now: new Date(fetchedAt), endpoint: TIDE_LOCATIONS_URL });
    assert.equal(failed.status.state, 'error');
    assert.equal(failed.status.error?.httpStatus, 503);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
