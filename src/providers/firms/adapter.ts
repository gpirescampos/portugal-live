import type { ProviderAdapter, ProviderContext } from '../../domain/provider.ts';
import type { ProviderError, ProviderSnapshot } from '../../domain/world.ts';
import { parseFirmsCsv } from './parser.ts';

export interface FirmsConfig { brokerConfigured?: boolean; }
export const FIRMS_BROKER_ENDPOINT = '/api/providers/firms/detections';

export class FirmsAdapter implements ProviderAdapter<FirmsConfig> {
  readonly id = 'firms' as const;
  readonly displayName = 'NASA FIRMS thermal detections';
  readonly refreshIntervalMs = 30 * 60_000;
  readonly staleAfterMs = 3 * 60 * 60_000;
  readonly provenance = { dataset: 'VIIRS thermal anomaly detections', sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/map/', attribution: 'NASA FIRMS', termsUrl: 'https://www.earthdata.nasa.gov/data/tools/firms', };
  isConfigured(config: FirmsConfig = {}): boolean { return config.brokerConfigured !== false; }

  async fetch(context: ProviderContext, config: FirmsConfig = {}): Promise<ProviderSnapshot> {
    const fetchedAt = context.now.toISOString();
    if (!this.isConfigured(config)) return this.failure(fetchedAt, 'configuration-required', { code: 'configuration', message: 'O broker NASA FIRMS não está configurado.' });
    try {
      const response = await fetch(context.endpoint || FIRMS_BROKER_ENDPOINT, { signal: context.signal });
      let body: unknown;
      try { body = await response.json(); } catch { body = undefined; }
      const envelope = body as { state?: string; data?: { source?: string; regions?: Array<{ id: string; csv: string; fetchedAt?: string; stale?: boolean }> }; error?: { code?: string; message?: string } } | undefined;
      if (!response.ok) {
        const rateLimited = response.status === 429;
        const configured = envelope?.state === 'configuration-required';
        return this.failure(fetchedAt, rateLimited ? 'rate-limited' : configured ? 'configuration-required' : 'error', {
          code: rateLimited ? 'rate-limit' : configured ? 'configuration' : 'http',
          message: envelope?.error?.message ?? `O NASA FIRMS devolveu HTTP ${response.status}.`, httpStatus: response.status,
        });
      }
      if (!Array.isArray(envelope?.data?.regions) || !envelope.data.regions.length) {
        return this.failure(fetchedAt, 'error', { code: 'parse', message: 'A resposta do broker NASA FIRMS não contém áreas.' });
      }
      const records = new Map<string, ReturnType<typeof parseFirmsCsv>['records'][number]>();
      let rejected = 0; let parseFailed = 0;
      for (const region of envelope.data.regions) {
        const parsed = parseFirmsCsv({ regionId: region.id, csv: region.csv, fetchedAt: region.fetchedAt ?? fetchedAt, stale: region.stale }, context.now);
        if (parsed.error) { parseFailed += 1; continue; }
        rejected += parsed.rejected;
        for (const record of parsed.records) records.set(record.id, record);
      }
      if (records.size === 0 && parseFailed === envelope.data.regions.length) {
        return this.failure(fetchedAt, 'error', { code: 'parse', message: 'Não foi possível interpretar os CSV do NASA FIRMS.' });
      }
      const state = envelope.state === 'stale' ? 'stale' : envelope.state === 'partial' || parseFailed > 0 || rejected > 0 ? 'partial' : 'ready';
      const statusError: ProviderError | undefined = state === 'stale'
        ? { code: 'network', message: 'A mostrar deteções em cache; algumas áreas não foram atualizadas.' }
        : state === 'partial'
          ? { code: 'validation', message: 'Algumas áreas ou linhas do NASA FIRMS não foram processadas.' }
          : undefined;
      return { providerId: this.id, records: [...records.values()], fetchedAt, status: { providerId: this.id, state, recordCount: records.size, fetchedAt, ...(statusError ? { error: statusError } : {}) } };
    } catch (cause) {
      if (context.signal.aborted) throw cause;
      return this.failure(fetchedAt, 'error', { code: 'network', message: cause instanceof Error ? cause.message : 'Falha ao consultar o broker NASA FIRMS.' });
    }
  }

  private failure(fetchedAt: string, state: 'configuration-required' | 'rate-limited' | 'error', error: ProviderError): ProviderSnapshot {
    return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state, recordCount: 0, fetchedAt, error } };
  }
}

export const firmsAdapter = new FirmsAdapter();
