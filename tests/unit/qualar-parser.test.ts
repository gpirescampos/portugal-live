import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { groupQualArRecords, normalizeEeaPayload, parseQualAr } from '../../src/providers/qualar/parser.ts';

const readFixture = async (name: string) => JSON.parse(await readFile(new URL(`../fixtures/providers/${name}`, import.meta.url), 'utf8')) as Record<string, unknown>;

test('QualAr joins stations, preserves original units, converts explicitly, and rejects source sentinels', async () => {
  const fixture = await readFixture('qualar-shape.json') as { stations: unknown[]; readings: unknown[] };
  const { records, rejected } = parseQualAr(fixture.stations, fixture.readings, '2026-09-24T09:05:00Z', new Date('2026-09-24T09:05:00Z'));
  assert.equal(records.length, 3);
  assert.equal(rejected, 4);
  const pm10 = records.find((record) => record.properties.pollutant === 'PM10');
  assert.equal(pm10?.id, 'qualar:PT001:PM10');
  assert.equal(pm10?.properties.value, 12.4);
  assert.equal(pm10?.properties.averagingPeriod, '1 hora');
  assert.equal(pm10?.properties.unit, 'µg/m³');
  assert.equal(pm10?.properties.originalValue, 12.4);
  assert.equal(pm10?.properties.sourceStatus, 'validado');
  const ozone = records.find((record) => record.properties.pollutant === 'O3');
  assert.equal(ozone?.properties.value, 40);
  assert.equal(ozone?.properties.originalValue, 0.04);
  assert.equal(ozone?.properties.originalUnit, 'mg/m³');
  const co = records.find((record) => record.properties.pollutant === 'CO');
  assert.equal(co?.properties.value, 2);
  assert.equal(co?.properties.unit, 'mg/m³');
  assert.equal(co?.observedAt, '2026-09-22T23:00:00.000Z');
  assert.equal(co?.freshness, 'stale');
});

test('EEA E2a fields map to station IDs, units, validity, verification, and timestamps', async () => {
  const fixture = await readFixture('qualar-eea-shape.json') as { stations: unknown[]; readings: unknown[] };
  const normalized = normalizeEeaPayload(fixture.stations, fixture.readings);
  assert.deepEqual(normalized.stations, [{ id: 'PT01021', name: 'Estação de exemplo', longitude: -8.64, latitude: 41.2, stationType: 'Classe 2', network: 'EEA · E2a' }]);
  const { records, rejected } = parseQualAr(normalized.stations, normalized.readings, '2026-09-24T10:05:00Z', new Date('2026-09-24T10:05:00Z'), 'brokered');
  assert.equal(records.length, 1);
  assert.equal(rejected, 1);
  assert.equal(records[0].id, 'qualar:PT01021:PM10');
  assert.deepEqual(records[0].geometry, { type: 'Point', coordinates: [-8.64, 41.2] });
  assert.equal(records[0].observedAt, '2026-09-24T09:00:00.000Z');
  assert.equal(records[0].sourceUpdatedAt, '2026-09-24T10:00:00.000Z');
  assert.equal(records[0].properties.sourceQuality, '3');
  assert.equal(records[0].properties.sourceStatus, '1');
  assert.equal(records[0].provenance.providerName, 'EEA (dados comunicados por Portugal)');
});

test('a revised duplicate observation uses the newest result time and keeps a stable record ID', () => {
  const stations = [{ id: 'PT01021', name: 'Estação', longitude: -8.64, latitude: 41.2 }];
  const readings = [
    { stationId: 'PT01021', pollutant: 'PM2.5', value: 3, unit: 'ug.m-3', averagingPeriod: '1 hora', observedAt: '2026-09-24T09:00:00Z', sourceUpdatedAt: '2026-09-24T09:10:00Z', quality: '3' },
    { stationId: 'PT01021', pollutant: 'PM2.5', value: 4, unit: 'ug.m-3', averagingPeriod: '1 hora', observedAt: '2026-09-24T09:00:00Z', sourceUpdatedAt: '2026-09-24T10:10:00Z', quality: '3' },
    { stationId: 'PT01021', pollutant: 'PM2.5', value: 2, unit: 'ug.m-3', averagingPeriod: '1 hora', observedAt: '2026-09-24T08:00:00Z', sourceUpdatedAt: '2026-09-24T11:10:00Z', quality: '1' },
  ];
  const { records } = parseQualAr(stations, readings, '2026-09-24T10:15:00Z', new Date('2026-09-24T10:15:00Z'));
  assert.equal(records.length, 1);
  assert.equal(records[0].id, 'qualar:PT01021:PM2.5');
  assert.equal(records[0].properties.value, 4);
  assert.equal(records[0].sourceUpdatedAt, '2026-09-24T10:10:00.000Z');
  assert.equal(groupQualArRecords(records).length, 1);
});

test('station presentation groups pollutant records into one selectable marker', () => {
  const stations = [{ id: 'PT01021', name: 'Estação', longitude: -8.64, latitude: 41.2 }];
  const readings = ['PM10', 'NO2', 'O3'].map((pollutant, index) => ({ stationId: 'PT01021', pollutant, value: index + 1, unit: 'ug.m-3', averagingPeriod: index === 2 ? '1 dia' : '1 hora', observedAt: `2026-09-24T0${index + 7}:00:00Z` }));
  const { records } = parseQualAr(stations, readings, '2026-09-24T10:00:00Z', new Date('2026-09-24T10:00:00Z'));
  const grouped = groupQualArRecords(records);
  assert.equal(records.length, 3);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].id, 'qualar:station:PT01021');
  assert.equal((grouped[0].properties.measurements as unknown[]).length, 3);
});

test('malformed envelopes, timezone-less rows, negative values and unsupported pollutants never create records', () => {
  assert.deepEqual(parseQualAr({}, [], '2026-09-24T09:05:00Z'), { records: [], rejected: 0 });
  const stations = [{ id: 'PT01021', name: 'Estação', longitude: -8.64, latitude: 41.2 }];
  const readings = [
    { stationId: 'PT01021', pollutant: 'NO2', value: 1, unit: 'ug.m-3', averagingPeriod: '1 hora', observedAt: '2026-09-24T09:00:00' },
    { stationId: 'PT01021', pollutant: 'NO2', value: -999, unit: 'ug.m-3', averagingPeriod: '1 hora', observedAt: '2026-09-24T09:00:00Z' },
    { stationId: 'PT01021', pollutant: 'PM10', value: 1, unit: 'x', averagingPeriod: '1 hora', observedAt: '2026-09-24T09:00:00Z' },
  ];
  const parsed = parseQualAr(stations, readings, '2026-09-24T09:05:00Z');
  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.rejected, 3);
});
