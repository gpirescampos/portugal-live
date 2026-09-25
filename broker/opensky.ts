import { OPENSKY_PATH, OPENSKY_UPSTREAM, type BrokerResponse } from "./contract.ts";
import { allowedOriginFromEnv, corsHeaders, jsonResponse } from './http.ts';

export interface OpenSkyConfig {
  clientId?: string;
  clientSecret?: string;
  credentialsFile?: string;
  upstreamUrl: string;
  tokenUrl: string;
  lamin: number; lomin: number; lamax: number; lomax: number;
  cacheTtlMs: number; timeoutMs: number; maxBodyBytes: number;
  allowedOrigin?: string;
}
export interface BrokerFetch { (input: string | URL, init?: RequestInit): Promise<Response>; }
interface CacheEntry { body: unknown; fetchedAt: number; quotaRemaining?: string; }
interface TokenEntry { value: string; expiresAt: number; }
const TOKEN_URL = "https://auth.opensky-network.org/auth/realms/opensky-network/protocol/openid-connect/token";
export function configFromEnv(
  env: Record<string, string | undefined> = process.env,
  fileCredentials: { clientId?: string; clientSecret?: string } = {},
): OpenSkyConfig {
  const path = env.OPENSKY_CREDENTIALS_FILE || ".secrets/opensky-credentials.json";
  return {
    clientId: env.OPENSKY_CLIENT_ID?.trim() || fileCredentials.clientId?.trim(),
    clientSecret: env.OPENSKY_CLIENT_SECRET?.trim() || fileCredentials.clientSecret?.trim(),
    credentialsFile: path, upstreamUrl: OPENSKY_UPSTREAM, tokenUrl: env.OPENSKY_TOKEN_URL?.trim() || TOKEN_URL,
    lamin: number(env.OPENSKY_LAMIN, 32, -90, 90), lomin: number(env.OPENSKY_LOMIN, -31.5, -180, 180),
    lamax: number(env.OPENSKY_LAMAX, 42.2, -90, 90), lomax: number(env.OPENSKY_LOMAX, -6, -180, 180),
    cacheTtlMs: number(env.OPENSKY_CACHE_TTL_MS, 90_000, 10_000, 900_000),
    timeoutMs: number(env.OPENSKY_TIMEOUT_MS, 8_000, 500, 30_000), maxBodyBytes: number(env.OPENSKY_MAX_BODY_BYTES, 5_000_000, 16_384, 20_000_000),
    allowedOrigin: allowedOriginFromEnv(env),
  };
}
function number(value: string | undefined, fallback: number, min: number, max: number): number { const n = Number(value); return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback; }

export class OpenSkyBroker {
  private readonly config: OpenSkyConfig;
  private readonly fetcher: BrokerFetch;
  private cache?: CacheEntry; private token?: TokenEntry; private cooldownUntil = 0; private inFlight?: Promise<Response>;
  constructor(config: OpenSkyConfig, fetcher: BrokerFetch = fetch) { this.config = config; this.fetcher = fetcher; }
  async handle(request: Request): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname !== OPENSKY_PATH) return json(404, failure("not_found", "Rota não encontrada."));
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders(this.config.allowedOrigin) });
    if (request.method !== "GET") return this.respond(405, failure("method_not_allowed", "Método não suportado."));
    if (!this.config.clientId || !this.config.clientSecret) return this.respond(503, failure("configuration_required", "O fornecedor OpenSky não está configurado."));
    const now = Date.now();
    if (this.cooldownUntil > now) {
      const retryAfterSeconds = Math.ceil((this.cooldownUntil - now) / 1000);
      if (this.cache) return this.snapshot("stale", retryAfterSeconds, "upstream_rate_limited");
      return this.respond(429, { provider: "opensky", state: "rate-limited", retryAfterSeconds, error: { code: "upstream_rate_limited", message: "O fornecedor está temporariamente limitado." } });
    }
    if (this.cache && now - this.cache.fetchedAt < this.config.cacheTtlMs) return this.snapshot("live");
    // Each caller needs an independently consumable response body while
    // sharing the same upstream request.
    if (this.inFlight) return this.inFlight.then((response) => response.clone());
    this.inFlight = this.fetchUpstream();
    try { return await this.inFlight; } finally { this.inFlight = undefined; }
  }
  private async fetchUpstream(): Promise<Response> {
    const controller = new AbortController(); const timeout = setTimeout(() => controller.abort(), this.config.timeoutMs);
    try {
      const token = await this.accessToken(controller.signal);
      const query = new URLSearchParams({ lamin: String(this.config.lamin), lomin: String(this.config.lomin), lamax: String(this.config.lamax), lomax: String(this.config.lomax) });
      const response = await this.fetcher(`${this.config.upstreamUrl}?${query}`, { signal: controller.signal, headers: { Accept: "application/json", Authorization: `Bearer ${token}` } });
      if (response.status === 429 || response.status === 403) { const retry = retryAfterSeconds(response.headers.get("retry-after")); this.cooldownUntil = Date.now() + retry * 1000; return this.cache ? this.snapshot("stale", retry, "upstream_rate_limited") : this.respond(429, { provider: "opensky", state: "rate-limited", retryAfterSeconds: retry, error: { code: "upstream_rate_limited", message: "O fornecedor está temporariamente limitado." } }); }
      if (!response.ok) return this.staleOrError("upstream_unavailable", "Não foi possível obter dados do fornecedor.");
      const body = JSON.parse(await boundedText(response, this.config.maxBodyBytes));
      if (!body || typeof body !== "object" || !("states" in body)) return this.staleOrError("invalid_response", "O fornecedor devolveu uma resposta inválida.");
      const quotaRemaining = response.headers.get("x-rate-limit-remaining");
      this.cache = {
        body,
        fetchedAt: Date.now(),
        ...(quotaRemaining && /^\d+$/.test(quotaRemaining) ? { quotaRemaining } : {}),
      };
      return this.snapshot("live");
    } catch (error) { return this.staleOrError(error instanceof DOMException && error.name === "AbortError" ? "upstream_timeout" : "upstream_unavailable", "Não foi possível obter dados do fornecedor."); }
    finally { clearTimeout(timeout); }
  }
  private async accessToken(signal: AbortSignal): Promise<string> {
    if (this.token && this.token.expiresAt > Date.now() + 30_000) return this.token.value;
    const response = await this.fetcher(this.config.tokenUrl, { method: "POST", signal, headers: { Accept: "application/json", "content-type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ grant_type: "client_credentials", client_id: this.config.clientId!, client_secret: this.config.clientSecret! }) });
    if (!response.ok) throw new Error("token_unavailable");
    const body = await response.json() as { access_token?: string; expires_in?: number };
    if (!body.access_token) throw new Error("token_invalid");
    this.token = { value: body.access_token, expiresAt: Date.now() + Math.max(60, Number(body.expires_in) || 900) * 1000 }; return body.access_token;
  }
  private snapshot(state: "live" | "stale", retryAfterSeconds?: number, code?: string): Response {
    const body: BrokerResponse = {
      provider: "opensky", state, fetchedAt: new Date(this.cache!.fetchedAt).toISOString(), data: this.cache!.body,
      ...(retryAfterSeconds ? { retryAfterSeconds } : {}),
      ...(code ? { error: { code, message: "A mostrar o último retrato disponível." } } : {}),
    };
    const response = this.respond(200, body);
    if (this.cache!.quotaRemaining !== undefined) {
      response.headers.set("x-rate-limit-remaining", this.cache!.quotaRemaining);
      response.headers.set("access-control-expose-headers", "x-rate-limit-remaining");
    }
    return response;
  }
  private staleOrError(code: string, message: string): Response { return this.cache ? this.snapshot("stale", undefined, code) : this.respond(502, failure(code, message)); }
  private respond(status: number, body: BrokerResponse): Response { return jsonResponse(status, body, this.config.allowedOrigin); }
}
function failure(code: string, message: string): BrokerResponse { return { provider: "opensky", state: code === "configuration_required" ? "configuration-required" : "unavailable", error: { code, message } }; }
function retryAfterSeconds(value: string | null): number { const n = Number(value); if (Number.isFinite(n) && n >= 0) return Math.min(86_400, Math.max(1, Math.ceil(n))); const d = value ? Date.parse(value) : NaN; return Number.isFinite(d) ? Math.min(86_400, Math.max(1, Math.ceil((d - Date.now()) / 1000))) : 60; }
async function boundedText(response: Response, max: number): Promise<string> { const length = Number(response.headers.get("content-length")); if (Number.isFinite(length) && length > max) throw new Error("response_too_large"); const bytes = new Uint8Array(await response.arrayBuffer()); if (bytes.byteLength > max) throw new Error("response_too_large"); return new TextDecoder().decode(bytes); }
