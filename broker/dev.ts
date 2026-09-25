import { createServer, type IncomingHttpHeaders } from "node:http";
import { createBrokerApplication } from './application.ts';
import { configFromEnv, FogosBroker } from "./fogos.ts";
import { configFromEnv as openSkyConfigFromEnv } from './openskyNode.ts';
import { OpenSkyBroker } from "./opensky.ts";
import { configFromEnv as firmsConfigFromEnv, FirmsBroker } from "./firms.ts";
import { FIRMS_PATH, FOGOS_PATH, OPENSKY_PATH, QUALAR_PATH } from './contract.ts';
import { VIAVERDE_CAMERAS_PATH } from './contract.ts';
import { configFromEnv as viaVerdeCameraConfigFromEnv, ViaVerdeCamerasBroker } from './viaverdeCameras.ts';
import { allowedOriginFromEnv } from './http.ts';
import { qualArConfigFromEnv, QualArBroker } from './qualar.ts';

const port = Number(process.env.BROKER_PORT || 8787);
const broker = new FogosBroker(configFromEnv());
const openSky = new OpenSkyBroker(openSkyConfigFromEnv());
const firms = new FirmsBroker(firmsConfigFromEnv());
const viaVerdeCameras = new ViaVerdeCamerasBroker(viaVerdeCameraConfigFromEnv());
const qualAr = new QualArBroker(qualArConfigFromEnv());
const handleBrokerRequest = createBrokerApplication({
  [FOGOS_PATH]: broker,
  [OPENSKY_PATH]: openSky,
  [FIRMS_PATH]: firms,
  [VIAVERDE_CAMERAS_PATH]: viaVerdeCameras,
  [QUALAR_PATH]: qualAr,
}, allowedOriginFromEnv(process.env));

function requestHeaders(source: IncomingHttpHeaders): Headers {
  const headers = new Headers();
  for (const [name, value] of Object.entries(source)) {
    if (typeof value === 'string') headers.set(name, value);
    else if (Array.isArray(value)) headers.set(name, value.join(', '));
  }
  return headers;
}

const server = createServer((request, response) => {
  void (async () => {
    try {
      const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
      const req = new Request(url, { method: request.method, headers: requestHeaders(request.headers) });
      const result = await handleBrokerRequest(req);
      response.writeHead(result.status, Object.fromEntries(result.headers.entries()));
      response.end(Buffer.from(await result.arrayBuffer()));
    } catch {
      if (response.headersSent) { response.destroy(); return; }
      response.writeHead(500, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
      response.end(JSON.stringify({ provider: 'broker', state: 'unavailable', error: { code: 'internal', message: 'O broker não conseguiu processar o pedido.' } }));
    }
  })();
});
server.listen(port, "127.0.0.1", () => console.log(`Portugal Live broker listening on http://127.0.0.1:${port}`));
