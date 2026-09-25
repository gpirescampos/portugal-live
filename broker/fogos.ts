import { FOGOS_PATH, FOGOS_UPSTREAM, type BrokerResponse } from "./contract.ts";
import { allowedOriginFromEnv, corsHeaders, jsonResponse } from './http.ts';

export interface BrokerConfig {
  apiKey?: string;
  userAgent: string;
  upstreamUrl: string;
  cacheTtlMs: number;
  timeoutMs: number;
  maxBodyBytes: number;
  allowedOrigin: string;
}

export interface BrokerFetch {
  (input: string | URL, init?: RequestInit): Promise<Response>;
}

const DEFAULT_USER_AGENT = "PortugalLive/0.1 (+https://github.com/gpirescampos/portugal-live)";
export function configFromEnv(env: Record<string, string | undefined> = process.env): BrokerConfig {
  return {
    apiKey: env.FOGOS_API_KEY?.trim() || undefined,
    userAgent: env.FOGOS_USER_AGENT?.trim() || DEFAULT_USER_AGENT,
    upstreamUrl: FOGOS_UPSTREAM,
    cacheTtlMs: boundedNumber(env.FOGOS_CACHE_TTL_MS, 180_000, 1_000, 900_000),
    timeoutMs: boundedNumber(env.FOGOS_TIMEOUT_MS, 8_000, 500, 30_000),
    maxBodyBytes: boundedNumber(env.FOGOS_MAX_BODY_BYTES, 2_000_000, 16_384, 10_000_000),
    allowedOrigin: allowedOriginFromEnv(env),
  };
}

function boundedNumber(value: string | undefined, fallback: number, min: number, max: number): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.min(max, Math.max(min, number)) : fallback;
}

interface CacheEntry { body: unknown; fetchedAt: number; }

export class FogosBroker {
  private readonly config: BrokerConfig;
  private readonly fetcher: BrokerFetch;
  private cache?: CacheEntry;
  private cooldownUntil = 0;
  private inFlight?: Promise<Response>;

  constructor(config: BrokerConfig, fetcher: BrokerFetch = fetch) { this.config = config; this.fetcher = fetcher; }

  async handle(request: Request): Promise<Response> {
    if (new URL(request.url).pathname !== FOGOS_PATH) return json(404, failure("not_found", "Rota não encontrada."));
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(this.config.allowedOrigin) });
    if (request.method !== "GET") return this.respond(405, failure("method_not_allowed", "Método não suportado."));
    if (!this.config.apiKey) return this.respond(503, failure("configuration_required", "O fornecedor Fogos.pt não está configurado."));

    const now = Date.now();
    if (this.cooldownUntil > now) {
      return this.respond(429, { provider: "fogos", state: "rate-limited", retryAfterSeconds: Math.ceil((this.cooldownUntil - now) / 1000), error: { code: "upstream_rate_limited", message: "O fornecedor está temporariamente limitado." } });
    }
    if (this.cache && now - this.cache.fetchedAt < this.config.cacheTtlMs) {
      return this.respond(200, { provider: "fogos", state: "live", fetchedAt: new Date(this.cache.fetchedAt).toISOString(), data: this.cache.body });
    }
    // Each caller needs an independently consumable response body while
    // sharing the same upstream request.
    if (this.inFlight) return this.inFlight.then((response) => response.clone());
    this.inFlight = this.fetchUpstream();
    try { return await this.inFlight; } finally { this.inFlight = undefined; }
  }

  private async fetchUpstream(): Promise<Response> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const response = await this.fetcher(this.config.upstreamUrl, { signal: controller.signal, headers: { Accept: "application/json", "User-Agent": this.config.userAgent, "X-API-Key": this.config.apiKey! } });
      if (response.status === 429) {
        const retryAfter = retryAfterSeconds(response.headers.get("retry-after"));
        this.cooldownUntil = Date.now() + retryAfter * 1000;
        if (this.cache) return this.respond(200, { provider: "fogos", state: "stale", retryAfterSeconds: retryAfter, fetchedAt: new Date(this.cache.fetchedAt).toISOString(), data: this.cache.body, error: { code: "upstream_rate_limited", message: "A mostrar o último retrato disponível; o fornecedor está temporariamente limitado." } });
        return this.respond(429, { provider: "fogos", state: "rate-limited", retryAfterSeconds: retryAfter, error: { code: "upstream_rate_limited", message: "O fornecedor está temporariamente limitado." } });
      }
      if (!response.ok) return this.staleOrError("upstream_unavailable", "Não foi possível obter dados do fornecedor.");
      const text = await boundedText(response, this.config.maxBodyBytes);
      let body: unknown;
      try { body = JSON.parse(text); } catch { return this.staleOrError("invalid_response", "O fornecedor devolveu uma resposta inválida."); }
      this.cache = { body, fetchedAt: Date.now() };
      return this.respond(200, { provider: "fogos", state: "live", fetchedAt: new Date(this.cache.fetchedAt).toISOString(), data: body });
    } catch (error) {
      return this.staleOrError(error instanceof DOMException && error.name === "AbortError" ? "upstream_timeout" : "upstream_unavailable", "Não foi possível obter dados do fornecedor.");
    } finally { clearTimeout(timeout); }
  }

  private staleOrError(code: string, message: string): Response {
    if (this.cache) return this.respond(200, { provider: "fogos", state: "stale", fetchedAt: new Date(this.cache.fetchedAt).toISOString(), data: this.cache.body, error: { code, message } });
    return this.respond(502, failure(code, message));
  }

  private respond(status: number, body: BrokerResponse): Response { return jsonResponse(status, body, this.config.allowedOrigin); }
}

function failure(code: string, message: string): BrokerResponse { return { provider: "fogos", state: code === "configuration_required" ? "configuration-required" : "unavailable", error: { code, message } }; }

function retryAfterSeconds(value: string | null): number {
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(86_400, Math.max(1, Math.ceil(seconds)));
  const date = value ? Date.parse(value) : NaN;
  return Number.isFinite(date) ? Math.min(86_400, Math.max(1, Math.ceil((date - Date.now()) / 1000))) : 60;
}

async function boundedText(response: Response, maxBytes: number): Promise<string> {
  const length = Number(response.headers.get("content-length"));
  if (Number.isFinite(length) && length > maxBytes) throw new Error("response_too_large");
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.byteLength > maxBytes) throw new Error("response_too_large");
  return new TextDecoder().decode(bytes);
}
