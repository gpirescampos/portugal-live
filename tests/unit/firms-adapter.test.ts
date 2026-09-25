import assert from 'node:assert/strict';
import test from 'node:test';
import { FirmsAdapter } from '../../src/providers/firms/adapter.ts';

const csv = 'latitude,longitude,bright_ti4,scan,track,acq_date,acq_time,satellite,instrument,confidence,version,bright_ti5,frp,daynight\n38.9,-9.0,313.4,0.43,0.46,2026-09-22,0112,NOAA-20,VIIRS,n,2.0NRT,291.7,4.2,N\n';
const context = { endpoint: 'http://broker.test/api/providers/firms/detections', now: new Date('2026-09-22T10:00:00.000Z'), signal: new AbortController().signal };

test('uses the broker contract and reports the 30-minute refresh cadence', async () => {
  assert.equal(new FirmsAdapter().refreshIntervalMs, 30 * 60_000);
  const originalFetch = globalThis.fetch;
  let requested = '';
  globalThis.fetch = async (url) => {
    requested = String(url);
    return new Response(JSON.stringify({ provider: 'firms', state: 'live', data: { source: 'VIIRS_NOAA20_NRT', regions: [{ id: 'mainland', csv, fetchedAt: context.now.toISOString() }], failedRegions: [] } }), { status: 200 });
  };
  try {
    const snapshot = await new FirmsAdapter().fetch(context);
    assert.equal(requested, context.endpoint);
    assert.equal(snapshot.status.state, 'ready');
    assert.equal(snapshot.records.length, 1);
  } finally { globalThis.fetch = originalFetch; }
});

test('preserves valid records from partial regional responses', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ provider: 'firms', state: 'partial', data: { regions: [{ id: 'mainland', csv, fetchedAt: context.now.toISOString() }], failedRegions: ['azores'] } }), { status: 200 });
  try {
    const snapshot = await new FirmsAdapter().fetch(context);
    assert.equal(snapshot.status.state, 'partial');
    assert.equal(snapshot.records.length, 1);
    assert.equal(snapshot.status.error?.code, 'validation');
  } finally { globalThis.fetch = originalFetch; }
});

test('reports missing broker configuration and malformed broker envelopes', async () => {
  const adapter = new FirmsAdapter();
  const missing = await adapter.fetch(context, { brokerConfigured: false });
  assert.equal(missing.status.state, 'configuration-required');
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response('{"provider":"firms","state":"live","data":{}}', { status: 200 });
  try {
    const malformed = await adapter.fetch(context);
    assert.equal(malformed.status.state, 'error');
    assert.equal(malformed.status.error?.code, 'parse');
  } finally { globalThis.fetch = originalFetch; }
});
