import assert from "node:assert/strict";
import test from "node:test";
import { FOGOS_PATH } from "../../broker/contract.ts";
import { FogosBroker, configFromEnv, type BrokerFetch } from "../../broker/fogos.ts";

const request = () => new Request(`http://localhost${FOGOS_PATH}`);

test("broker requires server-side Fogos configuration", async () => {
  const broker = new FogosBroker({ ...configFromEnv({}), apiKey: undefined });
  const response = await broker.handle(request());
  assert.equal(response.status, 503);
  assert.equal((await response.json()).state, "configuration-required");
});

test("broker uses fixed endpoint and required identifying headers", async () => {
  let seen: { url: string; headers: Headers } | undefined;
  const fetcher: BrokerFetch = async (url, init) => { seen = { url: String(url), headers: new Headers(init?.headers) }; return new Response('{"features":[]}', { status: 200 }); };
  const broker = new FogosBroker({ ...configFromEnv({}), apiKey: "secret", cacheTtlMs: 1000 }, fetcher);
  const response = await broker.handle(request());
  assert.equal(response.status, 200);
  assert.equal(seen?.url, "https://api.fogos.pt/v2/incidents/active?geojson=1");
  assert.equal(seen?.headers.get("x-api-key"), "secret");
  assert.match(seen?.headers.get("user-agent") || "", /PortugalLive\/0\.1/);
});

test("broker coalesces requests and serves TTL cache", async () => {
  let calls = 0;
  let release!: () => void;
  const gate = new Promise<void>((resolve) => { release = resolve; });
  const fetcher: BrokerFetch = async () => { calls += 1; await gate; return new Response('{"ok":true}'); };
  const broker = new FogosBroker({ ...configFromEnv({}), apiKey: "secret", cacheTtlMs: 60_000 }, fetcher);
  const first = broker.handle(request()); const second = broker.handle(request());
  release();
  const [firstResponse, secondResponse] = await Promise.all([first, second]);
  const firstBody = await firstResponse.json() as { state: string; data: { ok: boolean } };
  const secondBody = await secondResponse.json() as { state: string; data: { ok: boolean } };
  assert.deepEqual(firstBody, secondBody);
  assert.deepEqual(firstBody.data, { ok: true });
  assert.equal(firstBody.state, "live");
  await broker.handle(request());
  assert.equal(calls, 1);
});

test("broker honors Retry-After and avoids upstream calls during cooldown", async () => {
  let calls = 0;
  const fetcher: BrokerFetch = async () => { calls += 1; return new Response("busy", { status: 429, headers: { "Retry-After": "30" } }); };
  const broker = new FogosBroker({ ...configFromEnv({}), apiKey: "secret" }, fetcher);
  const first = await broker.handle(request()); const second = await broker.handle(request());
  assert.equal(first.status, 429); assert.equal(second.status, 429); assert.equal(calls, 1);
  assert.equal((await second.json()).state, "rate-limited");
});

test("broker returns stale data after an upstream failure", async () => {
  let calls = 0;
  const fetcher: BrokerFetch = async () => { calls += 1; if (calls === 1) return new Response('{"features":[1]}'); throw new Error("offline"); };
  const broker = new FogosBroker({ ...configFromEnv({}), apiKey: "secret", cacheTtlMs: 1 }, fetcher);
  await broker.handle(request()); await new Promise((resolve) => setTimeout(resolve, 5));
  const response = await broker.handle(request());
  assert.equal(response.status, 200); assert.equal((await response.json()).state, "stale");
});

test("broker sanitizes upstream response errors and rejects oversized payloads", async () => {
  const fetcher: BrokerFetch = async () => new Response("x".repeat(20));
  const broker = new FogosBroker({ ...configFromEnv({}), apiKey: "secret", maxBodyBytes: 16 }, fetcher);
  const body = await (await broker.handle(request())).json() as { error?: { message: string } };
  assert.equal(body.error?.message, "Não foi possível obter dados do fornecedor.");
  assert.equal(JSON.stringify(body).includes("x"), false);
});
