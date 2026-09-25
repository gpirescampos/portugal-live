import type { ProviderAdapter, ProviderContext } from '../../domain/provider.ts';
import type { ProviderError, ProviderSnapshot } from '../../domain/world.ts';
import { QUALAR_PATH } from '../../../broker/contract.ts';
import { normalizeEeaPayload, parseQualAr } from './parser.ts';

export interface QualArConfig { brokerConfigured?: boolean; }
interface QualArBrokerEnvelope {
  provider?: string; state?: string; fetchedAt?: string;
  data?: { stations?: unknown; readings?: unknown; source?: string };
  error?: { code?: string; message?: string; retryAfterSeconds?: number };
}

export class QualArAdapter implements ProviderAdapter<QualArConfig> {
  readonly id = 'qualar' as const;
  readonly displayName = 'Qualidade do ar · EEA (Portugal)';
  readonly refreshIntervalMs = 15 * 60_000;
  readonly staleAfterMs = 24 * 60 * 60_000;
  readonly provenance = { dataset: 'Up-to-date air quality measurements (E2a)', sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/778ef9f5-6293-4846-badd-56a29c70880d', attribution: 'European Environment Agency (EEA), dados comunicados por Portugal', termsUrl: 'https://creativecommons.org/licenses/by/4.0/' };
  isConfigured(config: QualArConfig = {}): boolean { return config.brokerConfigured !== false; }

  async fetch(context: ProviderContext, config: QualArConfig = {}): Promise<ProviderSnapshot> {
    const fetchedAt = context.now.toISOString();
    if (!this.isConfigured(config)) return this.failure(fetchedAt, 'configuration-required', { code: 'configuration', message: 'O broker QualAr não está configurado.' });
    try {
      const response = await fetch(context.endpoint || QUALAR_PATH, { signal: context.signal });
      let envelope: QualArBrokerEnvelope | undefined;
      try { envelope = await response.json() as QualArBrokerEnvelope; } catch { /* handled as malformed response below */ }
      if (!response.ok) {
        const rateLimited = response.status === 429;
        return this.failure(fetchedAt, rateLimited ? 'rate-limited' : 'error', { code: rateLimited ? 'rate-limit' : 'http', message: envelope?.error?.message ?? `O broker QualAr devolveu HTTP ${response.status}.`, httpStatus: response.status });
      }
      if (envelope?.provider !== 'qualar' || !envelope.data || !Array.isArray(envelope.data.stations) || !Array.isArray(envelope.data.readings)) return this.failure(fetchedAt, 'error', { code: 'parse', message: 'A resposta do broker EEA não contém o inventário e as medições esperados.' });
      const normalized = normalizeEeaPayload(envelope.data.stations, envelope.data.readings);
      const parsed = parseQualAr(normalized.stations, normalized.readings, envelope.fetchedAt ?? fetchedAt, context.now, 'brokered');
      if (!parsed.records.length) return this.failure(fetchedAt, 'error', { code: 'parse', message: 'Não foram encontradas medições E2a associáveis a estações portuguesas.' });
      const stale = envelope.state === 'stale';
      const state = stale ? 'stale' : envelope.state === 'partial' || parsed.rejected > 0 ? 'partial' : 'ready';
      const error: ProviderError | undefined = stale
        ? { code: 'network', message: 'A mostrar o último conjunto E2a em cache; a atualização da fonte falhou.' }
        : parsed.rejected ? { code: 'validation', message: `${parsed.rejected} registos EEA foram rejeitados por validação ou junção.` } : undefined;
      return { providerId: this.id, records: parsed.records, fetchedAt: envelope.fetchedAt ?? fetchedAt, status: { providerId: this.id, state, recordCount: parsed.records.length, fetchedAt: envelope.fetchedAt ?? fetchedAt, ...(error ? { error } : {}) } };
    } catch (cause) {
      if (context.signal.aborted) throw cause;
      return this.failure(fetchedAt, 'error', { code: 'network', message: cause instanceof Error ? cause.message : 'Falha ao consultar o broker EEA.' });
    }
  }

  private failure(fetchedAt: string, state: 'configuration-required' | 'rate-limited' | 'error', error: ProviderError): ProviderSnapshot {
    return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state, recordCount: 0, fetchedAt, error } };
  }
}

export const qualArAdapter = new QualArAdapter();
