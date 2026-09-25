# IPMA validation note

Validated 2026-09-22 from the public IPMA API.

### Live follow-up — 2026-09-23

Both seismic endpoints and both warning/area endpoints returned HTTP 200. In
this sample, area 3 had 70 valid events and none rejected; area 7 had 191 valid
events and 5 rejected from 196 source rows. Both envelopes reported
`updateDate=2026-09-23T08:36:01Z`; the browser showed 261 events and `PARCIAL`.
The warning feed had 213 rows: 11 visible warnings (9 active, 2 upcoming), 2
rejected records, with valid green/no-warning and expired rows omitted by
design. The browser showed the representative-point caveat and refreshed the
warning layer while the local broker was stopped. Selected details were also
checked: a warning showed phenomenon, level, validity, area, and end time; a
seismic event showed magnitude, depth, event time, and region. The event's age
matched its own date rather than the envelope update time. No source payload
was saved. The selected warning was a yellow `Tempo Quente` alert for Bragança,
in force through 24/09/2026 18:00.

## Warnings

Endpoint: `https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json`.

Observed response: HTTP 200, JSON array, 215 records at validation time. First-record keys were `text`, `awarenessTypeName`, `idAreaAviso`, `startTime`, `awarenessLevelID`, and `endTime`. The response included `Access-Control-Allow-Origin: *`, `ETag`, and `Last-Modified` headers.

Adapter decision: direct browser fetch with conditional requests where supported. Normalize validity intervals and severity. Do not assume the feed is always an object or always excludes green records; validate both count and fields.

Area lookup: `https://api.ipma.pt/open-data/distrits-islands.json` is also
browser-accessible and supplies `idAreaAviso`, representative latitude and
longitude, and local names. The warning feed does not include authoritative
warning polygons, so the first implementation renders these as explicitly
labelled representative points. Polygon support remains available in the
renderer for a future validated geometry source; no polygon is inferred from
the point.

Rendering contract: warning records with authoritative polygon geometry are
rendered as translucent Cesium areas with a thin severity-coloured outline.
The renderer accepts `Polygon` and `MultiPolygon` records and never creates a
polygon from a representative point. Severity values map to green, yellow,
orange, and red bands; unknown values remain subdued and are still labelled as
unknown in the normalized record. Overlapping warning records remain separate
entities so different phenomena are not silently merged.

## Seismicity

Endpoints: `/open-data/observation/seismic/3.json` (Azores) and `/7.json` (mainland/Madeira).

Portugal Live retains every valid event returned by the feed (normally up to
the provider's rolling history window). It does not treat an old event as a
current observation: marker size encodes magnitude, while a single-hue opacity
scale encodes event age (0–6 hours, 6–24 hours, 1–7 days, and 7–30 days).
Feed freshness (`updateDate`) is tracked separately from event age and is shown
in provider status rather than encoded as event age.

Observed responses: HTTP 200 JSON envelopes. Area 3 contained 76 records; area 7 contained 182 records. Envelope keys were `idArea`, `country`, `lastSismicActivityDate`, `updateDate`, `owner`, and `data`. Event keys included `sismoId`, `time`, `lat`, `lon`, `magnitud`, `depth`, `magType`, `obsRegion`, and `dataUpdate`.

Adapter decision: direct browser fetch hourly. Reject sentinel magnitudes such as `-99.0`, invalid coordinates, and malformed timestamps. Use a deterministic hash when `sismoId` is blank.

Attribution: cite IPMA, link the endpoint/source, and re-check the API's current reuse conditions before public release. The API page requests notification of intended use.
