import { compositeId } from '../../domain/ids.ts';
import { freshnessForObservedAt } from '../../domain/freshness.ts';
import type { ProviderError, WorldRecord } from '../../domain/world.ts';

export interface ParsedFirms { records: WorldRecord[]; rejected: number; error?: ProviderError; }
export interface FirmsCsvInput { regionId: string; csv: string; fetchedAt: string; stale?: boolean; }

const SOURCE_URL = 'https://firms.modaps.eosdis.nasa.gov/map/';
function rowsFromCsv(csv: string): string[][] | null {
  const rows: string[][] = [];
  let row: string[] = []; let cell = ''; let quoted = false;
  const text = csv.replace(/^\uFEFF/, '');
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    if (char === '"') {
      if (quoted && text[i + 1] === '"') { cell += '"'; i += 1; }
      else quoted = !quoted;
    } else if (char === ',' && !quoted) { row.push(cell); cell = ''; }
    else if ((char === '\n' || char === '\r') && !quoted) {
      if (char === '\r' && text[i + 1] === '\n') i += 1;
      row.push(cell); cell = '';
      if (row.some((part) => part.length)) rows.push(row);
      row = [];
    } else cell += char;
  }
  if (quoted) return null;
  if (cell.length || row.length) { row.push(cell); rows.push(row); }
  return rows;
}

function numeric(value: string | undefined): number | undefined {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function acquisitionTime(date: string | undefined, time: string | undefined): string | undefined {
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !time || !/^\d{1,6}$/.test(time)) return undefined;
  // FIRMS CSV may serialize numeric HHMM acquisition times without leading
  // zeroes (e.g. 206 means 02:06). Six-digit HHMMSS values are also accepted.
  const normalized = time.length <= 4 ? `${time.padStart(4, '0')}00` : time.padStart(6, '0');
  const hour = Number(normalized.slice(0, 2));
  const minute = Number(normalized.slice(2, 4));
  const second = Number(normalized.slice(4, 6));
  if (hour > 23 || minute > 59 || second > 59) return undefined;
  const timestamp = Date.parse(`${date}T${normalized.slice(0, 2)}:${normalized.slice(2, 4)}:${normalized.slice(4, 6)}Z`);
  if (Number.isNaN(timestamp) || new Date(timestamp).toISOString().slice(0, 10) !== date) return undefined;
  return new Date(timestamp).toISOString();
}

function confidence(value: string | undefined): { value?: string; band: 'low' | 'nominal' | 'high' | 'unknown'; rank: number } {
  const normalized = value?.trim().toLowerCase();
  if (!normalized) return { band: 'unknown', rank: 0 };
  if (normalized === 'h' || normalized === 'high') return { value: 'high', band: 'high', rank: 3 };
  if (normalized === 'n' || normalized === 'nominal') return { value: 'nominal', band: 'nominal', rank: 2 };
  if (normalized === 'l' || normalized === 'low') return { value: 'low', band: 'low', rank: 1 };
  const numericValue = Number(normalized);
  if (Number.isFinite(numericValue)) {
    const band = numericValue >= 67 ? 'high' : numericValue >= 33 ? 'nominal' : 'low';
    return { value: `${numericValue}`, band, rank: band === 'high' ? 3 : band === 'nominal' ? 2 : 1 };
  }
  return { value: value?.trim(), band: 'unknown', rank: 0 };
}

/** Parse a FIRMS CSV snapshot and retain only the trailing 24 hours. */
export function parseFirmsCsv(input: FirmsCsvInput, now = new Date(input.fetchedAt)): ParsedFirms {
  const rows = rowsFromCsv(input.csv);
  if (!rows?.length) return { records: [], rejected: 0, error: { code: 'parse', message: 'A resposta do NASA FIRMS não contém CSV válido.' } };
  const headers = rows[0].map((header) => header.trim().toLowerCase());
  if (!['latitude', 'longitude', 'acq_date', 'acq_time'].every((field) => headers.includes(field))) {
    return { records: [], rejected: 0, error: { code: 'parse', message: 'O CSV do NASA FIRMS não contém os campos necessários.' } };
  }
  const indexes = new Map(headers.map((header, index) => [header, index]));
  const records: WorldRecord[] = []; let rejected = 0;
  const minTime = now.getTime() - 24 * 60 * 60_000;
  for (const row of rows.slice(1)) {
    const field = (name: string) => { const index = indexes.get(name); return index === undefined ? undefined : row[index]; };
    const latitude = numeric(field('latitude')); const longitude = numeric(field('longitude'));
    const observedAt = acquisitionTime(field('acq_date'), field('acq_time'));
    if (latitude === undefined || longitude === undefined || latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180 || !observedAt) { rejected += 1; continue; }
    const observedMs = Date.parse(observedAt);
    if (observedMs < minTime || observedMs > now.getTime() + 5 * 60_000) continue;
    const satellite = field('satellite')?.trim() || 'unknown';
    const instrument = field('instrument')?.trim() || 'VIIRS';
    const scan = numeric(field('scan')); const track = numeric(field('track'));
    const frp = numeric(field('frp')); const brightTi4 = numeric(field('bright_ti4')); const brightTi5 = numeric(field('bright_ti5'));
    const confidenceValue = confidence(field('confidence'));
    const stableId = compositeId('firms', satellite, instrument, observedAt, latitude.toFixed(4), longitude.toFixed(4), scan ?? '', track ?? '');
    records.push({
      id: stableId, providerId: 'firms', kind: 'thermal-detection', geometry: { type: 'Point', coordinates: [longitude, latitude] },
      observedAt, fetchedAt: input.fetchedAt, temporalClass: 'near-live', freshness: input.stale ? 'stale' : freshnessForObservedAt('firms', observedAt, now), quality: 'satellite-detected',
      properties: {
        satellite, instrument, confidence: confidenceValue.value, confidenceBand: confidenceValue.band, confidenceRank: confidenceValue.rank,
        frpMw: frp, brightTi4Kelvin: brightTi4, brightTi5Kelvin: brightTi5,
        scanKm: numeric(field('scan')), trackKm: numeric(field('track')),
        dayNight: field('daynight')?.trim().toUpperCase(), sourceVersion: field('version')?.trim(), regionId: input.regionId,
      },
      provenance: { providerName: 'NASA FIRMS', dataset: 'VIIRS thermal anomaly detections', sourceUrl: SOURCE_URL, attribution: 'NASA FIRMS', transport: 'brokered', coverageNote: 'A deteção térmica por satélite não confirma, por si só, um incêndio.' },
    });
  }
  return { records, rejected };
}
