# Data sources and attribution

Portugal Live's MIT license covers project code and documentation. It does not
license provider data, camera media, map tiles, or trademarks. The table is a
quick guide to what the app uses; it is not a replacement for each provider's
terms. See the [dated provenance register](docs/providers/provenance.md) and
[camera notes](docs/providers/cameras.md) for source links, attribution,
freshness, and unresolved questions.

| Source | Used for | Access in this app | Documented reuse boundary |
| --- | --- | --- | --- |
| IPMA | Seismic observations, weather warnings, area metadata | Browser, no key | Attribute IPMA; recheck API conditions and notify IPMA of intended use before a public service. Warnings have representative points, not official polygons. |
| Instituto Hidrográfico | L1 near-real-time tide-gauge observations | Browser, no key | CC BY-NC 4.0 and DOI requirements; commercial use needs separate permission. Raw L1 heights are not tide predictions or flood warnings. |
| European Environment Agency E2a | Air-quality measurements reported by Portugal | Broker, no key | CC BY 4.0; values are provisional and may be revised. |
| OpenSky Network | Aircraft positions | Broker, OAuth credentials | Attribute OpenSky; non-commercial terms and quotas apply. Positions between fixes are estimates. |
| Fogos.pt | Active wildfire incidents | Broker, API key | Written confirmation of endpoint access and quota is still pending; do not treat an available endpoint as approval. |
| NASA FIRMS | Satellite thermal detections | Broker, MAP_KEY | Attribute NASA FIRMS; confirm product-specific citation for a public service. Detections do not confirm fires. |
| Camera operators | Mapped camera locations and source links; selected operator-provided players or images | Mostly curated locations; Via Verde catalogue through broker | Attribution and permitted media mode vary by operator. MEO Beachcam and VR1 Madeira markers link to the operator's site and do not play their media here. See [camera notes](docs/providers/cameras.md). |
| Natural Earth | Portugal–Spain border display aid | Bundled GeoJSON | [Public-domain source](https://www.naturalearthdata.com/about/terms-of-use/); see the [asset note](public/data/README.md). |
| OpenStreetMap / Cesium ion | Map imagery | Browser; ion token optional | Their own service and attribution conditions apply. The ion token is browser-visible and must be restricted. |

The fixtures under `tests/fixtures/providers/` are synthetic, sanitized test
data rather than saved live provider responses. This repository does not bundle
camera video, still frames, or live provider snapshots. Before adding a new
source, document its access path, attribution, refresh behavior, and reuse
conditions in the provenance register.
