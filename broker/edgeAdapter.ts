import { createBrokerApplication, type BrokerRouteTable } from './application.ts';
import { DEFAULT_BROKER_ORIGIN } from './http.ts';

/**
 * Runtime-neutral adapter proof: edge platforms can expose this Fetch handler
 * directly. Provider instances and secrets remain injected by the chosen host.
 */
export function createEdgeAdapter(routes: BrokerRouteTable, allowedOrigin = DEFAULT_BROKER_ORIGIN): { fetch(request: Request): Promise<Response> } {
  return { fetch: createBrokerApplication(routes, allowedOrigin) };
}
