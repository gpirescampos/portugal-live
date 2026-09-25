import assert from 'node:assert/strict';
import test from 'node:test';
import { registerDataset } from '../../src/data/datasetRegistry.ts';
import { LayerRegistry } from '../../src/data/layerRegistry.ts';
import { ProviderScheduler } from '../../src/data/scheduler.ts';
import { MemoryProviderStore } from '../../src/domain/provider.ts';

test('dataset registry wires a dataset into the shared layer and scheduler lifecycle', async () => {
  const layers = new LayerRegistry();
  const scheduler = new ProviderScheduler({ jitterRatio: 0, random: () => 0.5 });
  const store = new MemoryProviderStore();
  const rendered: unknown[] = [];
  const statuses: string[] = [];
  const snapshot = {
    providerId: 'ipma', records: [], fetchedAt: new Date().toISOString(),
    status: { providerId: 'ipma', state: 'ready', recordCount: 0, fetchedAt: new Date().toISOString() },
  };
  registerDataset({
    id: 'ipma', label: 'Sismicidade', recordNoun: 'EVENTOS', endpoint: 'fixture',
    adapter: { id: 'ipma', displayName: 'Fixture', refreshIntervalMs: 60_000, staleAfterMs: 60_000, provenance: { dataset: 'fixture', sourceUrl: 'fixture', attribution: 'Fixture' }, isConfigured: () => true, fetch: async () => snapshot },
    renderer: { render: (records) => rendered.push(records) },
    formatStatus: (value) => `OK ${value.records.length}`,
  }, { layers, store, scheduler, setStatus: (_id, status) => statuses.push(status) });
  assert.equal(layers.get('ipma').label, 'Sismicidade');
  scheduler.start('ipma');
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.deepEqual(statuses, ['OK 0']);
  assert.equal(store.get('ipma')?.providerId, 'ipma');
  assert.equal(rendered.length, 0, 'disabled datasets do not render');
  scheduler.destroy();
});
