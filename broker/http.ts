import type { BrokerResponse } from './contract.ts';

export const DEFAULT_BROKER_ORIGIN = 'http://localhost:4173';

/** Resolve a single browser origin; never emit a wildcard CORS response. */
export function allowedOriginFromEnv(env: Record<string, string | undefined>): string {
  const configured = env.BROKER_ALLOWED_ORIGIN?.trim();
  if (!configured || configured === '*') return DEFAULT_BROKER_ORIGIN;
  try {
    const parsed = new URL(configured);
    return parsed.origin === configured && (parsed.protocol === 'http:' || parsed.protocol === 'https:')
      ? parsed.origin
      : DEFAULT_BROKER_ORIGIN;
  } catch {
    return DEFAULT_BROKER_ORIGIN;
  }
}

export function corsHeaders(allowedOrigin = DEFAULT_BROKER_ORIGIN): Headers {
  return new Headers({
    'access-control-allow-origin': allowedOrigin,
    'access-control-allow-methods': 'GET, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'vary': 'Origin',
  });
}

export function jsonResponse(status: number, body: BrokerResponse, allowedOrigin = DEFAULT_BROKER_ORIGIN): Response {
  const headers = corsHeaders(allowedOrigin);
  headers.set('content-type', 'application/json; charset=utf-8');
  headers.set('cache-control', 'no-store');
  if (typeof body.retryAfterSeconds === 'number') headers.set('retry-after', String(body.retryAfterSeconds));
  return new Response(JSON.stringify(body), { status, headers });
}
