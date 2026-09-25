import assert from 'node:assert/strict';
import test from 'node:test';
import { seismicVisualFor } from '../../src/rendering/seismicStyle.ts';
import type { WorldRecord } from '../../src/domain/world.ts';

const event = (observedAt: string, magnitude: number): WorldRecord => ({
  id: 'ipma:test', providerId: 'ipma', kind: 'seismic-event',
  geometry: { type: 'Point', coordinates: [-8, 40] }, observedAt,
  fetchedAt: '2026-09-22T12:00:00Z', temporalClass: 'current', freshness: 'current', quality: 'observed',
  properties: { magnitude },
  provenance: { providerName: 'IPMA', dataset: 'seismic', sourceUrl: 'https://api.ipma.pt', attribution: 'IPMA', transport: 'direct' },
});

test('seismic styling separates age from magnitude', () => {
  const now = new Date('2026-09-22T12:00:00Z');
  const recent = seismicVisualFor(event('2026-09-22T10:00:00Z', 2), now);
  const history = seismicVisualFor(event('2026-09-10T10:00:00Z', 2), now);
  const larger = seismicVisualFor(event('2026-09-22T10:00:00Z', 5), now);
  assert.equal(recent.ageBand, 'recent');
  assert.equal(history.ageBand, 'history');
  assert.ok(recent.color.alpha > history.color.alpha);
  assert.ok(larger.pixelSize > recent.pixelSize);
});
