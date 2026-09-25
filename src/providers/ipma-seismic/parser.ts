import { compositeId } from "../../domain/ids.ts";
import { freshnessForObservedAt } from "../../domain/freshness.ts";
import type { ProviderError, WorldRecord } from "../../domain/world.ts";

export interface IpmaSeismicEvent {
  sismoId?: unknown;
  time?: unknown;
  lat?: unknown;
  lon?: unknown;
  magnitud?: unknown;
  depth?: unknown;
  magType?: unknown;
  obsRegion?: unknown;
  dataUpdate?: unknown;
  [key: string]: unknown;
}

export interface IpmaSeismicEnvelope {
  idArea?: unknown;
  country?: unknown;
  lastSismicActivityDate?: unknown;
  updateDate?: unknown;
  owner?: unknown;
  data?: unknown;
}

export interface ParsedIpmaSeismic {
  records: WorldRecord[];
  rejected: number;
  error?: ProviderError;
  sourceUpdatedAt?: string;
}

const SOURCE_BASE = "https://api.ipma.pt/open-data/observation/seismic";

function stringValue(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

function finiteNumber(value: unknown): number | undefined {
  const number = typeof value === "number" ? value : typeof value === "string" && value.trim() ? Number(value) : NaN;
  return Number.isFinite(number) ? number : undefined;
}

function isoTimestamp(value: unknown): string | undefined {
  const source = stringValue(value);
  if (!source) return undefined;
  const timestamp = Date.parse(source);
  return Number.isNaN(timestamp) ? undefined : new Date(timestamp).toISOString();
}

function provenance(area: number) {
  return {
    providerName: "IPMA",
    dataset: `Seismic activity (area ${area})`,
    sourceUrl: `${SOURCE_BASE}/${area}.json`,
    attribution: "IPMA seismic activity",
    termsUrl: "https://api.ipma.pt/",
    transport: "direct" as const,
  };
}

export function parseIpmaSeismicEnvelope(
  payload: unknown,
  area: number,
  fetchedAt: string,
  now = new Date(fetchedAt),
): ParsedIpmaSeismic {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { records: [], rejected: 0, error: { code: "parse", message: "IPMA seismic response is not an object" } };
  }
  const envelope = payload as IpmaSeismicEnvelope;
  if (!Array.isArray(envelope.data)) {
    return { records: [], rejected: 0, error: { code: "parse", message: "IPMA seismic response has no data array" } };
  }

  const sourceUpdatedAt = isoTimestamp(envelope.updateDate) ?? isoTimestamp(envelope.lastSismicActivityDate);
  const records: WorldRecord[] = [];
  let rejected = 0;
  for (const item of envelope.data) {
    if (!item || typeof item !== "object" || Array.isArray(item)) { rejected++; continue; }
    const event = item as IpmaSeismicEvent;
    const observedAt = isoTimestamp(event.time);
    const latitude = finiteNumber(event.lat);
    const longitude = finiteNumber(event.lon);
    const magnitude = finiteNumber(event.magnitud);
    const depth = finiteNumber(event.depth);
    if (!observedAt || latitude === undefined || longitude === undefined || magnitude === undefined ||
      latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || magnitude < -90 || magnitude === -99) {
      rejected++;
      continue;
    }
    const sourceId = stringValue(event.sismoId);
    const stableId = sourceId ? sourceId : compositeId("ipma", area, observedAt, latitude, longitude, magnitude, depth);
    records.push({
      id: sourceId ? `ipma:${sourceId}` : stableId,
      providerId: "ipma",
      kind: "seismic-event",
      geometry: { type: "Point", coordinates: [longitude, latitude, depth ?? 0] },
      observedAt,
      fetchedAt,
      sourceUpdatedAt,
      temporalClass: "current",
      freshness: freshnessForObservedAt("ipma", observedAt, now),
      quality: "observed",
      properties: {
        area,
        country: stringValue(envelope.country),
        magnitude,
        depthKm: depth,
        magnitudeType: stringValue(event.magType),
        region: stringValue(event.obsRegion),
      },
      provenance: provenance(area),
    });
  }
  return { records, rejected, sourceUpdatedAt };
}

export { SOURCE_BASE };
