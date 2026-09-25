import type { BrokerResponse } from './contract.ts';
import { VIAVERDE_CAMERAS_PATH } from './contract.ts';
import { allowedOriginFromEnv, corsHeaders, jsonResponse } from './http.ts';

const PAGE_URL = 'https://www.viaverde.pt/Ferramentas/informacao-de-transito';
const API_URL = 'https://www.viaverde.pt/DesktopModules/Traffic/Handlers/Api.ashx?action=cameras&lang=pt-PT';
const CACHE_TTL_MS = 6 * 60 * 60_000;
const UPSTREAM_TIMEOUT_MS = 12_000;
const MAX_PAGE_BYTES = 400_000;
const MAX_CATALOGUE_BYTES = 250_000;
const SOURCE_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';

interface BrisaCamera { id: number; name: string; roadName: string; latitude: number; longitude: number; }
interface CameraCache { cameras: BrisaCamera[]; fetchedAt: number; }
export interface ViaVerdeFetch { (input: string | URL, init?: RequestInit): Promise<Response>; }

export function configFromEnv(env: Record<string, string | undefined> = process.env) {
  return { allowedOrigin: allowedOriginFromEnv(env), cacheTtlMs: boundedNumber(env.VIAVERDE_CAMERAS_CACHE_TTL_MS, CACHE_TTL_MS, 60_000, 24 * 60 * 60_000) };
}

export class ViaVerdeCamerasBroker {
  private readonly allowedOrigin: string;
  private readonly cacheTtlMs: number;
  private readonly fetcher: ViaVerdeFetch;
  private cache?: CameraCache;
  private inFlight?: Promise<Response>;

  constructor(config = configFromEnv(), fetcher: ViaVerdeFetch = fetch) {
    this.allowedOrigin = config.allowedOrigin;
    this.cacheTtlMs = config.cacheTtlMs;
    this.fetcher = fetcher;
  }

  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== VIAVERDE_CAMERAS_PATH) return this.respond(404, failure('unavailable', 'Rota não encontrada.'));
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(this.allowedOrigin) });
    if (request.method !== 'GET') return this.respond(405, failure('unavailable', 'Método não suportado.'));
    if (this.cache && Date.now() - this.cache.fetchedAt < this.cacheTtlMs) return this.cached('live');
    if (this.inFlight) return this.inFlight.then((response) => response.clone());
    this.inFlight = this.refresh();
    try { return await this.inFlight; } finally { this.inFlight = undefined; }
  }

  private async refresh(): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);
    try {
      const page = await this.fetcher(PAGE_URL, { signal: controller.signal, redirect: 'manual', headers: { 'user-agent': SOURCE_USER_AGENT, accept: 'text/html' } });
      if (!page.ok || new URL(page.url || PAGE_URL).origin !== 'https://www.viaverde.pt') throw new Error('source_page_unavailable');
      const html = await boundedText(page, MAX_PAGE_BYTES);
      const tabId = /__dnnVariable[^>]*value=["'][^"']*sf_tabId`:`(\d+)`/.exec(html)?.[1];
      if (!tabId) throw new Error('source_tab_missing');
      const cookie = cookieHeader(page.headers);
      if (!cookie) throw new Error('source_session_missing');
      const response = await this.fetcher(API_URL, {
        signal: controller.signal,
        redirect: 'manual',
        headers: {
          'user-agent': SOURCE_USER_AGENT,
          referer: PAGE_URL,
          origin: 'https://www.viaverde.pt',
          moduleid: '0',
          tabid: tabId,
          'x-requested-with': 'XMLHttpRequest',
          accept: 'application/json, text/javascript, */*; q=0.01',
          cookie,
        },
      });
      if (!response.ok || new URL(response.url || API_URL).origin !== 'https://www.viaverde.pt') throw new Error(`source_api_http_${response.status}`);
      const json = JSON.parse(await boundedText(response, MAX_CATALOGUE_BYTES)) as unknown;
      const cameras = parseCatalogue(json);
      if (!cameras.length) throw new Error('source_catalogue_empty');
      const entry = { cameras, fetchedAt: Date.now() };
      this.cache = entry;
      return this.reply(200, { provider: 'broker', state: 'live', fetchedAt: new Date(entry.fetchedAt).toISOString(), data: { cameras } });
    } catch {
      if (this.cache) return this.cached('stale');
      return this.respond(502, failure('unavailable', 'Não foi possível obter o catálogo de câmaras Brisa.'));
    } finally { clearTimeout(timeout); }
  }

  private cached(state: 'live' | 'stale'): Response {
    const cache = this.cache!;
    return this.reply(200, { provider: 'broker', state, fetchedAt: new Date(cache.fetchedAt).toISOString(), data: { cameras: cache.cameras } });
  }

  private reply(status: number, body: BrokerResponse<{ cameras: BrisaCamera[] }>): Response {
    const response = jsonResponse(status, body, this.allowedOrigin);
    response.headers.set('cache-control', 'no-store');
    return response;
  }

  private respond(status: number, body: BrokerResponse): Response { return jsonResponse(status, body, this.allowedOrigin); }
}

function parseCatalogue(value: unknown): BrisaCamera[] {
  const entries = Array.isArray(value) ? value : (value as { Items?: unknown[] } | null)?.Items;
  if (!Array.isArray(entries)) throw new Error('invalid_source_catalogue');
  const ids = new Set<number>();
  const cameras: BrisaCamera[] = [];
  for (const value of entries) {
    if (!value || typeof value !== 'object') continue;
    const source = value as { id?: unknown; name?: unknown; roadName?: unknown; coordinates?: { latitude?: unknown; longitude?: unknown }; imageUrl?: unknown; type?: unknown };
    const id = Number(source.id);
    const latitude = Number(source.coordinates?.latitude);
    const longitude = Number(source.coordinates?.longitude);
    if (!Number.isSafeInteger(id) || id < 1 || ids.has(id) || source.type !== 'CAMERA') continue;
    if (typeof source.name !== 'string' || !source.name.trim() || source.name.length > 120 || typeof source.roadName !== 'string' || source.roadName.length > 30) continue;
    if (!Number.isFinite(latitude) || latitude < 37 || latitude > 42.2 || !Number.isFinite(longitude) || longitude < -9.5 || longitude > -8.0) continue;
    if (typeof source.imageUrl !== 'string' || !approvedImageUrl(source.imageUrl, id)) continue;
    ids.add(id);
    cameras.push({ id, name: source.name.trim(), roadName: source.roadName.trim(), latitude, longitude });
  }
  return cameras;
}

function approvedImageUrl(value: string, id: number): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && url.hostname === 's3.eu-west-1.amazonaws.com' && url.pathname === `/brisa-vvservices-prod-images/CAM_${id}.png` && !url.username && !url.password && !url.search && !url.hash;
  } catch { return false; }
}

function cookieHeader(headers: Headers): string {
  const getSetCookie = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const lines = typeof getSetCookie === 'function' ? getSetCookie.call(headers) : [headers.get('set-cookie') ?? ''];
  const values = lines.flatMap((line) => line.split(/,(?=\s*[^;,=\s]+=)/)).map((line) => line.trim().split(';', 1)[0] ?? '').filter((line) => /^[^=\s]+=/.test(line));
  return values.join('; ');
}

async function boundedText(response: Response, maxBytes: number): Promise<string> {
  const contentLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) throw new Error('response_too_large');
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new Error('response_too_large');
  return new TextDecoder().decode(bytes);
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.min(max, Math.max(min, parsed)) : fallback;
}

function failure(state: BrokerResponse['state'], message: string): BrokerResponse {
  return { provider: 'broker', state, error: { code: state, message } };
}
