import test from "node:test";
import assert from "node:assert/strict";
import fixture from "../fixtures/providers/fogos-active.json" with { type: "json" };
import { parseFogos } from "../../src/providers/fogos/parser.ts";

test("parses Fogos fixture into reported incident records", () => {
  const parsed = parseFogos(fixture, "2026-09-22T10:00:00.000Z", new Date("2026-09-22T10:00:00.000Z"));
  assert.equal(parsed.error, undefined); assert.equal(parsed.rejected, 0); assert.equal(parsed.records.length, 1);
  const record = parsed.records[0];
  assert.equal(record.id, "fogos:fixture-incident-001"); assert.deepEqual(record.geometry, { type: "Point", coordinates: [-7.621623, 40.36119] });
  assert.equal(record.quality, "reported"); assert.equal(record.freshness, "current");
  assert.equal(record.properties.status, "Em Curso"); assert.equal(record.properties.municipality, "Seia");
  assert.deepEqual(record.properties.resources, { personnel: 3, terrestrial: 1, aerial: 0, aquatic: 0 });
});

test("accepts GeoJSON feature payloads", () => {
  const parsed = parseFogos({ type: "FeatureCollection", features: [{ type: "Feature", geometry: { type: "Point", coordinates: [-8, 41] }, properties: { id: "geo-1", status: "Resolvido" } }] }, "2026-09-22T10:00:00.000Z");
  assert.equal(parsed.records.length, 1); assert.equal(parsed.records[0].properties.status, "Resolvido");
});

test("rejects malformed incidents and invalid payloads", () => {
  const parsed = parseFogos({ data: [{ id: "missing-coordinates" }, null, { id: "bad", lat: 200, lng: 1 }] }, "2026-09-22T10:00:00.000Z");
  assert.equal(parsed.records.length, 0); assert.equal(parsed.rejected, 3);
  assert.equal(parseFogos({ nope: true }, "2026-09-22T10:00:00.000Z").error?.code, "parse");
});
