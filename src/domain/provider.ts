import type { ProviderId, ProviderSnapshot, ProviderStatus, WorldRecord } from "./world";

export interface ProviderContext {
  signal: AbortSignal;
  now: Date;
  /** Same-origin broker or direct provider URL selected by configuration. */
  endpoint: string;
}

export interface ProviderAdapter<TConfig = unknown> {
  readonly id: ProviderId;
  readonly displayName: string;
  readonly refreshIntervalMs: number;
  readonly staleAfterMs: number;
  readonly provenance: {
    dataset: string;
    sourceUrl: string;
    attribution: string;
    termsUrl?: string;
  };
  isConfigured(config: TConfig): boolean;
  fetch(context: ProviderContext, config: TConfig): Promise<ProviderSnapshot>;
}

export interface ProviderStore {
  get(providerId: ProviderId): ProviderSnapshot | undefined;
  set(snapshot: ProviderSnapshot): void;
  status(providerId: ProviderId): ProviderStatus | undefined;
  records(): WorldRecord[];
}

/** Small in-memory store used by the first runtime; persistence is deliberately deferred. */
export class MemoryProviderStore implements ProviderStore {
  private readonly snapshots = new Map<ProviderId, ProviderSnapshot>();

  get(providerId: ProviderId): ProviderSnapshot | undefined {
    return this.snapshots.get(providerId);
  }

  set(snapshot: ProviderSnapshot): void {
    const previous = this.snapshots.get(snapshot.providerId);
    if (previous && Date.parse(snapshot.fetchedAt) < Date.parse(previous.fetchedAt)) return;
    this.snapshots.set(snapshot.providerId, snapshot);
  }

  status(providerId: ProviderId): ProviderStatus | undefined {
    return this.snapshots.get(providerId)?.status;
  }

  records(): WorldRecord[] {
    return [...this.snapshots.values()].flatMap((snapshot) => snapshot.records);
  }
}
