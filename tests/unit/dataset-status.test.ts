import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDatasetStatus } from '../../src/ui/datasetStatus.ts';
import type { ProviderSnapshot } from '../../src/domain/world.ts';

function snapshot(state: ProviderSnapshot['status']['state'], recordCount: number, errorCode?: string): ProviderSnapshot {
  const fetchedAt = '2026-09-23T09:14:00.000Z';
  return {
    providerId: 'firms', records: [], fetchedAt,
    status: { providerId: 'firms', state, recordCount, fetchedAt, ...(errorCode ? { error: { code: errorCode as 'configuration', message: 'fixture' } } : {}) },
  };
}

test('dataset status uses neutral availability language and a Portuguese check time', () => {
  assert.match(formatDatasetStatus(snapshot('ready', 12), 'DETEÇÕES'), /^DISPONÍVEL · 12 DETEÇÕES · CONSULTA /);
  assert.match(formatDatasetStatus(snapshot('ready', 0), 'EVENTOS'), /^SEM REGISTOS · 0 EVENTOS · CONSULTA /);
});

test('dataset status distinguishes stale, partial, and unavailable states without raw error codes', () => {
  assert.match(formatDatasetStatus(snapshot('stale', 3), 'AERONAVES'), /^DESATUALIZADO · 3 AERONAVES/);
  assert.match(formatDatasetStatus(snapshot('partial', 2), 'AVISOS'), /^PARCIAL · 2 AVISOS/);
  const unavailable = formatDatasetStatus(snapshot('error', 0, 'network'), 'INCIDENTES');
  assert.match(unavailable, /^FALHA DE REDE · 0 INCIDENTES/);
  assert.doesNotMatch(unavailable, /network/);
  assert.match(formatDatasetStatus(snapshot('rate-limited', 0, 'rate-limit'), 'AERONAVES'), /^LIMITADO TEMPORARIAMENTE · 0 AERONAVES/);
});

test('source update time is distinguished from browser query time', () => {
  const current = snapshot('ready', 1);
  current.sourceUpdatedAt = '2026-09-23T08:40:00.000Z';
  assert.match(formatDatasetStatus(current, 'EVENTOS'), /ORIGEM /);
});
