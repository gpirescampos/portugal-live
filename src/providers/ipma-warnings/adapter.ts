import type { ProviderAdapter, ProviderContext } from "../../domain/provider.ts";
import type { ProviderError, ProviderSnapshot } from "../../domain/world.ts";
import { parseIpmaWarnings, WARNINGS_SOURCE, type WarningArea } from "./parser.ts";

export interface IpmaWarningsConfig { areas?: WarningArea[] }
export const WARNING_AREAS_SOURCE = "https://api.ipma.pt/open-data/distrits-islands.json";
export class IpmaWarningsAdapter implements ProviderAdapter<IpmaWarningsConfig> {
  readonly id = "ipma-warnings" as const; readonly displayName = "IPMA weather warnings";
  readonly refreshIntervalMs = 10 * 60 * 1000; readonly staleAfterMs = 30 * 60 * 1000;
  readonly provenance = { dataset: "IPMA weather warnings", sourceUrl: WARNINGS_SOURCE, attribution: "IPMA weather warnings", termsUrl: "https://api.ipma.pt/" };
  isConfigured(_config: IpmaWarningsConfig = {}) { return true; }
  async fetch(context: ProviderContext, config: IpmaWarningsConfig = {}): Promise<ProviderSnapshot> {
    const fetchedAt = context.now.toISOString(); let error: ProviderError | undefined;
    try {
      const response = await fetch(context.endpoint || WARNINGS_SOURCE, { signal: context.signal });
      if (!response.ok) { error = { code: "http", message: `IPMA returned HTTP ${response.status}`, httpStatus: response.status }; }
      else {
        let configuredAreas = config.areas ?? [];
        if (configuredAreas.length === 0) {
          const areaResponse = await fetch(WARNING_AREAS_SOURCE, { signal: context.signal });
          if (!areaResponse.ok) {
            return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: "error", recordCount: 0, fetchedAt, error: { code: "http", message: `IPMA area lookup returned HTTP ${areaResponse.status}`, httpStatus: areaResponse.status } } };
          }
          const payload = await areaResponse.json() as { data?: Array<Record<string, unknown>> };
          configuredAreas = (payload.data ?? []).flatMap((item) => {
            const idAreaAviso = typeof item.idAreaAviso === "string" ? item.idAreaAviso : undefined;
            const latitude = Number(item.latitude); const longitude = Number(item.longitude);
            if (!idAreaAviso || !Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
            return [{ idAreaAviso, latitude, longitude, label: typeof item.local === "string" ? item.local : undefined }];
          });
        }
        const areas = new Map(configuredAreas.map((area) => [area.idAreaAviso, area]));
        const parsed = parseIpmaWarnings(await response.json(), fetchedAt, context.now, areas);
        if (parsed.error) error = parsed.error;
        else return { providerId: this.id, records: parsed.records, fetchedAt, status: { providerId: this.id, state: parsed.rejected ? "partial" : "ready", recordCount: parsed.records.length, fetchedAt, ...(parsed.rejected ? { error: { code: "validation" as const, message: `${parsed.rejected} warning records rejected` } } : {}) } };
      }
    } catch (cause) { if (context.signal.aborted) throw cause; error = { code: "network", message: cause instanceof Error ? cause.message : "IPMA request failed" }; }
    return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: "error", recordCount: 0, fetchedAt, error } };
  }
}
export const ipmaWarningsAdapter = new IpmaWarningsAdapter();
