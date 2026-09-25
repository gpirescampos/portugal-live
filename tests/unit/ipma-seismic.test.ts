import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parseIpmaSeismicEnvelope } from '../../src/providers/ipma-seismic/parser.ts';

const fixture = async (name: string) => JSON.parse(await readFile(new URL(`../fixtures/providers/${name}`, import.meta.url), 'utf8'));

test('normalizes valid seismic events and rejects sentinel magnitude', async () => {
  const parsed = parseIpmaSeismicEnvelope(await fixture('ipma-seismic.json'), 7, '2026-09-22T08:00:00Z');
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.rejected, 1);
  assert.equal(parsed.records[0].id, 'ipma:20260922010101C');
  assert.deepEqual(parsed.records[0].geometry, { type: 'Point', coordinates: [-9.135, 38.557, 7] });
  assert.equal(parsed.records[0].properties.magnitude, 1.9);
  assert.equal(parsed.records[0].provenance.transport, 'direct');
});

test('rejects malformed rows while retaining valid partial data', async () => {
  const parsed = parseIpmaSeismicEnvelope(await fixture('ipma-seismic-partial.json'), 3, '2026-09-22T08:00:00Z');
  assert.equal(parsed.records.length, 1);
  assert.equal(parsed.rejected, 1);
  assert.equal(parsed.records[0].id, 'ipma:valid-1');
});

test('reports malformed envelope as a parse error', () => {
  const parsed = parseIpmaSeismicEnvelope({ data: 'not-an-array' }, 7, '2026-09-22T08:00:00Z');
  assert.equal(parsed.records.length, 0);
  assert.equal(parsed.error?.code, 'parse');
});
