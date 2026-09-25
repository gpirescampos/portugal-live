import type { ProviderId, WorldRecord } from '../domain/world.ts';

export interface LayerDefinition {
  id: ProviderId;
  label: string;
  enabled: boolean;
  records: WorldRecord[];
}

/** UI-agnostic registry for idempotent layer enable/disable state. */
export class LayerRegistry {
  private readonly layers = new Map<ProviderId, LayerDefinition>();

  register(layer: LayerDefinition): void {
    if (this.layers.has(layer.id)) throw new Error(`Layer already registered: ${layer.id}`);
    this.layers.set(layer.id, { ...layer, records: [...layer.records] });
  }

  setEnabled(id: ProviderId, enabled: boolean): void {
    const layer = this.require(id);
    layer.enabled = enabled;
  }

  isEnabled(id: ProviderId): boolean {
    return this.require(id).enabled;
  }

  updateRecords(id: ProviderId, records: WorldRecord[]): void {
    this.require(id).records = [...records];
  }

  visibleRecords(): WorldRecord[] {
    return [...this.layers.values()].filter((layer) => layer.enabled).flatMap((layer) => layer.records);
  }

  get(id: ProviderId): LayerDefinition {
    const layer = this.require(id);
    return { ...layer, records: [...layer.records] };
  }

  private require(id: ProviderId): LayerDefinition {
    const layer = this.layers.get(id);
    if (!layer) throw new Error(`Unknown layer: ${id}`);
    return layer;
  }
}
