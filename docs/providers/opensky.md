# OpenSky aircraft provider

Validated 2026-09-22 using the ignored credentials file without printing its values.

### Live follow-up — 2026-09-23

The browser received two successful wide-box snapshots (123, then 132
aircraft); a direct bounded check then returned HTTP 200 with 126 states at
`2026-09-23T10:26:56Z`, in 192 ms and 16,356 response bytes. OAuth returned
HTTP 200. The upstream quota header reported 3,976 remaining credits; this
direct call does not establish how much of the change from the older baseline
was consumed by this session. Three more direct bounded reads, separated by
about the configured 90-second cadence, returned 139, 140, and 140 states at
`10:36:28Z`, `10:38:11Z`, and `10:40:08Z`; each measured request reduced the
remaining-credit header by 3, to 3,967. Between the first two, 134 IDs were
present in both successful responses, 6 appeared, and 5 were absent in the
second response. Three anonymized matched records had fixes 0–1 seconds old,
both barometric and geometric altitude present, displacement about 22.9–25.2
km, heading changes about -0.1–14.4 degrees (normalized across north), and
speed changes -0.3 to -3.9 m/s. Raw IDs and coordinates were not retained.
At three credits every 90 seconds, continuous uncached polling projects to
about 2,880 credits/day. Current [OpenSky documentation](https://openskynetwork.github.io/opensky-api/rest.html#limitations)
lists 4,000 credits per day for a standard user, 8,000 daily for an active
feeder, and 14,400 per hour for a licensed user. The 2,880 estimate fits
within the standard daily bucket only if other `/states/*` use leaves those
credits available; the account tier and shared usage were not independently
confirmed. The API docs price a `/states/all` box of at most 25 square degrees
at one credit.

In the final wide snapshot, the documented regional rectangles contained 79
mainland, 2 Madeira, and 1 Açores state vectors; 58 were outside those three
rectangles but still within the wide envelope. These rectangles are sampling
boxes, not guarantees of airspace coverage. The broker now forwards only a numeric
`X-Rate-Limit-Remaining` value and exposes that header through CORS; a focused
synthetic test covers live and cached responses and confirms unrelated
upstream headers are discarded. Synthetic failure checks also confirm that a
429 cooldown keeps the cached state vectors marked stale and retains the retry
delay; an OAuth rejection does not reach the states endpoint. After restart, the browser-origin response
returned HTTP 200 with 3,964 remaining and exposed only that header. Two
selected aircraft details had missing altitude/speed/heading; the UI showed
`—` and retained callsign, origin, source, and observation time. An
individually bounded coastal edge query at 35.7–37.0°N, 10.0–6.0°W returned
HTTP 200, 13 vectors, all positioned inside the requested box, in 348 ms at
10:58:19Z. Its area is 5.2 square degrees. The exposed balance was 3,957;
compared with the earlier 3,964 reading, the seven-credit difference cannot
be attributed solely to this one-credit box because no isolated before/after
measurement was taken. The UI still labels coverage non-exhaustive.

OAuth token exchange succeeded with HTTP 200. The returned token was confirmed present, with `expires_in=1800`; the token itself was not logged or stored in the repository.

## Coverage measurements

- Wide national envelope `32.0,-31.5,42.2,-6.0`: HTTP 200, 145 states, `X-Rate-Limit-Remaining: 3997` from a 4000-credit starting bucket. This consumed 3 credits, consistent with the documented area-cost bands.
- Mainland `36.7,-9.7,42.2,-6.0`: HTTP 200, 84 states, remaining 3994 in a separate measurement run.
- Madeira `32.3,-17.5,33.2,-16.2`: HTTP 200, 2 states, remaining 3993.
- Azores `36.8,-31.5,39.8,-24.5`: HTTP 200 with `states: null`, remaining 3991; treat this as a valid empty snapshot.

The wide query is operationally cheaper than three one-credit regional requests but contains irrelevant area. The broker starts with the measured national envelope, a 90-second refresh, bounded in-memory caching, and explicit quota review.

## Browser and broker boundary

Portugal Live accesses OpenSky through the local Node broker at `/api/providers/opensky/states`. A request with a foreign Origin returned `Access-Control-Allow-Origin: https://opensky-network.org`, so the browser cannot consume it directly from Portugal Live. OAuth credentials also require the broker.

- Credentials: `.secrets/opensky-credentials.json` or broker-only environment variables.
- Fixed query: `lamin=32`, `lomin=-31.5`, `lamax=42.2`, `lomax=-6`, including mainland Portugal and the Atlantic territories.
- The broker owns token refresh, cache, quota headers, retry handling, and stale snapshots.
- The browser never receives OAuth credentials.

Aircraft use stable `opensky:<icao24>` IDs, preserve source snapshot/fix times, and map the 18-field state-vector arrays with fixture tests. The renderer uses a heading-aware top-down aircraft billboard, short in-session breadcrumb trails sampled between provider snapshots, and bounded 120-second dead reckoning after the latest observation, aligned with the 90-second refresh interval. If a source timestamp is older than that prediction horizon, the renderer holds the last position until the next snapshot instead of blinking the aircraft out; the next provider response remains authoritative for removing aircraft. Predicted positions are presentation estimates and are never treated as new observations. The selected aircraft uses the shared pink marker highlight and enlarged scale; following the camera remains intentionally unavailable in the current UI. See [dataset marker rendering](../rendering.md) for the shared icon and selection behavior.

Quality remains `observed`; missing aircraft are not treated as resolved incidents. A `states: null` response is a valid empty snapshot, while malformed or unavailable responses are errors. Attribution is shown as OpenSky Network with the source and terms linked in the aircraft legend and selected-aircraft detail.

The provider is considered unavailable when the broker has no credentials, is rate-limited, or cannot obtain a valid state-vector response. These states must not be represented as zero traffic.
