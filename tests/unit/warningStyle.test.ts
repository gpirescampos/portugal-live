import test from 'node:test';
import assert from 'node:assert/strict';
import { warningVisualFor } from '../../src/rendering/warningStyle.ts';
import type { WorldRecord } from '../../src/domain/world.ts';

const record = (severity: string): WorldRecord => ({
  id: `ipma:${severity}`, providerId: 'ipma', kind: 'warning-area',
  geometry: { type: 'Point', coordinates: [-9, 39] }, observedAt: null,
  fetchedAt: new Date().toISOString(), temporalClass: 'current', freshness: 'current', quality: 'reported',
  properties: { severity }, provenance: { providerName: 'IPMA', dataset: 'warnings', sourceUrl: 'https://api.ipma.pt', attribution: 'IPMA', transport: 'direct' },
});

test('warning severity maps to distinct visual bands', () => {
  assert.equal(warningVisualFor(record('yellow')).severity, 'yellow');
  assert.equal(warningVisualFor(record('orange')).severity, 'orange');
  assert.equal(warningVisualFor(record('red')).severity, 'red');
});

test('unknown warning severity remains subdued and explicit', () => {
  const visual = warningVisualFor(record('unexpected'));
  assert.equal(visual.severity, 'unknown');
  assert.equal(visual.fill.alpha, 0.12);
});
