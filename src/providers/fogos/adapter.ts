import type { ProviderAdapter, ProviderContext } from "../../domain/provider.ts";
import type { ProviderError, ProviderSnapshot } from "../../domain/world.ts";
import { parseFogos, FOGOS_SOURCE } from "./parser.ts";

export interface FogosConfig { apiKeyConfigured?: boolean }
export const FOGOS_BROKER_ENDPOINT = "/api/providers/fogos/incidents";
export class FogosAdapter implements ProviderAdapter<FogosConfig> {
  readonly id = "fogos" as const; readonly displayName = "Fogos.pt wildfire incidents";
  readonly refreshIntervalMs = 5 * 60 * 1000; readonly staleAfterMs = 60 * 60 * 1000;
  readonly provenance = { dataset: "Operational wildfire incidents", sourceUrl: FOGOS_SOURCE, attribution: "Fogos.pt", termsUrl: "https://www.fogos.pt/pt/api-termos" };
  isConfigured(config: FogosConfig = {}) { return config.apiKeyConfigured !== false; }
  async fetch(context: ProviderContext, config: FogosConfig = {}): Promise<ProviderSnapshot> {
    const fetchedAt = context.now.toISOString();
    if (!this.isConfigured(config)) return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: "configuration-required", recordCount: 0, fetchedAt, error: { code: "configuration", message: "Fogos.pt API access is not configured" } } };
    try {
      const response = await fetch(context.endpoint || FOGOS_BROKER_ENDPOINT, { signal: context.signal });
      const envelope = await response.json() as { state?: string; data?: unknown; error?: { code?: string; message?: string }; retryAfterSeconds?: number };
      if (!response.ok) {
        const retry = Number(envelope.retryAfterSeconds ?? response.headers.get("Retry-After"));
        const rateLimited = envelope.state === "rate-limited" || response.status === 429;
        const configured = envelope.state === "configuration-required";
        const error: ProviderError = rateLimited
          ? { code: "rate-limit", message: envelope.error?.message ?? "Fogos.pt está temporariamente limitado", httpStatus: 429, ...(Number.isFinite(retry) ? { retryAfterSeconds: retry } : {}) }
          : configured
            ? { code: "configuration", message: envelope.error?.message ?? "O fornecedor Fogos.pt não está configurado", httpStatus: response.status }
            : { code: "http", message: envelope.error?.message ?? `Fogos.pt returned HTTP ${response.status}`, httpStatus: response.status };
        return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: rateLimited ? "rate-limited" : configured ? "configuration-required" : "error", recordCount: 0, fetchedAt, error } };
      }
      const parsed = parseFogos(envelope.data ?? envelope, fetchedAt, context.now);
      if (parsed.error) return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: "error", recordCount: 0, fetchedAt, error: parsed.error } };
      const sourceUpdatedAt = parsed.records.map((record) => record.sourceUpdatedAt).filter((value): value is string => Boolean(value)).sort().at(-1);
      const stale = envelope.state === 'stale';
      return { providerId: this.id, records: parsed.records, fetchedAt, ...(sourceUpdatedAt ? { sourceUpdatedAt } : {}), status: { providerId: this.id, state: stale ? "stale" : parsed.rejected ? "partial" : "ready", recordCount: parsed.records.length, fetchedAt, ...(sourceUpdatedAt ? { sourceUpdatedAt } : {}), ...(stale ? { error: { code: "network" as const, message: "A mostrar o último retrato disponível; a origem está temporariamente indisponível" } } : {}), ...(parsed.rejected ? { error: { code: "validation" as const, message: `${parsed.rejected} incident records rejected` } } : {}) } };
    } catch (cause) { if (context.signal.aborted) throw cause; return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: "error", recordCount: 0, fetchedAt, error: { code: "network", message: cause instanceof Error ? cause.message : "Fogos.pt request failed" } } }; }
  }
}
export const fogosAdapter = new FogosAdapter();
