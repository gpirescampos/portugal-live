# Milestone 0 provider validation

## Implemented air-quality layer

The QualAr-facing map layer uses the EEA E2a feed for measurements reported by
Portugal. The source, observed freshness and attribution are documented in the
[provenance register](provenance.md); E2a values are unverified and may be
revised.

## Implemented marine observation layer

- [Instituto Hidrográfico tide gauges](provenance.md): active
  station locations and latest L1 near-real-time heights above Portugal's
  hydrographic zero (ZH). L1 values have no quality control and are not tide
  predictions or flood warnings. The collection is licensed CC BY-NC 4.0; the
  layer must only be used in a non-commercial context unless IH grants other
  terms.

## Implemented camera layer

- [NetMadeira cameras](cameras.md): 28 curated Madeira locations with
  individual operator-page links. The documented thumbnail iframe currently
  returns a disabled-image placeholder, so the UI does not render an empty
  video player. The official pages expose signed still-image URLs, but these
  are not currently integrated in the app.
- [MEO Beachcam](cameras.md): 185
  named locations from the official index, each linking to its own operator
  page. The layer does not assume every listed page has a working embed.
- [MeteoEstrela webcams](cameras.md#meteoestrela-webcams): ten weather views
  at five mapped sites. Selected sites show a refreshed image; the other views
  remain available on the operator page.
- [Porto de Lisboa cameras](cameras.md#porto-de-lisboa-embedded-live-views): the
  VTS/Algés camera uses the YouTube player the user confirmed working;
  Cacilhas remains link-only because its player did not work in the app.
- [Clube Naval de Santa Maria camera](cameras.md#clube-naval-de-santa-maria-embedded-player): one
  approximate Azores location with the club-linked player page embedded on
  selection; feed state and additional reuse terms remain unverified.
- [Madeira-Web cameras](cameras.md#madeira-web--30-fixed-camera-pages): 30
  fixed Madeira locations; four pages publish YouTube embeds used in the app,
  and the remaining cameras link to their individual operator pages.
- [Via Verde / Brisa cameras](cameras.md#via-verde--brisa--100-highway-camera-locations):
  100 located highway cameras from a broker-fetched catalogue; markers link to
  the official traffic page because sampled image freshness could not be verified.
- [VR1 Madeira](cameras.md#vr1-madeira--71-road-camera-locations): 71
  operator-located road cameras; sampled image endpoints returned 403, so markers
  link to the operator map.
- [Município do Funchal webcams](cameras.md#município-do-funchal--three-listed-views):
  three municipal views; the current endpoints return an SVG fallback, so markers
  link to the municipal page.

The SNIRH plan remains a candidate until its measurement contract is confirmed.

Validation date: 2026-09-22. Commands used live HTTP requests but never print credentials or response bodies containing secrets. The response fixtures under `tests/fixtures/providers/` are synthetic, sanitized shape fixtures; they are not redistributed provider payloads.

## Decision summary

| Provider | Result | Browser-direct? | MVP decision |
|---|---|---:|---|
| IPMA warnings | Verified: 215-record JSON array; permissive CORS observed | Yes | Direct adapter, 10-minute refresh |
| IPMA seismic 3/7 | Verified: JSON envelope with 76/182 records; permissive CORS observed | Yes | Direct adapter, hourly refresh |
| OpenSky | OAuth verified; national wide box returned 145 states and consumed 3 credits; separate region queries work | No (foreign Origin is not allowed) | Broker, quota-aware schedule |
| NASA FIRMS | MAP_KEY and NOAA-20 CSV schema verified; app uses three Portugal regional requests with per-region caching | Not suitable for key safety | Broker, 30-minute cache, trailing-24-hour detections |
| Fogos.pt | Key present and required user agent sent, but endpoint returned HTTP 429 / Cloudflare 1015 with `Retry-After` | Not suitable for key safety or reliable public direct use | Broker; access remains rate-limited pending provider confirmation |

## Reproducibility

- IPMA warnings: `GET https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json`, Origin `http://localhost:5173`.
- IPMA seismic: `GET https://api.ipma.pt/open-data/observation/seismic/{3,7}.json`, same Origin.
- OpenSky token: OAuth2 client credentials against `https://auth.opensky-network.org/.../token`; token was not persisted in the repository. Wide query: `lamin=32.0&lomin=-31.5&lamax=42.2&lomax=-6.0`.
- OpenSky regional comparison: mainland `36.7,-9.7,42.2,-6.0`; Madeira `32.3,-17.5,33.2,-16.2`; Azores `36.8,-31.5,39.8,-24.5`.
- FIRMS: VIIRS NOAA-20 NRT; mainland, Madeira, and Azores bounding boxes; API day range 2 followed by a trailing-24-hour filter.
- Fogos.pt: `GET https://api.fogos.pt/v2/incidents/active?geojson=1` with `X-API-Key` and `User-Agent: PortugalLive/0.1 (+https://github.com/gpirescampos/portugal-live)`.

## Open validation items

- Fogos.pt must confirm that the issued key is authorized for the selected endpoint and that the observed 1015 response is not a per-IP cooldown or access-policy mismatch.
- OpenSky's wide box is cheaper than three tested regional requests for the observed response, but includes a large Atlantic/Iberian area. Final selection should use measured payload size and the intended Portugal boundary filter.
- The Azores OpenSky query succeeded with an empty state set; this is valid no-observation coverage, not a source error.
- IPMA warnings provide `idAreaAviso` but no warning polygons. Obtain and license an official mapping before rendering filled areas; otherwise use explicitly approximate representative points.
- Verify current attribution/terms immediately before public deployment.

The dated live checks, observed evidence, and unresolved provider questions
are recorded in [the provenance register](provenance.md).

## Live follow-up — 2026-09-23

The milestone-0 observations above are historical. The current dated outcomes,
including the successful Fogos.pt reachability check that supersedes its prior
429 observation, are recorded in [the provenance register](provenance.md).
OpenSky returned 143 wide-envelope states in the latest browser snapshot (79 in
the mainland rectangle, 2 Madeira, 1 Açores, 58 elsewhere in the envelope).
The bounded coastal sample returned 13 vectors in its 5.2-square-degree box.
NASA FIRMS returned 57 mainland detections with valid empty Madeira/Açores
regions.
IPMA remained partial (261 seismic events; 11 current/upcoming warnings).
Fogos.pt returned 39 incidents, but live validation is blocked pending written
endpoint/quota approval. Its selected incident details were not inspected.
