import assert from 'node:assert/strict';
import test from 'node:test';
import { FIRMS_PATH } from '../../broker/contract.ts';
import { FirmsBroker, FIRMS_REGIONS, configFromEnv, type FirmsFetch } from '../../broker/firms.ts';

const request = () => new Request(`http://localhost${FIRMS_PATH}`);
const csv = 'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n38.9,-9.0,313.4,0.43,0.46,2026-09-22,0112,NOAA-20,VIIRS,n,2.0NRT,291.7,4.2,N\n';

test('FIRMS broker requires a broker-only MAP_KEY', async () => {
  const broker = new FirmsBroker(configFromEnv({ FIRMS_MAP_KEY: '' }));
  const response = await broker.handle(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).state, 'configuration-required');
});

test('queries fixed Portugal regions using the configured source and caches for 30 minutes', async () => {
  const seen: string[] = [];
  const fetcher: FirmsFetch = async (url) => { seen.push(String(url)); return new Response(csv, { headers: { 'content-type': 'text/csv' } }); };
  const config = { ...configFromEnv({ FIRMS_MAP_KEY: 'test-map-key' }), mapKey: 'test-map-key' };
  const broker = new FirmsBroker(config, fetcher);
  const first = await broker.handle(request());
  const body = await first.json() as { state: string; data: { regions: Array<{ id: string }> } };
  assert.equal(first.status, 200);
  assert.equal(body.state, 'live');
  assert.deepEqual(body.data.regions.map(({ id }) => id), FIRMS_REGIONS.map(({ id }) => id));
  assert.equal(seen.length, 3);
  assert.ok(seen.every((url) => url.includes('/VIIRS_NOAA20_NRT/') && url.endsWith('/2')));
  assert.ok(seen.every((url) => url.includes('test-map-key')));
  assert.equal(JSON.stringify(body).includes('test-map-key'), false);
  await broker.handle(request());
  assert.equal(seen.length, 3);
});

test('keeps successful regions and identifies failed regions as partial', async () => {
  let requestIndex = 0;
  const fetcher: FirmsFetch = async () => { requestIndex += 1; return requestIndex === 2 ? new Response('offline', { status: 503 }) : new Response(csv); };
  const broker = new FirmsBroker({ ...configFromEnv({}), mapKey: 'test-map-key' }, fetcher);
  const body = await (await broker.handle(request())).json() as { state: string; data: { regions: Array<{ id: string }>; failedRegions: string[] } };
  assert.equal(body.state, 'partial');
  assert.deepEqual(body.data.regions.map(({ id }) => id), ['mainland', 'azores']);
  assert.deepEqual(body.data.failedRegions, ['madeira']);
});

test('coalesces concurrent requests and sanitizes oversized/non-CSV upstream responses', async () => {
  let calls = 0; let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fetcher: FirmsFetch = async () => { calls += 1; await gate; return new Response(csv); };
  const broker = new FirmsBroker({ ...configFromEnv({}), mapKey: 'test-map-key' }, fetcher);
  const first = broker.handle(request()); const second = broker.handle(request()); release();
  const [firstResponse, secondResponse] = await Promise.all([first, second]);
  const [firstBody, secondBody] = await Promise.all([firstResponse.json(), secondResponse.json()]);
  assert.equal((firstBody as { state: string }).state, 'live');
  assert.equal((secondBody as { state: string }).state, 'live');
  assert.equal(calls, 3);

  const invalid = new FirmsBroker({ ...configFromEnv({}), mapKey: 'test-map-key' }, async () => new Response('<html>error</html>'));
  const failure = await invalid.handle(request());
  assert.equal(failure.status, 502);
  assert.equal(JSON.stringify(await failure.json()).includes('test-map-key'), false);
});

test('returns stale per-region cache when all upstream areas fail', async () => {
  let calls = 0;
  const broker = new FirmsBroker({ ...configFromEnv({}), mapKey: 'test-map-key', cacheTtlMs: 60_000 }, async () => {
    calls += 1; return calls <= 3 ? new Response(csv) : new Response('offline', { status: 503 });
  });
  const realNow = Date.now;
  let fakeNow = realNow();
  Date.now = () => fakeNow;
  try {
    await broker.handle(request());
    fakeNow += 61_000;
    const body = await (await broker.handle(request())).json() as { state: string; data: { regions: Array<{ stale: boolean }> } };
    assert.equal(body.state, 'stale');
    assert.equal(body.data.regions.length, 3);
    assert.ok(body.data.regions.every(({ stale }) => stale));
  } finally { Date.now = realNow; }
});
