import type { ProviderAdapter, ProviderContext } from "../../domain/provider.ts";
import type { ProviderError, ProviderSnapshot } from "../../domain/world.ts";
import { parseOpenSkyEnvelope, OPENSKY_API_SOURCE } from "./parser.ts";

export interface OpenSkyConfig { brokerConfigured?: boolean }
export const OPENSKY_BROKER_ENDPOINT = "/api/providers/opensky/states";

export class OpenSkyAdapter implements ProviderAdapter<OpenSkyConfig> {
  readonly id = "opensky" as const;
  readonly displayName = "OpenSky aircraft";
  readonly refreshIntervalMs = 90_000;
  readonly staleAfterMs = 5 * 60_000;
  readonly provenance = { dataset: "Aircraft state vectors", sourceUrl: OPENSKY_API_SOURCE, attribution: "OpenSky Network", termsUrl: "https://opensky-network.org/about/terms-of-use" };
  isConfigured(config: OpenSkyConfig = {}): boolean { return config.brokerConfigured !== false; }
  async fetch(context: ProviderContext, config: OpenSkyConfig = {}): Promise<ProviderSnapshot> {
    const fetchedAt = context.now.toISOString();
    if (!this.isConfigured(config)) return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: "configuration-required", recordCount: 0, fetchedAt, error: { code: "configuration", message: "OpenSky broker is not configured" } } };
    try {
      const response = await fetch(context.endpoint || OPENSKY_BROKER_ENDPOINT, { signal: context.signal });
      let body: unknown;
      try { body = await response.json(); } catch { body = undefined; }
      if (!response.ok) {
        const envelope = body as { error?: { message?: string }; retryAfterSeconds?: number } | undefined;
        const error: ProviderError = response.status === 429
          ? { code: "rate-limit", message: envelope?.error?.message ?? "OpenSky está temporariamente limitado", httpStatus: 429, ...(typeof envelope?.retryAfterSeconds === "number" ? { retryAfterSeconds: envelope.retryAfterSeconds } : {}) }
          : { code: "http", message: envelope?.error?.message ?? `OpenSky returned HTTP ${response.status}`, httpStatus: response.status };
        return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: response.status === 429 ? "rate-limited" : "error", recordCount: 0, fetchedAt, error } };
      }
      const envelope = body as { state?: string; data?: unknown };
      const parsed = parseOpenSkyEnvelope(envelope.data ?? envelope, fetchedAt, context.now);
      if (parsed.error) return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: "error", recordCount: 0, fetchedAt, error: parsed.error } };
      const state = envelope.state === 'stale' ? "stale" : parsed.rejected ? "partial" : "ready";
      return { providerId: this.id, records: parsed.records, fetchedAt, ...(parsed.sourceUpdatedAt ? { sourceUpdatedAt: parsed.sourceUpdatedAt } : {}), status: { providerId: this.id, state, recordCount: parsed.records.length, fetchedAt, ...(parsed.sourceUpdatedAt ? { sourceUpdatedAt: parsed.sourceUpdatedAt } : {}), ...(parsed.rejected ? { error: { code: "validation" as const, message: `${parsed.rejected} aircraft records rejected` } } : {}) } };
    } catch (cause) { if (context.signal.aborted) throw cause; return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: "error", recordCount: 0, fetchedAt, error: { code: "network", message: cause instanceof Error ? cause.message : "OpenSky request failed" } } }; }
  }
}
export const openSkyAdapter = new OpenSkyAdapter();
