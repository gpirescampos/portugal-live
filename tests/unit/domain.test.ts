import assert from 'node:assert/strict';
import test from 'node:test';
import { compositeId } from '../../src/domain/ids.ts';
import { freshnessForAge } from '../../src/domain/freshness.ts';
import { MemoryProviderStore } from '../../src/domain/provider.ts';
import type { ProviderSnapshot } from '../../src/domain/world.ts';

test('freshness distinguishes live, current, and stale records', () => {
  assert.equal(freshnessForAge('opensky', 10_000), 'live');
  assert.equal(freshnessForAge('ipma', 10_000), 'current');
  assert.equal(freshnessForAge('ipma', 200_000_000), 'stale');
});

test('composite identifiers are deterministic and namespaced', () => {
  assert.equal(compositeId('ipma', '2026-01-01', 1), compositeId('ipma', '2026-01-01', 1));
  assert.match(compositeId('ipma', 'x'), /^ipma:[0-9a-f]{8}$/);
});

test('store rejects an older late snapshot', () => {
  const store = new MemoryProviderStore();
  const snapshot = (fetchedAt: string): ProviderSnapshot => ({
    providerId: 'ipma', records: [], fetchedAt,
    status: { providerId: 'ipma', state: 'ready', recordCount: 0, fetchedAt },
  });
  store.set(snapshot('2026-01-02T00:00:00Z'));
  store.set(snapshot('2026-01-01T00:00:00Z'));
  assert.equal(store.get('ipma')?.fetchedAt, '2026-01-02T00:00:00Z');
});
