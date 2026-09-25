import { freshnessForObservedAt } from '../../domain/freshness.ts';
import type { ProviderError, WorldRecord } from '../../domain/world.ts';

export const TIDE_SOURCE = 'https://ogcapi.hidrografico.pt/collections/tide_obs_nrt';
export const TIDE_TERMS = 'https://faq.hidrografico.pt/books/hidrografico/page/ogc-api-edr-rede-de-estacoes-maregraficas-ativas-observacoes';
export const MAX_STATIONS = 100;

export interface ParsedTides { records: WorldRecord[]; rejected: number; error?: ProviderError; }
type Feature = { type?: unknown; id?: unknown; geometry?: unknown; properties?: unknown };
const text = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;

/** Parse the IH EDR `instances/l1/locations` GeoJSON response. */
export function parseTideLocations(payload: unknown, fetchedAt: string, now = new Date(fetchedAt)): ParsedTides {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return { records: [], rejected: 0, error: { code: 'parse', message: 'IH tide locations response is not an object' } };
  const collection = payload as { type?: unknown; features?: unknown; numberReturned?: unknown };
  if (collection.type !== 'FeatureCollection' || !Array.isArray(collection.features)) return { records: [], rejected: 0, error: { code: 'parse', message: 'IH tide locations response is not a GeoJSON FeatureCollection' } };
  if (collection.features.length > MAX_STATIONS || (typeof collection.numberReturned === 'number' && collection.numberReturned > MAX_STATIONS)) return { records: [], rejected: 0, error: { code: 'validation', message: `IH tide response exceeds the ${MAX_STATIONS}-station request cap` } };

  const newest = new Map<string, WorldRecord>();
  let rejected = 0;
  for (const candidate of collection.features as Feature[]) {
    if (!candidate || typeof candidate !== 'object' || candidate.type !== 'Feature' || !candidate.properties || typeof candidate.properties !== 'object' || Array.isArray(candidate.properties)) { rejected++; continue; }
    const p = candidate.properties as Record<string, unknown>;
    const id = text(p.id) ?? text(candidate.id);
    const title = text(p.title);
    const geometry = candidate.geometry as { type?: unknown; coordinates?: unknown } | null;
    const coordinates = geometry?.coordinates;
    const longitude = Array.isArray(coordinates) ? coordinates[0] : p.lon;
    const latitude = Array.isArray(coordinates) ? coordinates[1] : p.lat;
    const observedValue = p.last_date_time;
    const height = p.last_sea_surface_height;
    const observedMs = typeof observedValue === 'string' ? Date.parse(observedValue) : NaN;
    const utcTimestamp = typeof observedValue === 'string' && /(?:Z|[+-]00:00)$/.test(observedValue) && Number.isFinite(observedMs) ? new Date(observedMs).toISOString() : undefined;
    const noSample = (observedValue === null || observedValue === undefined) && (height === null || height === undefined);
    const validSample = Boolean(utcTimestamp && typeof height === 'number' && Number.isFinite(height));
    if (!id || !/^\d+-\d+$/.test(id) || !title || geometry?.type !== 'Point' || !Array.isArray(coordinates) || !Number.isFinite(longitude) || !Number.isFinite(latitude) || Number(longitude) < -180 || Number(longitude) > 180 || Number(latitude) < -90 || Number(latitude) > 90 || (!validSample && !noSample)) { rejected++; continue; }
    const observedAt = utcTimestamp ?? null;
    const record: WorldRecord = {
      id: `hidrografico-tide:${id}`, providerId: 'hidrografico-tide', kind: 'tide-gauge-observation',
      geometry: { type: 'Point', coordinates: [Number(longitude), Number(latitude)] },
      observedAt, fetchedAt, temporalClass: 'near-live',
      freshness: observedAt ? freshnessForObservedAt('hidrografico-tide', observedAt, now) : 'unavailable', quality: observedAt ? 'observed' : 'unknown',
      properties: {
        stationId: id, stationName: title, ...(typeof height === 'number' ? { heightMetres: height, originalValue: height } : {}),
        unit: 'm', verticalDatum: 'ZH', verticalCrs: 'EPSG:10349', processingLevel: 'L1',
        qualityControl: 'not-performed', sourceStatus: observedAt ? 'reported' : 'no-observation', euLauCode: text(p.eu_lau_code), category: text(p.category),
      },
      provenance: { providerName: 'Instituto Hidrográfico', dataset: 'Tide gauges · near-real-time L1 observations', sourceUrl: TIDE_SOURCE, attribution: 'Instituto Hidrográfico · dados L1 sem controlo de qualidade', termsUrl: TIDE_TERMS, transport: 'direct', coverageNote: 'Estações maregráficas ativas; SSH em metros relativamente ao Zero Hidrográfico (ZH).' },
    };
    const previous = newest.get(id);
    if (!previous || (record.observedAt && (!previous.observedAt || Date.parse(record.observedAt) > Date.parse(previous.observedAt)))) newest.set(id, record);
  }
  return { records: [...newest.values()], rejected };
}
