import { createEdgeAdapter } from './edgeAdapter.ts';
import { FIRMS_PATH, FOGOS_PATH, OPENSKY_PATH, VIAVERDE_CAMERAS_PATH } from './contract.ts';
import { configFromEnv as fogosConfigFromEnv, FogosBroker } from './fogos.ts';
import { configFromEnv as firmsConfigFromEnv, FirmsBroker } from './firms.ts';
import { configFromEnv as openSkyConfigFromEnv, OpenSkyBroker } from './opensky.ts';
import { configFromEnv as viaVerdeCameraConfigFromEnv, ViaVerdeCamerasBroker } from './viaverdeCameras.ts';
import { allowedOriginFromEnv } from './http.ts';
import { qualArConfigFromEnv, QualArBroker } from './qualar.ts';
import { QUALAR_PATH } from './contract.ts';

/**
 * Create a standards-based edge Fetch handler from runtime bindings.
 * No Node APIs are imported here; credentials must be injected by the host.
 * This factory is a portability seam, not a deployment configuration.
 */
export function createEdgeBroker(
  bindings: Record<string, string | undefined>,
  fetcher: typeof fetch = fetch,
): { fetch(request: Request): Promise<Response> } {
  return createEdgeAdapter({
    [FOGOS_PATH]: new FogosBroker(fogosConfigFromEnv(bindings), fetcher),
    [OPENSKY_PATH]: new OpenSkyBroker(openSkyConfigFromEnv(bindings), fetcher),
    [FIRMS_PATH]: new FirmsBroker(firmsConfigFromEnv(bindings), fetcher),
    [VIAVERDE_CAMERAS_PATH]: new ViaVerdeCamerasBroker(viaVerdeCameraConfigFromEnv(bindings), fetcher),
    [QUALAR_PATH]: new QualArBroker(qualArConfigFromEnv(bindings), fetcher),
  }, allowedOriginFromEnv(bindings));
}
