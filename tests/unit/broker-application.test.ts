import assert from 'node:assert/strict';
import test from 'node:test';
import { createBrokerApplication } from '../../broker/application.ts';
import { FOGOS_PATH } from '../../broker/contract.ts';
import { createEdgeBroker } from '../../broker/edge.ts';
import { FogosBroker, configFromEnv as fogosConfigFromEnv } from '../../broker/fogos.ts';
import { allowedOriginFromEnv, DEFAULT_BROKER_ORIGIN } from '../../broker/http.ts';

const fogosPayload = '{"features":[]}';

async function assertSharedBrokerContract(fetchHandler: (request: Request) => Promise<Response>): Promise<void> {
  const origin = 'http://localhost:4173';
  const response = await fetchHandler(new Request(`http://broker.local${FOGOS_PATH}`, { headers: { Origin: origin } }));
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(response.headers.get('vary'), 'Origin');
  const envelope = await response.json() as { provider: string; state: string; data: unknown };
  assert.equal(envelope.provider, 'fogos');
  assert.equal(envelope.state, 'live');
  assert.deepEqual(envelope.data, { features: [] });

  const unknown = await fetchHandler(new Request('http://broker.local/api/unknown'));
  assert.equal(unknown.status, 404);
  assert.equal((await unknown.json() as { provider: string }).provider, 'broker');
}

test('local Fetch broker application and edge adapter satisfy the same route contract', async (t) => {
  await t.test('local application', async () => {
    const env = { FOGOS_API_KEY: 'fixture-key', BROKER_ALLOWED_ORIGIN: 'http://localhost:4173' };
    const broker = new FogosBroker(fogosConfigFromEnv(env), async () => new Response(fogosPayload));
    await assertSharedBrokerContract(createBrokerApplication({ [FOGOS_PATH]: broker }));
  });

  await t.test('edge Fetch adapter', async () => {
    const edge = createEdgeBroker({ FOGOS_API_KEY: 'fixture-key', BROKER_ALLOWED_ORIGIN: 'http://localhost:4173' }, async () => new Response(fogosPayload));
    await assertSharedBrokerContract(edge.fetch);
  });
});

test('wildcard broker CORS configuration falls back to the exact local app origin', () => {
  assert.equal(allowedOriginFromEnv({ BROKER_ALLOWED_ORIGIN: '*' }), DEFAULT_BROKER_ORIGIN);
  assert.notEqual(allowedOriginFromEnv({ BROKER_ALLOWED_ORIGIN: '*' }), '*');
  assert.equal(allowedOriginFromEnv({ BROKER_ALLOWED_ORIGIN: 'not-an-origin' }), DEFAULT_BROKER_ORIGIN);
  assert.equal(allowedOriginFromEnv({ BROKER_ALLOWED_ORIGIN: 'ftp://localhost:4173' }), DEFAULT_BROKER_ORIGIN);
});

test('broker CORS preserves an explicitly configured alternate local port', async () => {
  const origin = 'http://localhost:4174';
  const broker = new FogosBroker(fogosConfigFromEnv({ FOGOS_API_KEY: 'fixture-key', BROKER_ALLOWED_ORIGIN: origin }), async () => new Response(fogosPayload));
  const app = createBrokerApplication({ [FOGOS_PATH]: broker }, allowedOriginFromEnv({ BROKER_ALLOWED_ORIGIN: origin }));
  const response = await app(new Request(`http://broker.local${FOGOS_PATH}`, { headers: { Origin: origin } }));
  assert.equal(response.headers.get('access-control-allow-origin'), origin);
  assert.equal(response.headers.get('access-control-allow-origin'), 'http://localhost:4174');
  assert.equal(response.headers.get('vary'), 'Origin');
});

test('broker CORS preflight returns the configured exact origin for known and unknown callers', async () => {
  const origin = 'http://localhost:4173';
  const broker = new FogosBroker(fogosConfigFromEnv({ FOGOS_API_KEY: 'fixture-key', BROKER_ALLOWED_ORIGIN: origin }), async () => new Response(fogosPayload));
  const app = createBrokerApplication({ [FOGOS_PATH]: broker }, origin);
  const preflight = await app(new Request(`http://broker.local${FOGOS_PATH}`, { method: 'OPTIONS', headers: { Origin: origin, 'Access-Control-Request-Method': 'GET' } }));
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get('access-control-allow-origin'), origin);
  assert.equal(preflight.headers.get('access-control-allow-methods'), 'GET, OPTIONS');

  const unknownOrigin = 'https://unknown.example';
  const unknown = await app(new Request(`http://broker.local${FOGOS_PATH}`, { headers: { Origin: unknownOrigin } }));
  assert.equal(unknown.headers.get('access-control-allow-origin'), origin);
  assert.notEqual(unknown.headers.get('access-control-allow-origin'), unknownOrigin);

  const noOrigin = await app(new Request(`http://broker.local${FOGOS_PATH}`));
  assert.equal(noOrigin.headers.get('access-control-allow-origin'), origin);
});

test('Fetch broker application sanitizes unexpected provider exceptions and keeps routing alive', async () => {
  const app = createBrokerApplication({
    '/api/failing': { handle: async () => { throw new Error('secret upstream detail'); } },
    '/api/healthy': { handle: async () => new Response('ok') },
  });
  const error = await app(new Request('http://broker.local/api/failing'));
  assert.equal(error.status, 500);
  assert.doesNotMatch(await error.text(), /secret upstream detail/);
  assert.equal(await (await app(new Request('http://broker.local/api/healthy'))).text(), 'ok');
});
