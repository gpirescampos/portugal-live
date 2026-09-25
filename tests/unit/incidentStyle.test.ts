import test from 'node:test';
import assert from 'node:assert/strict';
import { incidentVisualFor } from '../../src/rendering/incidentStyle.ts';
import type { WorldRecord } from '../../src/domain/world.ts';

const record = (status: string, resources: Record<string, number>, freshness: WorldRecord['freshness'] = 'live'): WorldRecord => ({
  id: 'fogos:test', providerId: 'fogos', kind: 'wildfire-incident', geometry: { type: 'Point', coordinates: [-8, 40] }, observedAt: '2026-09-22T10:00:00Z', fetchedAt: '2026-09-22T10:01:00Z', temporalClass: 'live', freshness, quality: 'reported', properties: { status, resources }, provenance: { providerName: 'Fogos.pt', dataset: 'incidents', sourceUrl: 'https://fogos.pt', attribution: 'Fogos.pt', transport: 'brokered' },
});

test('incident styling maps operational states and resource size', () => {
  const small = incidentVisualFor(record('Em Curso', { personnel: 1, terrestrial: 0, aerial: 0 }));
  const large = incidentVisualFor(record('Em Curso', { personnel: 20, terrestrial: 8, aerial: 2 }));
  assert.equal(small.statusBand, 'active');
  assert.ok(large.pixelSize > small.pixelSize);
  assert.equal(incidentVisualFor(record('Em Resolução', {})).statusBand, 'resolving');
  assert.equal(incidentVisualFor(record('Estado desconhecido', {})).statusBand, 'unknown');
});

test('stale incident styling reduces opacity without changing status', () => {
  const visual = incidentVisualFor(record('Em Curso', {}, 'stale'));
  assert.equal(visual.statusBand, 'active');
  assert.equal(visual.color.alpha, 0.45);
});
