import { namespacedId } from "../../domain/ids.ts";
import { freshnessForObservedAt } from "../../domain/freshness.ts";
import type { ProviderError, WorldRecord } from "../../domain/world.ts";

export interface FogosIncident {
  id?: unknown; lat?: unknown; lng?: unknown; lon?: unknown; latitude?: unknown; longitude?: unknown;
  coords?: unknown; district?: unknown; concelho?: unknown; freguesia?: unknown; natureza?: unknown;
  status?: unknown; statusCode?: unknown; active?: unknown; dateTime?: unknown; updated?: unknown;
  man?: unknown; terrain?: unknown; aerial?: unknown; meios_aquaticos?: unknown;
  [key: string]: unknown;
}

export interface ParsedFogos { records: WorldRecord[]; rejected: number; error?: ProviderError; sourceUpdatedAt?: string }
export const FOGOS_SOURCE = "https://api.fogos.pt/v2/incidents/active?geojson=1";

const text = (value: unknown) => typeof value === "string" && value.trim() ? value.trim() : undefined;
const number = (value: unknown) => { const n = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN; return Number.isFinite(n) ? n : undefined; };
function timestamp(value: unknown): string | undefined {
  if (value && typeof value === "object" && !Array.isArray(value) && "sec" in value) {
    const seconds = number((value as { sec?: unknown }).sec); if (seconds !== undefined) return new Date(seconds * 1000).toISOString();
  }
  const valueText = text(value); if (!valueText) return undefined; const parsed = Date.parse(valueText); return Number.isNaN(parsed) ? undefined : new Date(parsed).toISOString();
}
function itemsFrom(payload: unknown): unknown[] | undefined {
  if (Array.isArray(payload)) return payload;
  if (!payload || typeof payload !== "object") return undefined;
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.data)) return root.data;
  if (root.type === "FeatureCollection" && Array.isArray(root.features)) return root.features;
  return undefined;
}

export function parseFogos(payload: unknown, fetchedAt: string, now = new Date(fetchedAt)): ParsedFogos {
  const items = itemsFrom(payload);
  if (!items) return { records: [], rejected: 0, error: { code: "parse", message: "Fogos.pt response has no incident array" } };
  const records: WorldRecord[] = []; let rejected = 0;
  for (const raw of items) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) { rejected++; continue; }
    const feature = raw as Record<string, unknown>;
    const incident = (feature.properties && typeof feature.properties === "object" ? feature.properties : feature) as FogosIncident;
    const geometry = feature.geometry as { coordinates?: unknown } | undefined;
    const coords = Array.isArray(geometry?.coordinates) ? geometry.coordinates : undefined;
    const longitude = number(incident.lng ?? incident.lon ?? incident.longitude ?? coords?.[0]);
    const latitude = number(incident.lat ?? incident.latitude ?? coords?.[1]);
    const id = text(incident.id);
    if (!id || latitude === undefined || longitude === undefined || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) { rejected++; continue; }
    const observedAt = timestamp(incident.updated) ?? timestamp(incident.dateTime);
    const sourceUpdatedAt = timestamp(incident.updated);
    const stableId = namespacedId("fogos", id);
    records.push({
      id: stableId, providerId: "fogos", kind: "wildfire-incident", geometry: { type: "Point", coordinates: [longitude, latitude] },
      observedAt: observedAt ?? null, fetchedAt, sourceUpdatedAt, temporalClass: "live", freshness: freshnessForObservedAt("fogos", observedAt ?? null, now), quality: "reported",
      properties: {
        incidentId: id, status: text(incident.status), statusCode: text(incident.statusCode), active: incident.active === true, startedAt: timestamp(incident.dateTime),
        district: text(incident.district), municipality: text(incident.concelho), parish: text(incident.freguesia), nature: text(incident.natureza),
        resources: { personnel: number(incident.man), terrestrial: number(incident.terrain), aerial: number(incident.aerial), aquatic: number(incident.meios_aquaticos) },
        coordinatesApproximate: true,
      },
      provenance: { providerName: "Fogos.pt", dataset: "Operational wildfire incidents", sourceUrl: FOGOS_SOURCE, attribution: "Fogos.pt", termsUrl: "https://www.fogos.pt/pt/api-termos", transport: "brokered" },
    });
  }
  return { records, rejected };
}
