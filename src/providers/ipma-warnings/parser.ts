import { freshnessForAge } from "../../domain/freshness.ts";
import { warningValidityFor, type WarningSeverity } from "../../domain/warnings.ts";
import type { ProviderError, WorldRecord } from "../../domain/world.ts";

export interface IpmaWarning {
  text?: unknown;
  awarenessTypeName?: unknown;
  idAreaAviso?: unknown;
  startTime?: unknown;
  endTime?: unknown;
  awarenessLevelID?: unknown;
  [key: string]: unknown;
}

export interface WarningArea { idAreaAviso: string; latitude: number; longitude: number; label?: string }
export interface ParsedIpmaWarnings { records: WorldRecord[]; rejected: number; error?: ProviderError }

export const WARNINGS_SOURCE = "https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json";

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const timestamp = (value: unknown) => { const v = text(value); if (!v) return undefined; const n = Date.parse(v); return Number.isNaN(n) ? undefined : new Date(n).toISOString(); };

export function parseIpmaWarnings(payload: unknown, fetchedAt: string, now = new Date(fetchedAt), areas: ReadonlyMap<string, WarningArea> = new Map()): ParsedIpmaWarnings {
  if (!Array.isArray(payload)) return { records: [], rejected: 0, error: { code: "parse", message: "IPMA warnings response is not an array" } };
  const records: WorldRecord[] = [];
  let rejected = 0;
  for (const item of payload) {
    if (!item || typeof item !== "object" || Array.isArray(item)) { rejected++; continue; }
    const warning = item as IpmaWarning;
    const area = text(warning.idAreaAviso);
    const start = timestamp(warning.startTime);
    const end = timestamp(warning.endTime);
    const level = text(warning.awarenessLevelID)?.toLowerCase();
    const type = text(warning.awarenessTypeName);
    if (!area || !start || !end || !type || !level) { rejected++; continue; }
    // IPMA publishes green/no-warning rows as part of the same feed. They are
    // valid source data but are intentionally not rendered as alert records.
    if (level === "green") continue;
    if (!["yellow", "orange", "red"].includes(level)) { rejected++; continue; }
    const validity = warningValidityFor(start, end, now);
    if (validity === "expired") continue;
    const point = areas.get(area);
    if (!point) { rejected++; continue; }
    const stableId = `${area}:${type}:${start}:${end}`.toLowerCase().replace(/[^a-z0-9:.-]+/g, "-");
    records.push({
      id: `ipma-warnings:${stableId}`, providerId: "ipma-warnings", kind: "weather-warning",
      geometry: { type: "Point", coordinates: [point.longitude, point.latitude] },
      observedAt: fetchedAt, fetchedAt, validFrom: start, validUntil: end,
      temporalClass: validity === "active" ? "current" : "forecast",
      freshness: freshnessForAge("ipma-warnings", Math.max(0, now.getTime() - Date.parse(fetchedAt))), quality: "forecast",
      properties: { areaCode: area, areaName: point.label, warningType: type, severity: level as WarningSeverity, validity, description: text(warning.text) },
      provenance: { providerName: "IPMA", dataset: "Weather warnings", sourceUrl: WARNINGS_SOURCE, attribution: "IPMA weather warnings", termsUrl: "https://api.ipma.pt/", transport: "direct" },
    });
  }
  return { records, rejected };
}
