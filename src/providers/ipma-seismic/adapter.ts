import type { ProviderAdapter, ProviderContext } from "../../domain/provider.ts";
import type { ProviderError, ProviderSnapshot } from "../../domain/world.ts";
import { parseIpmaSeismicEnvelope } from "./parser.ts";

export interface IpmaSeismicConfig {
  areas?: number[];
}

const DEFAULT_AREAS = [3, 7];

export class IpmaSeismicAdapter implements ProviderAdapter<IpmaSeismicConfig> {
  readonly id = "ipma" as const;
  readonly displayName = "IPMA seismic activity";
  readonly refreshIntervalMs = 60 * 60 * 1000;
  readonly staleAfterMs = 2 * 24 * 60 * 60 * 1000;
  readonly provenance = {
    dataset: "IPMA seismic activity",
    sourceUrl: "https://api.ipma.pt/open-data/observation/seismic/7.json",
    attribution: "IPMA seismic activity",
    termsUrl: "https://api.ipma.pt/",
  };

  isConfigured(_config: IpmaSeismicConfig = {}): boolean { return true; }

  async fetch(context: ProviderContext, config: IpmaSeismicConfig = {}): Promise<ProviderSnapshot> {
    const fetchedAt = context.now.toISOString();
    const areas = config.areas?.length ? config.areas : DEFAULT_AREAS;
    const records = [] as import("../../domain/world.ts").WorldRecord[];
    let rejected = 0;
    let sourceUpdatedAt: string | undefined;
    let failed = 0;
    let firstError: ProviderError | undefined;
    for (const area of areas) {
      const endpoint = context.endpoint.includes("{area}")
        ? context.endpoint.replace("{area}", String(area))
        : context.endpoint.endsWith(".json") && areas.length === 1
          ? context.endpoint
          : `${context.endpoint.replace(/\/$/, "")}/${area}.json`;
      try {
        const response = await fetch(endpoint, { signal: context.signal });
        if (!response.ok) { failed++; firstError ??= { code: "http", message: `IPMA returned HTTP ${response.status}`, httpStatus: response.status }; continue; }
        const parsed = parseIpmaSeismicEnvelope(await response.json(), area, fetchedAt, context.now);
        if (parsed.error) { failed++; firstError ??= parsed.error; continue; }
        records.push(...parsed.records);
        rejected += parsed.rejected;
        sourceUpdatedAt = parsed.sourceUpdatedAt ?? sourceUpdatedAt;
      } catch (error) {
        if (context.signal.aborted) throw error;
        failed++;
        firstError ??= { code: "network", message: error instanceof Error ? error.message : "IPMA request failed" };
      }
    }
    const state = failed === areas.length ? "error" : failed || rejected ? "partial" : "ready";
    return {
      providerId: this.id,
      records,
      fetchedAt,
      sourceUpdatedAt,
      status: { providerId: this.id, state, recordCount: records.length, fetchedAt, sourceUpdatedAt,
        ...(firstError ? { error: firstError } : {}), },
    };
  }
}

export const ipmaSeismicAdapter = new IpmaSeismicAdapter();
