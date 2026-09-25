import { freshnessForObservedAt } from '../../domain/freshness.ts';
import type { WorldRecord } from '../../domain/world.ts';

/** Stable public feed contract expected by this adapter once APA confirms it. */
export interface QualArStation { id: string; name: string; longitude: number; latitude: number; stationType?: string; region?: string; network?: string; }
export interface QualArReading { stationId: string; pollutant: string; value: number; unit: string; originalValue: number; originalUnit: string; averagingPeriod: string; observedAt: string; sourceUpdatedAt?: string; dataCapture?: number; status?: string; quality?: string; }
export interface QualArParsed { records: WorldRecord[]; rejected: number; }

export function groupQualArRecords(records: WorldRecord[]): WorldRecord[] {
  const groups = new Map<string, WorldRecord[]>();
  for (const record of records) {
    const stationId = String(record.properties.stationId ?? '');
    if (!stationId) continue;
    const group = groups.get(stationId) ?? [];
    group.push(record); groups.set(stationId, group);
  }
  return [...groups.entries()].map(([stationId, stationRecords]) => {
    const latest = stationRecords.reduce((a, b) => Date.parse(a.observedAt ?? '') >= Date.parse(b.observedAt ?? '') ? a : b);
    return {
      ...latest,
      id: `qualar:station:${stationId}`,
      properties: {
        stationId, stationName: latest.properties.stationName, stationType: latest.properties.stationType,
        network: latest.properties.network, region: latest.properties.region,
        measurements: stationRecords.map((record) => ({ pollutant: record.properties.pollutant, value: record.properties.value, unit: record.properties.unit, originalValue: record.properties.originalValue, originalUnit: record.properties.originalUnit, averagingPeriod: record.properties.averagingPeriod, observedAt: record.observedAt, sourceUpdatedAt: record.sourceUpdatedAt, dataCapture: record.properties.dataCapture, freshness: record.freshness, sourceStatus: record.properties.sourceStatus, sourceQuality: record.properties.sourceQuality })),
      },
    };
  });
}

export const QUALAR_SOURCE = 'https://qualar.apambiente.pt/';
const POLLUTANTS = new Set(['PM2.5', 'PM10', 'NO2', 'O3', 'SO2', 'CO']);
const number = (v: unknown): number | undefined => { const parsed = typeof v === 'number' ? v : typeof v === 'string' && v.trim() ? Number(v) : NaN; return Number.isFinite(parsed) ? parsed : undefined; };
const text = (v: unknown): string | undefined => typeof v === 'string' && v.trim() ? v.trim() : undefined;
const valueText = (v: unknown): string | undefined => text(v) ?? (typeof v === 'number' && Number.isFinite(v) ? String(v) : undefined);
const UNIT_FACTORS: Record<string, { unit: string; factor: number }> = {
  'µg/m³': { unit: 'µg/m³', factor: 1 }, 'μg/m³': { unit: 'µg/m³', factor: 1 }, 'ug/m3': { unit: 'µg/m³', factor: 1 }, 'ug.m-3': { unit: 'µg/m³', factor: 1 }, 'µg.m-3': { unit: 'µg/m³', factor: 1 },
  'mg/m³': { unit: 'µg/m³', factor: 1_000 }, 'mg/m3': { unit: 'µg/m³', factor: 1_000 }, 'mg.m-3': { unit: 'µg/m³', factor: 1_000 },
  'ng/m³': { unit: 'µg/m³', factor: 0.001 }, 'ng/m3': { unit: 'µg/m³', factor: 0.001 }, 'ng.m-3': { unit: 'µg/m³', factor: 0.001 },
};

const EEA_POLLUTANTS: Record<string, string> = { '1': 'SO2', '5': 'PM10', '7': 'O3', '8': 'NO2', '10': 'CO', '6001': 'PM2.5' };
function timestampText(value: unknown): string | undefined {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString();
  return text(value);
}

/** Convert EEA's documented E2a Parquet row shape into the normalized parser contract. */
export function normalizeEeaPayload(stationPayload: unknown, readingPayload: unknown): { stations: unknown[]; readings: unknown[] } {
  const stations: unknown[] = [];
  if (Array.isArray(stationPayload)) for (const raw of stationPayload) {
    if (!raw || typeof raw !== 'object') continue;
    const feature = raw as Record<string, unknown>;
    const attributes = feature.attributes && typeof feature.attributes === 'object' ? feature.attributes as Record<string, unknown> : feature;
    const geometry = feature.geometry && typeof feature.geometry === 'object' ? feature.geometry as Record<string, unknown> : {};
    const id = text(attributes.AirQualityStationEoICode);
    const name = text(attributes.AQStationName);
    const longitude = number(geometry.x ?? attributes.longitude);
    const latitude = number(geometry.y ?? attributes.latitude);
    if (id && name && longitude !== undefined && latitude !== undefined) stations.push({ id, name, longitude, latitude, stationType: attributes.stationClass == null ? undefined : `Classe ${attributes.stationClass}`, network: 'EEA · E2a' });
  }
  const readings: unknown[] = [];
  if (Array.isArray(readingPayload)) for (const raw of readingPayload) {
    if (!raw || typeof raw !== 'object') continue;
    const row = raw as Record<string, unknown>;
    const sample = text(row.Samplingpoint ?? row.samplingpoint);
    const stationId = sample?.match(/SPO-(PT\d+)_/)?.[1];
    const rawPollutant = String(row.Pollutant ?? row.pollutant ?? '').split('/').at(-1) ?? '';
    const pollutant = EEA_POLLUTANTS[rawPollutant];
    const observedAt = timestampText(row.Start ?? row.start);
    const publishedAt = timestampText(row.ResultTime ?? row.resulttime);
    const averagingPeriod = valueText(row.AggType ?? row.aggtype);
    readings.push({ stationId, pollutant, value: row.Value ?? row.value, unit: row.Unit ?? row.unit, averagingPeriod: averagingPeriod === 'hour' ? '1 hora' : averagingPeriod === 'day' ? '1 dia' : averagingPeriod, observedAt, status: valueText(row.Validity ?? row.validity), quality: valueText(row.Verification ?? row.verification), sourceUpdatedAt: publishedAt, dataCapture: number(row.DataCapture ?? row.datacapture) });
  }
  return { stations, readings };
}

function qualityRank(value: string | undefined): number {
  const normalized = value?.toLowerCase() ?? '';
  if (/verified|validated|validado|validada|final|confirmed/.test(normalized)) return 3;
  if (/preliminary|provisional|preliminar|provisório|provisoria/.test(normalized)) return 1;
  if (normalized === '1') return 3;
  if (normalized === '2') return 2;
  if (normalized === '3') return 1;
  return 0;
}

function isInvalidStatus(value: string | undefined): boolean {
  return value === '-1' || value === '-99';
}

/** Join separately obtained station inventory and readings by source station ID. */
export function parseQualAr(stationsInput: unknown, readingsInput: unknown, fetchedAt: string, now = new Date(fetchedAt), transport: 'direct' | 'brokered' = 'direct'): QualArParsed {
  if (!Array.isArray(stationsInput) || !Array.isArray(readingsInput)) return { records: [], rejected: 0 };
  const stations = new Map<string, QualArStation>();
  for (const raw of stationsInput) {
    if (!raw || typeof raw !== 'object') continue;
    const s = raw as Record<string, unknown>;
    const id = text(s.id), name = text(s.name), longitude = number(s.longitude), latitude = number(s.latitude);
    if (id && name && longitude !== undefined && latitude !== undefined && longitude >= -180 && longitude <= 180 && latitude >= -90 && latitude <= 90) {
      stations.set(id, { id, name, longitude, latitude, stationType: text(s.stationType), region: text(s.region), network: text(s.network) });
    }
  }
  const newest = new Map<string, { station: QualArStation; reading: QualArReading }>();
  let rejected = 0;
  for (const raw of readingsInput) {
    if (!raw || typeof raw !== 'object') { rejected++; continue; }
    const r = raw as Record<string, unknown>;
    const stationId = text(r.stationId), pollutantInput = text(r.pollutant);
    const pollutant = pollutantInput?.toUpperCase() === 'PM2.5' ? 'PM2.5' : pollutantInput?.toUpperCase();
    const originalValue = number(r.value), originalUnit = text(r.unit), averagingPeriod = text(r.averagingPeriod), rawDate = text(r.observedAt);
    const timestamp = rawDate ? Date.parse(rawDate) : NaN;
    const station = stationId ? stations.get(stationId) : undefined;
    const sourceUnit = originalUnit?.trim().toLowerCase();
    const conversion = originalUnit && sourceUnit ? UNIT_FACTORS[sourceUnit] : undefined;
    const status = valueText(r.status), quality = valueText(r.quality);
    if (!station || !pollutant || !POLLUTANTS.has(pollutant) || originalValue === undefined || originalValue < 0 || !conversion || !averagingPeriod || Number.isNaN(timestamp) || !rawDate || !/(z|[+-]\d{2}:?\d{2})$/i.test(rawDate) || timestamp > now.getTime() + 5 * 60_000 || isInvalidStatus(status)) { rejected++; continue; }
    const normalizedUnit = pollutant === 'CO' ? 'mg/m³' : 'µg/m³';
    const factor = pollutant === 'CO' ? conversion.unit === 'µg/m³' ? conversion.factor / 1_000 : conversion.factor : conversion.factor;
    const value = originalValue * factor;
    const sourceUpdatedRaw = timestampText(r.sourceUpdatedAt);
    const sourceUpdatedMs = sourceUpdatedRaw ? Date.parse(sourceUpdatedRaw) : NaN;
    const sourceUpdatedAt = Number.isNaN(sourceUpdatedMs) ? undefined : new Date(sourceUpdatedMs).toISOString();
    const dataCapture = number(r.dataCapture);
    const reading: QualArReading = { stationId: station.id, pollutant, value, unit: normalizedUnit, originalValue, originalUnit: originalUnit!, averagingPeriod, observedAt: new Date(timestamp).toISOString(), sourceUpdatedAt, dataCapture, status, quality };
    const key = `${station.id}:${pollutant}`;
    const previous = newest.get(key);
    if (!previous || timestamp > Date.parse(previous.reading.observedAt) || (timestamp === Date.parse(previous.reading.observedAt) && (
      qualityRank(`${quality ?? ''} ${status ?? ''}`) > qualityRank(`${previous.reading.quality ?? ''} ${previous.reading.status ?? ''}`)
      || (qualityRank(`${quality ?? ''} ${status ?? ''}`) === qualityRank(`${previous.reading.quality ?? ''} ${previous.reading.status ?? ''}`) && Date.parse(sourceUpdatedAt ?? '') > Date.parse(previous.reading.sourceUpdatedAt ?? ''))
    ))) newest.set(key, { station, reading });
  }
  const records = [...newest.values()].map(({ station, reading }): WorldRecord => ({
    id: `qualar:${station.id}:${reading.pollutant}`, providerId: 'qualar', kind: 'air-quality-observation',
    geometry: { type: 'Point', coordinates: [station.longitude, station.latitude] }, observedAt: reading.observedAt, fetchedAt, sourceUpdatedAt: reading.sourceUpdatedAt,
    temporalClass: 'current', freshness: freshnessForObservedAt('qualar', reading.observedAt, now), quality: 'observed',
    properties: { stationId: station.id, stationName: station.name, stationType: station.stationType, region: station.region, network: station.network, pollutant: reading.pollutant, value: reading.value, originalValue: reading.originalValue, unit: reading.unit, originalUnit: reading.originalUnit, averagingPeriod: reading.averagingPeriod, dataCapture: reading.dataCapture, sourceStatus: reading.status, sourceQuality: reading.quality, sourceUpdatedAt: reading.sourceUpdatedAt },
    provenance: { providerName: 'EEA (dados comunicados por Portugal)', dataset: 'Up-to-date air quality measurements (E2a)', sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/778ef9f5-6293-4846-badd-56a29c70880d', attribution: 'European Environment Agency (EEA), dados comunicados por Portugal, CC BY 4.0', termsUrl: 'https://creativecommons.org/licenses/by/4.0/', transport, coverageNote: 'Série E2a não verificada, comunicada por Portugal; a disponibilidade varia por estação e poluente.' },
  }));
  return { records, rejected };
}
