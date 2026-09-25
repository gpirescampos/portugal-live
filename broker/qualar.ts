import { Uint8ArrayReader, Uint8ArrayWriter, ZipReader } from '@zip.js/zip.js';
import { parquetReadObjects } from 'hyparquet';
import { QUALAR_EEA_API, QUALAR_PATH, QUALAR_STATIONS_API, type BrokerResponse } from './contract.ts';
import { allowedOriginFromEnv, corsHeaders, jsonResponse } from './http.ts';

const POLLUTANTS = [
  'http://dd.eionet.europa.eu/vocabulary/aq/pollutant/6001', // PM2.5
  'http://dd.eionet.europa.eu/vocabulary/aq/pollutant/5', // PM10
  'http://dd.eionet.europa.eu/vocabulary/aq/pollutant/8', // NO2
  'http://dd.eionet.europa.eu/vocabulary/aq/pollutant/7', // O3
  'http://dd.eionet.europa.eu/vocabulary/aq/pollutant/1', // SO2
  'http://dd.eionet.europa.eu/vocabulary/aq/pollutant/10', // CO
];
const CACHE_TTL_MS = 15 * 60_000;
const LOOKBACK_MS = 48 * 60 * 60_000;
const MAX_RESPONSE_BYTES = 20_000_000;
const MAX_UNCOMPRESSED_BYTES = 100_000_000;
const MAX_PARQUET_FILES = 1_000;
const REQUEST_TIMEOUT_MS = 25_000;

export interface QualArBrokerConfig { allowedOrigin?: string; cacheTtlMs?: number; maxResponseBytes?: number; timeoutMs?: number; }
export type QualArFetch = (input: string | URL, init?: RequestInit) => Promise<Response>;
interface CachedData { data: { stations: unknown[]; readings: unknown[]; source: 'eea-e2a'; }; fetchedAt: string; }

export function qualArConfigFromEnv(env: Record<string, string | undefined> = process.env): QualArBrokerConfig {
  const bounded = (key: string, fallback: number, min: number, max: number) => {
    const value = Number(env[key]); return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
  };
  return { allowedOrigin: allowedOriginFromEnv(env), cacheTtlMs: bounded('QUALAR_CACHE_TTL_MS', CACHE_TTL_MS, 5 * 60_000, 60 * 60_000), maxResponseBytes: bounded('QUALAR_MAX_RESPONSE_BYTES', MAX_RESPONSE_BYTES, 1_000_000, 50_000_000), timeoutMs: bounded('QUALAR_TIMEOUT_MS', REQUEST_TIMEOUT_MS, 1_000, 60_000) };
}

/** Broker for the EEA's documented E2a Parquet download API, reported by Portugal. */
export class QualArBroker {
  private readonly config: QualArBrokerConfig;
  private readonly fetcher: QualArFetch;
  private cached?: CachedData;
  private inFlight?: Promise<Response>;

  constructor(config: QualArBrokerConfig = {}, fetcher: QualArFetch = fetch) { this.config = config; this.fetcher = fetcher; }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== QUALAR_PATH) return this.respond(404, this.failure('unavailable', 'Rota não encontrada.'));
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(this.config.allowedOrigin) });
    if (request.method !== 'GET') return this.respond(405, this.failure('unavailable', 'Método não suportado.'));
    const now = Date.now();
    if (this.cached && now - Date.parse(this.cached.fetchedAt) < (this.config.cacheTtlMs ?? CACHE_TTL_MS)) return this.snapshot('live', this.cached);
    if (this.inFlight) return this.inFlight.then((response) => response.clone());
    this.inFlight = this.refresh();
    try { return await this.inFlight; } finally { this.inFlight = undefined; }
  }

  private async refresh(): Promise<Response> {
    const timeoutMs = this.config.timeoutMs ?? REQUEST_TIMEOUT_MS;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(new Error('EEA QualAr request timed out')), timeoutMs);
    try {
      const [stationsResponse, readingsResponse] = await Promise.all([
        this.fetcher(this.stationUrl(0), { signal: controller.signal }),
        this.fetcher(QUALAR_EEA_API, { method: 'POST', signal: controller.signal, headers: { 'content-type': 'application/json', accept: 'application/zip' }, body: JSON.stringify(this.measurementRequest()) }),
      ]);
      if (stationsResponse.status === 429 || readingsResponse.status === 429) return this.failedWithCache('rate-limited', 'A EEA limitou temporariamente os pedidos de qualidade do ar.');
      if (!stationsResponse.ok || !readingsResponse.ok) return this.failedWithCache('unavailable', `A EEA devolveu HTTP ${!readingsResponse.ok ? readingsResponse.status : stationsResponse.status}.`);
      const inventory = await this.readStations(stationsResponse, controller.signal);
      const bytes = await readBoundedBody(readingsResponse, this.config.maxResponseBytes ?? MAX_RESPONSE_BYTES);
      const readings = await this.readParquetZip(bytes);
      if (!inventory.length || !readings.length) return this.failedWithCache('unavailable', 'A resposta EEA não contém estações ou medições utilizáveis.');
      const entry: CachedData = { data: { stations: inventory, readings, source: 'eea-e2a' }, fetchedAt: new Date().toISOString() };
      this.cached = entry;
      return this.snapshot('live', entry);
    } catch (error) {
      return this.failedWithCache('unavailable', error instanceof Error ? error.message : 'Falha ao consultar a fonte EEA.');
    } finally { clearTimeout(timeout); }
  }

  private measurementRequest(): Record<string, unknown> {
    const now = new Date();
    return { countries: ['PT'], cities: [], pollutants: POLLUTANTS, dataset: 1, source: 'E2a', dateTimeStart: new Date(now.getTime() - LOOKBACK_MS).toISOString(), dateTimeEnd: now.toISOString(), aggregationType: 'hour', compress: true };
  }

  private stationUrl(offset: number): string {
    const url = new URL(QUALAR_STATIONS_API);
    url.search = new URLSearchParams({ where: "CountryCode='PT'", outFields: 'AirQualityStationEoICode,AQStationName,stationClass', returnGeometry: 'true', outSR: '4326', f: 'json', resultOffset: String(offset), resultRecordCount: '1000' }).toString();
    return url.toString();
  }

  private async readStations(firstPage: Response, signal: AbortSignal): Promise<unknown[]> {
    const stations: unknown[] = [];
    let response = firstPage; let offset = 0;
    while (true) {
      const body = await response.json() as { features?: unknown[]; exceededTransferLimit?: boolean; error?: { message?: string } };
      if (body.error) throw new Error(body.error.message ?? 'EEA station inventory error');
      const features = Array.isArray(body.features) ? body.features : [];
      stations.push(...features);
      if (!body.exceededTransferLimit) break;
      offset += features.length;
      if (!features.length || offset >= 20_000) throw new Error('EEA station pagination did not advance.');
      response = await this.fetcher(this.stationUrl(offset), { signal });
      if (!response.ok) throw new Error(`EEA station inventory returned HTTP ${response.status}.`);
    }
    return stations;
  }

  private async readParquetZip(bytes: Uint8Array): Promise<unknown[]> {
    const zip = new ZipReader(new Uint8ArrayReader(bytes));
    try {
      const entries = (await zip.getEntries()).filter((entry) => !entry.directory && entry.filename.endsWith('.parquet'));
      if (!entries.length || entries.length > MAX_PARQUET_FILES) throw new Error('EEA Parquet archive has an invalid number of files.');
      const totalUncompressed = entries.reduce((total, entry) => total + entry.uncompressedSize, 0);
      if (!Number.isFinite(totalUncompressed) || totalUncompressed > MAX_UNCOMPRESSED_BYTES) throw new Error('EEA Parquet archive exceeds the uncompressed size limit.');
      const readings: unknown[] = [];
      for (const entry of entries) {
        const parquet = await entry.getData(new Uint8ArrayWriter());
        const arrayBuffer = parquet.buffer.slice(parquet.byteOffset, parquet.byteOffset + parquet.byteLength) as ArrayBuffer;
        readings.push(...await parquetReadObjects({ file: arrayBuffer }));
        if (readings.length > 200_000) throw new Error('EEA Parquet archive contains too many observations.');
      }
      return readings;
    } finally { await zip.close(); }
  }

  private failedWithCache(state: 'unavailable' | 'rate-limited', message: string): Response {
    if (this.cached) return this.snapshot('stale', this.cached, { code: state, message });
    return this.respond(state === 'rate-limited' ? 429 : 502, this.failure(state, message));
  }

  private snapshot(state: 'live' | 'stale', entry: CachedData, error?: { code: string; message: string }): Response {
    const response: BrokerResponse<CachedData['data']> = { provider: 'qualar', state, fetchedAt: entry.fetchedAt, data: entry.data, ...(error ? { error } : {}) };
    return this.respond(200, response);
  }

  private failure(state: 'unavailable' | 'rate-limited', message: string): BrokerResponse { return { provider: 'qualar', state, error: { code: state, message } }; }
  private respond(status: number, body: unknown): Response { return jsonResponse(status, body, this.config.allowedOrigin); }
}

async function readBoundedBody(response: Response, maxBytes: number): Promise<Uint8Array> {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new Error('A resposta EEA excedeu o limite configurado.');
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > maxBytes) throw new Error('A resposta EEA excedeu o limite configurado.');
    return new Uint8Array(buffer);
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new Error('A resposta EEA excedeu o limite configurado.'); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const result = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { result.set(chunk, offset); offset += chunk.byteLength; }
  return result;
}
