# Fogos.pt validation note

Validated 2026-09-22 with the configured key and the required identifying user agent:

`PortugalLive/0.1 (+https://github.com/gpirescampos/portugal-live)`

### Live follow-up — 2026-09-23

The local broker now returned a usable active-incidents response and the UI
showed 39 incidents with source time 11:25 WEST. This supersedes the earlier
rate-limited observation as the latest reachability result. It does not prove
that Fogos.pt has approved this key for the endpoint or confirmed the allowed
quota/cooldown. Keep provider approval explicitly pending before production;
the broker-offline browser check correctly showed a network-failure state,
not a successful empty result. Live validation beyond reachability is blocked
pending written endpoint and quota approval; no incident detail was inspected.

Request: `GET https://api.fogos.pt/v2/incidents/active?geojson=1` with `X-API-Key`.

Observed response: HTTP 429, `content-type: text/plain`, body `error code: 1015`, and `Retry-After: 271` seconds at validation time. This is a rate-limit/access-control response, not a valid incident payload. The key's presence is confirmed only by local configuration metadata; its value is never logged.

Decision: retain the brokered Fogos adapter and do not scrape or bypass the site. Implement only after Fogos.pt confirms endpoint authorization and quota behavior. The broker must send the required user agent, honor `Retry-After`, and expose a clear `rate-limited`/`configuration-required` state.

Required attribution: visible “Fonte: Fogos.pt” with a link to `https://fogos.pt`, following the API terms.
