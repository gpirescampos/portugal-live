import type { ProviderAdapter, ProviderStore } from '../domain/provider.ts';
import type { ProviderId, ProviderSnapshot, WorldRecord } from '../domain/world.ts';
import { LayerRegistry } from './layerRegistry.ts';
import { ProviderScheduler } from './scheduler.ts';

/** The small rendering surface shared by all entity-backed datasets. */
export interface DatasetRenderer {
  render(records: WorldRecord[]): void;
  clear?: () => void;
}

export interface DatasetDefinition<TConfig = unknown> {
  id: ProviderId;
  label: string;
  recordNoun: string;
  endpoint: string;
  adapter: ProviderAdapter<TConfig>;
  renderer: DatasetRenderer;
  getConfig?: () => TConfig;
  formatStatus?: (snapshot: ProviderSnapshot) => string;
}

/**
 * Registers the common lifecycle for a dataset: layer state, provider store,
 * scheduled refresh, normalized records, renderer updates, and status text.
 * Dataset-specific parsing and presentation remain in the adapter/renderer.
 */
export function registerDataset<TConfig>(
  definition: DatasetDefinition<TConfig>,
  dependencies: {
    layers: LayerRegistry;
    store: ProviderStore;
    scheduler: ProviderScheduler;
    setStatus: (id: ProviderId, status: string, available: boolean) => void;
  },
): void {
  const { id, adapter } = definition;
  dependencies.layers.register({ id, label: definition.label, enabled: false, records: [] });
  dependencies.scheduler.register({
    id,
    intervalMs: adapter.refreshIntervalMs,
    refresh: async ({ signal }) => {
      const snapshot = await adapter.fetch({ signal, now: new Date(), endpoint: definition.endpoint }, definition.getConfig?.() as TConfig);
      dependencies.store.set(snapshot);
      dependencies.layers.updateRecords(id, snapshot.records);
      if (dependencies.layers.isEnabled(id)) definition.renderer.render(snapshot.records);
      const status = definition.formatStatus
        ? definition.formatStatus(snapshot)
        : `${snapshot.status.state.toUpperCase()} · ${snapshot.records.length} ${definition.recordNoun}`;
      dependencies.setStatus(id, status, true);
    },
  });
}
