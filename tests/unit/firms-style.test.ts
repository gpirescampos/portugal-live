import assert from 'node:assert/strict';
import test from 'node:test';
import { firmsVisualFor } from '../../src/rendering/firmsStyle.ts';
import type { WorldRecord } from '../../src/domain/world.ts';

const record = (confidenceBand: string, frpMw: number, freshness: WorldRecord['freshness'] = 'near-live'): WorldRecord => ({
  id: 'firms:test', providerId: 'firms', kind: 'thermal-detection', geometry: { type: 'Point', coordinates: [-9, 39] },
  observedAt: '2026-09-22T10:00:00.000Z', fetchedAt: '2026-09-22T10:00:00.000Z', temporalClass: 'near-live', freshness,
  quality: 'satellite-detected', properties: { confidenceBand, frpMw },
  provenance: { providerName: 'NASA FIRMS', dataset: 'thermal detections', sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/map/', attribution: 'NASA FIRMS', transport: 'brokered' },
});

test('confidence selects distinct colors and FRP controls marker size', () => {
  const low = firmsVisualFor(record('low', 1));
  const nominal = firmsVisualFor(record('nominal', 4));
  const high = firmsVisualFor(record('high', 16));
  const unknown = firmsVisualFor(record('unknown', 4));
  assert.notEqual(low.color.toCssColorString(), nominal.color.toCssColorString());
  assert.notEqual(nominal.color.toCssColorString(), high.color.toCssColorString());
  assert.notEqual(unknown.color.toCssColorString(), low.color.toCssColorString());
  assert.ok(high.pixelSize > nominal.pixelSize);
  assert.ok(nominal.pixelSize > low.pixelSize);
});

test('stale FIRMS data is visually subdued', () => {
  assert.ok(firmsVisualFor(record('nominal', 4, 'stale')).color.alpha < firmsVisualFor(record('nominal', 4)).color.alpha);
});
