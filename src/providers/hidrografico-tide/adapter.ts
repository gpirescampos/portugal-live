import type { ProviderAdapter, ProviderContext } from '../../domain/provider.ts';
import type { ProviderError, ProviderSnapshot } from '../../domain/world.ts';
import { MAX_STATIONS, parseTideLocations, TIDE_SOURCE, TIDE_TERMS } from './parser.ts';

export const TIDE_LOCATIONS_URL = `${TIDE_SOURCE}/instances/l1/locations?f=json&limit=${MAX_STATIONS}`;

export class HidrograficoTideAdapter implements ProviderAdapter<undefined> {
  readonly id = 'hidrografico-tide' as const;
  readonly displayName = 'Marégrafos IH';
  readonly refreshIntervalMs = 60_000;
  readonly staleAfterMs = 10 * 60_000;
  readonly provenance = { dataset: 'Tide gauges · near-real-time L1 observations', sourceUrl: TIDE_SOURCE, attribution: 'Instituto Hidrográfico', termsUrl: TIDE_TERMS };
  isConfigured() { return true; }

  async fetch(context: ProviderContext): Promise<ProviderSnapshot> {
    const fetchedAt = context.now.toISOString();
    let error: ProviderError | undefined;
    try {
      const url = context.endpoint || TIDE_LOCATIONS_URL;
      const parsedUrl = new URL(url);
      if (parsedUrl.origin !== new URL(TIDE_SOURCE).origin || parsedUrl.pathname !== new URL(TIDE_LOCATIONS_URL).pathname) throw new Error('IH endpoint is not the fixed locations route');
      const response = await fetch(parsedUrl, { signal: AbortSignal.any([context.signal, AbortSignal.timeout(12_000)]), headers: { Accept: 'application/geo+json, application/json' } });
      if (!response.ok) error = { code: 'http', message: `IH returned HTTP ${response.status}`, httpStatus: response.status };
      else {
        const result = parseTideLocations(await response.json(), fetchedAt, context.now);
        if (result.error) error = result.error;
        else {
          const hasUnavailable = result.records.some((record) => record.freshness === 'unavailable');
          const hasCurrent = result.records.some((record) => record.freshness !== 'unavailable' && record.freshness !== 'stale');
          const hasStale = result.records.some((record) => record.freshness === 'stale');
          const state = result.records.length === 0 ? 'unavailable' : result.rejected || hasUnavailable || (hasStale && hasCurrent) ? 'partial' : hasStale ? 'stale' : 'ready';
          return { providerId: this.id, records: result.records, fetchedAt, status: { providerId: this.id, state, recordCount: result.records.length, fetchedAt, ...(result.rejected ? { error: { code: 'validation', message: `${result.rejected} station records rejected` } } : {}) } };
        }
      }
    } catch (cause) {
      if (context.signal.aborted) throw cause;
      error = { code: cause instanceof TypeError || (cause instanceof Error && cause.name === 'TimeoutError') ? 'network' : 'parse', message: cause instanceof Error ? cause.message : 'IH tide request failed' };
    }
    return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: 'error', recordCount: 0, fetchedAt, error } };
  }
}

export const hidrograficoTideAdapter = new HidrograficoTideAdapter();
