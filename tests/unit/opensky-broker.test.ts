import test from "node:test";
import assert from "node:assert/strict";
import { OpenSkyBroker } from "../../broker/opensky.ts";

const config = { clientId: "id", clientSecret: "secret", upstreamUrl: "https://opensky.test/api/states/all", tokenUrl: "https://opensky.test/token", lamin: 32, lomin: -31.5, lamax: 42.2, lomax: -6, cacheTtlMs: 90_000, timeoutMs: 1000, maxBodyBytes: 100_000 };
const request = () => new Request("http://localhost/api/providers/opensky/states");

test("OpenSky broker obtains OAuth token and requests the bounded Portugal envelope", async () => {
  const calls: string[] = [];
  const broker = new OpenSkyBroker(config, async (input) => {
    calls.push(String(input));
    if (String(input) === config.tokenUrl) return new Response(JSON.stringify({ access_token: "token", expires_in: 300 }), { status: 200 });
    return new Response(JSON.stringify({ time: 1790065668, states: [["44020c", "EJU76AE ", "Austria", 1790065480, 1790065480, -8.6735, 41.2405, 2133.6, false, 139.93, 23.4, null, null, "6767", false, 0, 3]] }), { status: 200 });
  });
  const response = await broker.handle(request());
  assert.equal(response.status, 200);
  assert.equal((await response.json()).state, "live");
  assert.match(calls[1], /lamin=32&lomin=-31.5&lamax=42.2&lomax=-6/);
  assert.equal(calls.length, 2);
  assert.equal((await broker.handle(request())).status, 200);
  assert.equal(calls.length, 2);
});

test("OpenSky broker exposes only a validated remaining-quota header on live and cached snapshots", async () => {
  let stateCalls = 0;
  const broker = new OpenSkyBroker(config, async (input) => {
    if (String(input) === config.tokenUrl) return new Response(JSON.stringify({ access_token: "token", expires_in: 300 }));
    stateCalls += 1;
    return new Response(JSON.stringify({ time: 1790065668, states: [] }), {
      headers: { "x-rate-limit-remaining": "3976", "x-private-provider-header": "discard-me" },
    });
  });
  const live = await broker.handle(request());
  assert.equal(live.headers.get("x-rate-limit-remaining"), "3976");
  assert.equal(live.headers.get("access-control-expose-headers"), "x-rate-limit-remaining");
  assert.equal(live.headers.get("x-private-provider-header"), null);
  const cached = await broker.handle(request());
  assert.equal(cached.headers.get("x-rate-limit-remaining"), "3976");
  assert.equal(stateCalls, 1);
});

test("OpenSky broker keeps stale aircraft available throughout an upstream rate-limit cooldown", async () => {
  let stateCalls = 0;
  const broker = new OpenSkyBroker(config, async (input) => {
    if (String(input) === config.tokenUrl) return new Response(JSON.stringify({ access_token: "token", expires_in: 300 }));
    stateCalls += 1;
    if (stateCalls === 1) return new Response(JSON.stringify({ time: 1790065668, states: [["44020c", "EJU76AE ", "Austria", 1790065480, 1790065480, -8.6735, 41.2405, 2133.6, false, 139.93, 23.4, null, null, "6767", false, 0, 3]] }));
    return new Response("busy", { status: 429, headers: { "Retry-After": "30" } });
  });
  const realNow = Date.now;
  let fakeNow = realNow();
  Date.now = () => fakeNow;
  try {
    const live = await broker.handle(request());
    assert.equal((await live.json()).state, "live");
    fakeNow += config.cacheTtlMs + 1;
    const limited = await broker.handle(request());
    const limitedBody = await limited.json() as { state: string; data: { states: unknown[] }; retryAfterSeconds?: number };
    assert.equal(limited.status, 200);
    assert.equal(limitedBody.state, "stale");
    assert.equal(limitedBody.data.states.length, 1);
    assert.equal(limitedBody.retryAfterSeconds, 30);
    const cooling = await broker.handle(request());
    const coolingBody = await cooling.json() as { state: string; data: { states: unknown[] }; retryAfterSeconds?: number };
    assert.equal(cooling.status, 200);
    assert.equal(coolingBody.state, "stale");
    assert.equal(coolingBody.data.states.length, 1);
    assert.ok((coolingBody.retryAfterSeconds ?? 0) > 0);
    assert.equal(stateCalls, 2);
  } finally { Date.now = realNow; }
});

test("OpenSky broker reports OAuth rejection without contacting the states endpoint", async () => {
  let stateCalls = 0;
  const broker = new OpenSkyBroker(config, async (input) => {
    if (String(input) === config.tokenUrl) return new Response("denied", { status: 401 });
    stateCalls += 1;
    return new Response();
  });
  const response = await broker.handle(request());
  assert.equal(response.status, 502);
  assert.equal((await response.json()).state, "unavailable");
  assert.equal(stateCalls, 0);
});

test("OpenSky broker turns an upstream timeout into an unavailable response", async () => {
  const timeoutConfig = { ...config, timeoutMs: 5 };
  const broker = new OpenSkyBroker(timeoutConfig, async (input, init) => {
    if (String(input) === config.tokenUrl) return new Response(JSON.stringify({ access_token: "token", expires_in: 300 }));
    return await new Promise<Response>((_resolve, reject) => {
      init?.signal?.addEventListener("abort", () => reject(new DOMException("aborted", "AbortError")), { once: true });
    });
  });
  const response = await broker.handle(request());
  const body = await response.json() as { state: string; error?: { code?: string } };
  assert.equal(response.status, 502);
  assert.equal(body.state, "unavailable");
  assert.equal(body.error?.code, "upstream_timeout");
});

test("OpenSky broker reports missing credentials without contacting upstream", async () => {
  let called = false;
  const broker = new OpenSkyBroker({ ...config, clientId: undefined }, async () => { called = true; return new Response(); });
  const response = await broker.handle(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).state, "configuration-required");
  assert.equal(called, false);
});

test("OpenSky broker coalesces refreshes while allowing both callers to consume the response", async () => {
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  let stateCalls = 0;
  const broker = new OpenSkyBroker(config, async (input) => {
    if (String(input) === config.tokenUrl) return new Response(JSON.stringify({ access_token: "token", expires_in: 300 }));
    stateCalls += 1;
    await gate;
    return new Response(JSON.stringify({ time: 1790065668, states: [] }));
  });
  const first = broker.handle(request());
  const second = broker.handle(request());
  release();
  const [firstResponse, secondResponse] = await Promise.all([first, second]);
  const [firstBody, secondBody] = await Promise.all([firstResponse.json(), secondResponse.json()]);
  assert.deepEqual(firstBody, secondBody);
  assert.equal((firstBody as { state: string }).state, "live");
  assert.equal(stateCalls, 1);
});
