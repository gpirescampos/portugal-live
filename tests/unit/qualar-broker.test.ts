import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { QUALAR_EEA_API, QUALAR_PATH, QUALAR_STATIONS_API } from '../../broker/contract.ts';
import { QualArBroker, qualArConfigFromEnv, type QualArFetch } from '../../broker/qualar.ts';

const request = () => new Request(`http://localhost${QUALAR_PATH}`);
const parquetZip = new Uint8Array(await readFile(new URL('../fixtures/providers/qualar-eea-sample.zip', import.meta.url)));

test('QualAr broker bounds its EEA E2a query, joins inventory, decodes the archive and caches it', async () => {
  const seen: Array<{ url: string; init?: RequestInit }> = [];
  const fetcher: QualArFetch = async (url, init) => {
    seen.push({ url: String(url), init });
    if (String(url).startsWith(QUALAR_STATIONS_API)) return new Response(JSON.stringify({ features: [{ attributes: { AirQualityStationEoICode: 'PT01021', AQStationName: 'Estação', stationClass: 2 }, geometry: { x: -9.1, y: 38.7 } }] }));
    return new Response(parquetZip, { headers: { 'content-type': 'application/zip' } });
  };
  const broker = new QualArBroker(qualArConfigFromEnv({}), fetcher);
  const response = await broker.handle(request());
  const body = await response.json() as { state: string; data?: { stations: unknown[]; readings: unknown[]; source: string } };
  assert.equal(response.status, 200);
  assert.equal(body.state, 'live');
  assert.equal(body.data?.source, 'eea-e2a');
  assert.equal(body.data?.stations.length, 1);
  assert.equal(body.data?.readings.length, 9032);
  assert.equal((body.data?.readings[0] as { Samplingpoint: string }).Samplingpoint, 'PT/SPO-PT01021_00005_100');
  const station = seen.find(({ url }) => url.startsWith(QUALAR_STATIONS_API));
  const query = new URL(station!.url);
  assert.equal(query.searchParams.get('where'), "CountryCode='PT'");
  assert.match(query.searchParams.get('outFields') ?? '', /AirQualityStationEoICode/);
  const measurement = seen.find(({ url }) => url === QUALAR_EEA_API);
  assert.equal(measurement?.init?.method, 'POST');
  const payload = JSON.parse(String(measurement?.init?.body)) as { countries: string[]; dataset: number; source: string; aggregationType: string; pollutants: string[]; dateTimeStart: string; dateTimeEnd: string };
  assert.deepEqual(payload.countries, ['PT']);
  assert.equal(payload.dataset, 1);
  assert.equal(payload.source, 'E2a');
  assert.equal(payload.aggregationType, 'hour');
  assert.equal(payload.pollutants.length, 6);
  assert.equal(Date.parse(payload.dateTimeEnd) - Date.parse(payload.dateTimeStart), 48 * 60 * 60_000);
});

test('QualAr broker retains last good data when an upstream is rate-limited', async () => {
  let requestCount = 0;
  const fetcher: QualArFetch = async (url) => {
    if (!String(url).startsWith(QUALAR_STATIONS_API)) requestCount += 1;
    if (String(url).startsWith(QUALAR_STATIONS_API)) return new Response(JSON.stringify({ features: [{ attributes: { AirQualityStationEoICode: 'PT01021', AQStationName: 'Estação' }, geometry: { x: -9.1, y: 38.7 } }] }));
    return requestCount === 2 ? new Response('limited', { status: 429 }) : new Response(parquetZip);
  };
  const broker = new QualArBroker({ cacheTtlMs: 10 }, fetcher);
  await broker.handle(request());
  const realNow = Date.now;
  let fakeNow = realNow();
  Date.now = () => fakeNow;
  try {
    fakeNow += 11;
    const body = await (await broker.handle(request())).json() as { state: string; error?: { code: string } };
    assert.equal(body.state, 'stale');
    assert.equal(body.error?.code, 'rate-limited');
  } finally { Date.now = realNow; }
});
