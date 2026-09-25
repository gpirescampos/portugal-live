import type { BrokerResponse } from './contract.ts';
import { DEFAULT_BROKER_ORIGIN, jsonResponse } from './http.ts';

export interface RequestHandler { handle(request: Request): Promise<Response>; }
export type BrokerRouteTable = Readonly<Record<string, RequestHandler>>;

/** Fetch-standard routing shared by the local Node host and edge adapters. */
export function createBrokerApplication(routes: BrokerRouteTable, allowedOrigin = DEFAULT_BROKER_ORIGIN): (request: Request) => Promise<Response> {
  return async (request) => {
    const path = new URL(request.url).pathname;
    const route = routes[path];
    if (!route) return jsonResponse(404, { provider: 'broker', state: 'unavailable', error: { code: 'not_found', message: 'Rota não encontrada.' } }, allowedOrigin);
    try {
      return await route.handle(request);
    } catch {
      const failure: BrokerResponse = { provider: 'broker', state: 'unavailable', error: { code: 'internal', message: 'O broker não conseguiu processar o pedido.' } };
      return jsonResponse(500, failure, allowedOrigin);
    }
  };
}
