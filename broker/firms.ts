import { FIRMS_PATH, FIRMS_UPSTREAM, type BrokerResponse } from './contract.ts';
import { allowedOriginFromEnv, corsHeaders, jsonResponse } from './http.ts';

export interface FirmsRegion { id: 'mainland' | 'madeira' | 'azores'; area: string; }
export const FIRMS_REGIONS: FirmsRegion[] = [
  { id: 'mainland', area: '-9.7,36.7,-6.0,42.2' },
  { id: 'madeira', area: '-17.3,32.6,-16.2,33.2' },
  { id: 'azores', area: '-31.5,36.8,-24.5,39.8' },
];

export interface FirmsBrokerConfig {
  mapKey?: string;
  upstreamUrl: string;
  source: string;
  dayRange: number;
  cacheTtlMs: number;
  timeoutMs: number;
  maxBodyBytes: number;
  allowedOrigin?: string;
}
export interface FirmsFetch { (input: string | URL, init?: RequestInit): Promise<Response>; }
interface CachedRegion { csv: string; fetchedAt: number; }
interface RegionResult { id: FirmsRegion['id']; csv: string; fetchedAt: string; stale: boolean; }

const DEFAULT_SOURCE = 'VIIRS_NOAA20_NRT';
const DEFAULT_TTL_MS = 30 * 60_000;

export function configFromEnv(env: Record<string, string | undefined> = process.env): FirmsBrokerConfig {
  return {
    mapKey: env.FIRMS_MAP_KEY?.trim() || undefined,
    upstreamUrl: FIRMS_UPSTREAM,
    source: DEFAULT_SOURCE,
    dayRange: 2,
    cacheTtlMs: boundedNumber(env.FIRMS_CACHE_TTL_MS, DEFAULT_TTL_MS, 60_000, 6 * 60 * 60_000),
    timeoutMs: boundedNumber(env.FIRMS_TIMEOUT_MS, 12_000, 500, 30_000),
    maxBodyBytes: boundedNumber(env.FIRMS_MAX_BODY_BYTES, 5_000_000, 16_384, 20_000_000),
    allowedOrigin: allowedOriginFromEnv(env),
  };
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

/**
 * Small local broker for a fixed sensor and three Portugal coverage boxes.
 * The MAP_KEY is only inserted in upstream paths and never returned or logged.
 */
export class FirmsBroker {
  private readonly config: FirmsBrokerConfig;
  private readonly fetcher: FirmsFetch;
  private readonly cache = new Map<FirmsRegion['id'], CachedRegion>();
  private inFlight?: Promise<Response>;

  constructor(config: FirmsBrokerConfig, fetcher: FirmsFetch = fetch) { this.config = config; this.fetcher = fetcher; }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== FIRMS_PATH) return json(404, failure('unavailable', 'Rota não encontrada.'));
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(this.config.allowedOrigin) });
    if (request.method !== 'GET') return this.respond(405, failure('unavailable', 'Método não suportado.'));
    if (!this.config.mapKey) return this.respond(503, failure('configuration-required', 'O fornecedor NASA FIRMS não está configurado.'));

    const now = Date.now();
    if (FIRMS_REGIONS.every(({ id }) => {
      const item = this.cache.get(id);
      return item && now - item.fetchedAt < this.config.cacheTtlMs;
    })) return this.cachedSnapshot('live');
    // Each HTTP request needs its own consumable response body while sharing
    // the same upstream work.
    if (this.inFlight) return this.inFlight.then((response) => response.clone());
    this.inFlight = this.fetchRegions();
    try { return await this.inFlight; } finally { this.inFlight = undefined; }
  }

  private async fetchRegions(): Promise<Response> {
    let failed = 0;
    const results: RegionResult[] = [];
    for (const region of FIRMS_REGIONS) {
      const cached = this.cache.get(region.id);
      if (cached && Date.now() - cached.fetchedAt < this.config.cacheTtlMs) {
        results.push({ id: region.id, csv: cached.csv, fetchedAt: new Date(cached.fetchedAt).toISOString(), stale: false });
        continue;
      }
      const csv = await this.fetchRegion(region);
      if (csv !== null) {
        const entry = { csv, fetchedAt: Date.now() };
        this.cache.set(region.id, entry);
        results.push({ id: region.id, csv, fetchedAt: new Date(entry.fetchedAt).toISOString(), stale: false });
      } else {
        failed += 1;
        if (cached) results.push({ id: region.id, csv: cached.csv, fetchedAt: new Date(cached.fetchedAt).toISOString(), stale: true });
      }
    }

    if (results.length === 0) return this.respond(502, failure('unavailable', 'Não foi possível obter dados do NASA FIRMS.'));
    const state = failed === 0 ? 'live' : results.some(({ stale }) => stale) ? 'stale' : 'partial';
    const response: BrokerResponse<{ source: string; regions: RegionResult[]; failedRegions: string[] }> = {
      provider: 'firms', state, fetchedAt: new Date().toISOString(),
      data: { source: this.config.source, regions: results, failedRegions: FIRMS_REGIONS.filter(({ id }) => !results.some((result) => result.id === id && !result.stale)).map(({ id }) => id) },
      ...(failed ? { error: { code: 'partial_source_failure', message: 'Algumas áreas não foram atualizadas.' } } : {}),
    };
    return this.respond(200, response);
  }

  private async fetchRegion(region: FirmsRegion): Promise<string | null> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const url = `${this.config.upstreamUrl}/${encodeURIComponent(this.config.mapKey!)}/${this.config.source}/${region.area}/${this.config.dayRange}`;
      const response = await this.fetcher(url, { signal: controller.signal, headers: { Accept: 'text/csv' } });
      if (!response.ok) return null;
      const csv = await boundedText(response, this.config.maxBodyBytes);
      if (!isCsvPayload(csv)) return null;
      return csv;
    } catch {
      // Do not expose upstream URLs: the MAP_KEY is part of the path.
      return null;
    } finally { clearTimeout(timeout); }
  }

  private cachedSnapshot(state: 'live' | 'stale'): Response {
    const regions = FIRMS_REGIONS.map(({ id }) => {
      const cached = this.cache.get(id)!;
      return { id, csv: cached.csv, fetchedAt: new Date(cached.fetchedAt).toISOString(), stale: state === 'stale' };
    });
    return this.respond(200, { provider: 'firms', state, fetchedAt: new Date().toISOString(), data: { source: this.config.source, regions, failedRegions: [] } });
  }

  private respond(status: number, body: BrokerResponse): Response { return jsonResponse(status, body, this.config.allowedOrigin); }
}

function isCsvPayload(value: string): boolean {
  const firstLine = value.replace(/^\uFEFF/, '').split(/\r?\n/, 1)[0]?.toLowerCase() ?? '';
  return firstLine.includes('latitude') && firstLine.includes('longitude') && firstLine.includes('acq_date') && firstLine.includes('acq_time');
}

async function boundedText(response: Response, maxBytes: number): Promise<string> {
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > maxBytes) throw new Error('response_too_large');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new Error('response_too_large');
  return new TextDecoder().decode(bytes);
}

function failure(state: BrokerResponse['state'], message: string): BrokerResponse {
  return { provider: 'firms', state, error: { code: state, message } };
}
