# Portugal Live

Portugal Live is a local-first, frontend-first map for exploring Portuguese
public-interest signals. The current MVP combines IPMA seismic observations
and weather warnings, Fogos.pt operational wildfire incidents, OpenSky aircraft
positions, NASA FIRMS satellite thermal detections, Instituto Hidrográfico tide
gauges, EEA air-quality observations, and public-camera locations.

The idea was inspired by [God's Eye View](https://github.com/bilawalsidhu/gods-eye-view)
and developed around Portuguese sources and a pt-PT interface.

The visual interface is in European Portuguese (pt-PT). Each dataset is an
independent layer; its source, acquisition/observation time, and limitations
must remain visible. FIRMS thermal anomalies are not confirmed fires, and
aircraft movement between ADS-B observations is estimated.

## Run locally

Requirements: Node.js `>=24 <27`.

1. Run `npm ci` to install the versions in `package-lock.json`.
2. Run `npm run broker:dev` in one terminal.
3. Run `npm run dev` in another and open the Vite URL (normally
   `http://localhost:4173`).

No API key is needed to start. Without a Cesium ion token, the map uses
OpenStreetMap imagery. IPMA warnings and earthquakes and Instituto Hidrográfico
tide gauges can load directly in the browser. The EEA air-quality feed and
Via Verde camera catalogue use the local broker without provider keys.

For optional keyed layers, copy `.env.broker.example` to `.env.broker.local`
and add only the broker credentials you have. OpenSky credentials may also be
provided by the ignored `.secrets/opensky-credentials.json` file. To use
ion-hosted map assets, copy `.env.example` to `.env.local` and add a
URL-restricted Cesium ion token. Missing provider credentials affect their own
layers; they do not stop the map or other layers from working.

The frontend is static-capable; the local broker is a separate process. Never
put Fogos.pt, NASA FIRMS, or OpenSky credentials in `VITE_*` variables. Cesium
ion tokens used by the browser are public client configuration and should be
restricted through the Cesium account settings.

## Quality checks

```bash
npm test
npm run typecheck
npm run build
npm run check:client-secrets
```

GitHub Actions runs these checks for pushes and pull requests.

See [docs/operations.md](docs/operations.md) for configuration, provider
failure semantics, the desktop/mobile verification checklist, secret handling,
and the current static/edge portability boundary. The [data-source overview](DATA_SOURCES.md)
summarizes transport, credentials, and third-party terms; dated validation and
freshness evidence are in the [provider register](docs/providers/provenance.md).

## License and contributions

The project code and documentation are available under the [MIT License](LICENSE).
See [CONTRIBUTING.md](CONTRIBUTING.md) for development and pull request guidance.
See [SECURITY.md](SECURITY.md) for private vulnerability reporting.

The license does not grant rights to third-party data, camera imagery, streams,
provider APIs, Cesium ion assets, or trademarks. Each provider has its own access
and reuse conditions. The bundled Portugal–Spain border line is derived from
[Natural Earth public-domain data](https://www.naturalearthdata.com/about/terms-of-use/);
see [its asset note](public/data/README.md). Test fixtures are synthetic and
sanitized. Consult the [provider provenance register](docs/providers/provenance.md)
before enabling a source in a public deployment. In particular, Fogos.pt API
authorization and quota remain unconfirmed, and several camera feeds have
unverified reuse terms.

## Current scope

This repository is an MVP and local development project. It does not include
accounts, centralized history, a production deployment, or a deployed edge
broker. The Fetch-based edge adapter is a tested portability seam only; choose
and review a hosting runtime before deploying any broker credentials.
