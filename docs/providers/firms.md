# NASA FIRMS thermal detections

## Product meaning

FIRMS positions are satellite-observed thermal anomalies. They are not verified fire incidents and must not be merged with Fogos.pt operational incidents. Their shared dataset marker uses the filled Phosphor Sun icon. Marker hue represents FIRMS confidence; size represents Fire Radiative Power (FRP) in MW. The icon identifies a thermal detection and does not indicate a confirmed fire. See [dataset marker rendering](../rendering.md) for the shared icon and selection behavior.

The source is NASA FIRMS VIIRS NOAA-20 NRT (`VIIRS_NOAA20_NRT`). Other sensors are deferred until their availability and transaction cost are measured.

## Access and request policy

- The MAP_KEY is broker-only (`FIRMS_MAP_KEY` in `.env.broker.local`). It is never accepted from the browser, returned to the browser, or written to logs.
- Broker route: `GET /api/providers/firms/detections`.
- Upstream interface: `GET https://firms.modaps.eosdis.nasa.gov/api/area/csv/{MAP_KEY}/VIIRS_NOAA20_NRT/{west,south,east,north}/2`.
- Three fixed, sequential areas cover mainland Portugal, Madeira, and the Azores. The broker does not accept arbitrary areas or sensors from a client.
- These requests use rectangular bounding boxes, not a Portuguese land polygon. Edge/ocean or nearby Spanish detections can therefore be returned; the UI must continue to label the product as satellite thermal detections rather than Portugal-only confirmed incidents. Exact territorial clipping is a separate validation task.
- Broker cache: 30 minutes per region. A refresh performs at most three upstream area requests. Successful region responses are retained if another region fails; last-good region data is marked stale on fallback.
- The `2` day request range spans UTC day boundaries. The adapter then retains only acquisitions in the trailing 24 hours.
- The scheduler pauses and resumes according to the shared visibility lifecycle.

NASA states that the Area API returns CSV, accepts a bounding box in west,south,east,north order, allows day ranges 1–5, and has a MAP_KEY limit of 5,000 transactions per 10-minute interval; larger queries may count as multiple transactions. The app uses three small area requests rather than a broad Portugal-plus-Atlantic rectangle. Transaction usage should still be checked through NASA's map-key status tool during operational validation. [NASA FIRMS Area API](https://firms.modaps.eosdis.nasa.gov/api/area/) · [NASA FIRMS API use and transaction examples](https://firms.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html).

## Normalized records

The parser preserves latitude/longitude, acquisition time (parsed as UTC), satellite, instrument, confidence, FRP, brightness temperatures, scan/track, day/night, source version, and region. Stable namespaced IDs use satellite, instrument, acquisition time, rounded coordinates, scan, and track. Identical observations across overlapping regions deduplicate; nearby detections remain separate.

Only valid records with acquisition times from the trailing 24 hours through a five-minute clock-skew allowance are retained. Malformed rows are rejected without discarding good rows. A non-CSV/error page fails the region. Partial regional results remain usable and the dataset status reports partial or stale data explicitly.

Records use `kind: thermal-detection`, `quality: satellite-detected`, source acquisition time, brokered provenance, NASA attribution, and a coverage note explaining that thermal anomalies alone do not confirm fires.

## Presentation

- Layer: **Deteções térmicas**.
- Confidence hues: low (purple), nominal (magenta), high (coral).
- Marker size grows with FRP; it does not represent incident severity or a confirmed fire size.
- Selected detail: acquisition time, satellite, instrument, confidence, FRP, I4 brightness temperature when present, region, coordinates, and NASA FIRMS provenance.
- Legend is visible only while the layer is enabled and describes the confidence colors, size encoding, and limitation.
- All user-facing text is PT-PT. Markers and details remain separate from Fogos.pt records.

## Validation and tests

### Live follow-up — 2026-09-23

The live broker returned HTTP 200 for all three regions using
`VIIRS_NOAA20_NRT`. Mainland produced 57 accepted rows and no rejected rows;
Madeira and Açores returned valid empty CSVs. The newest acquisition was
`2026-09-23T03:28:00Z`, roughly 6h50m before the regional fetch around
10:17:33Z; the oldest retained observation was `2026-09-22T13:27:00Z`. NASA's
MAP_KEY status interface returned HTTP 200 and showed 12 of 5,000 transactions
in the 10-minute window after the first route sample. A later controlled
three-region refresh started from a 0-counter baseline and used 12
transactions. A repeat broker read between those refreshes was served from the
30-minute cache. The UI showed 57 detections and the thermal-anomaly caveat;
selected detail showed VIIRS NOAA-20, nominal confidence, FRP 9.8 MW, I4
brightness temperature 347.2 K, mainland region, and acquisition time. No live
CSV was retained. The official [NASA FIRMS WFS map layer](https://firms.modaps.eosdis.nasa.gov/mapserver/wfs-info/)
returned 69 mainland NOAA-20 detections in a separate check. One source record
matched the selected UI detail after converting its Lisbon display time
04:28 to UTC 03:28: confidence `n` (nominal), brightness 347.2 K, and FRP
9.8 MW. NASA says the WFS data refreshes every 15 minutes; the comparison
does not imply simultaneous snapshots.

Offline tests cover CSV/quoted values, UTC timestamp parsing, 24-hour filtering, stable IDs/deduplication, malformed rows, response-size and non-CSV failures, broker key handling, caching, partial/stale regional state, and visual mapping. Live API requests are not required by the automated suite.

NASA's general data-use guidance asks users to acknowledge NASA as the source where applicable. The visible attribution is “NASA FIRMS” and links to the FIRMS map; launch review should confirm whether a more specific product citation is required for the deployment context. [NASA data-use guidance](https://www.earthdata.nasa.gov/engage/open-data-services-software/data-use-policy) · [FIRMS example acknowledgement](https://www.earthdata.nasa.gov/es/news/feature-articles/nasa-firms-helps-fight-wildland-fires-near-real-time).
