import test from "node:test";
import assert from "node:assert/strict";
import { parseOpenSkyEnvelope } from "../../src/providers/opensky/parser.ts";
import { OpenSkyAdapter } from "../../src/providers/opensky/adapter.ts";

const fixture = {
  time: 1_790_065_620,
  states: [["44020c", "EJU76AE ", "Austria", 1790065480, 1790065480, -8.6735, 41.2405, 2133.6, false, 139.93, 23.4, null, null, 2100, "6767", false, 0, 3]],
};

test("parses OpenSky state vectors into observed aircraft records", () => {
  const result = parseOpenSkyEnvelope(fixture, "2026-09-21T12:00:00.000Z", new Date("2026-09-21T12:00:00.000Z"));
  assert.equal(result.error, undefined);
  assert.equal(result.rejected, 0);
  assert.equal(result.records.length, 1);
  const record = result.records[0];
  assert.equal(record.id, "opensky:44020c");
  assert.deepEqual(record.geometry, { type: "Point", coordinates: [-8.6735, 41.2405, 2100] });
  assert.equal(record.properties.callsign, "EJU76AE");
  assert.equal(record.properties.velocityMps, 139.93);
  assert.equal(record.properties.headingDegrees, 23.4);
  assert.equal(record.quality, "observed");
  assert.equal(record.provenance.transport, "brokered");
});

test("rejects malformed or unlocated state vectors without failing the batch", () => {
  const result = parseOpenSkyEnvelope({ time: 1_790_065_620, states: [fixture.states[0], ["bad"], null] }, "2026-09-21T12:00:00.000Z");
  assert.equal(result.records.length, 1);
  assert.equal(result.rejected, 2);
});

test("accepts OpenSky's explicit empty response", () => {
  const result = parseOpenSkyEnvelope({ time: 1_790_065_620, states: null }, "2026-09-21T12:00:00.000Z");
  assert.deepEqual(result.records, []);
  assert.equal(result.error, undefined);
});

test("adapter reports malformed provider payload as an error snapshot", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ states: "bad" }), { status: 200, headers: { "content-type": "application/json" } });
  try {
    const snapshot = await new OpenSkyAdapter().fetch({ endpoint: "http://broker.test/api/providers/opensky/states", now: new Date("2026-09-21T12:00:00.000Z"), signal: new AbortController().signal });
    assert.equal(snapshot.status.state, "error");
    assert.equal(snapshot.status.error?.code, "parse");
  } finally { globalThis.fetch = originalFetch; }
});

test("adapter presents a broker 429 as a temporary rate-limit status with retry delay", async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => new Response(JSON.stringify({ provider: "opensky", state: "rate-limited", retryAfterSeconds: 30 }), { status: 429, headers: { "content-type": "application/json" } });
  try {
    const snapshot = await new OpenSkyAdapter().fetch({ endpoint: "http://broker.test/api/providers/opensky/states", now: new Date("2026-09-21T12:00:00.000Z"), signal: new AbortController().signal });
    assert.equal(snapshot.status.state, "rate-limited");
    assert.equal(snapshot.status.error?.code, "rate-limit");
    assert.equal(snapshot.status.error?.retryAfterSeconds, 30);
  } finally { globalThis.fetch = originalFetch; }
});
