# Câmaras públicas — Madeira-Web, NetMadeira, MEO Beachcam, Via Verde, VR1 Madeira, Funchal, MeteoEstrela e pilotos costeiros

Reviewed: 2026-09-24. Camera markers identify reported locations; they do not
claim exact mounts, current image capture time, or continuous live video. Each
operator has an independent catalogue and source-health status. Clicking a
link-only camera shows its official source link without an empty video frame.

Each marker carries a provider-scoped ID (`camera-netmadeira:<slug>`,
`camera-portolisboa:<slug>`, `camera-cnsantamaria:<slug>`,
`camera-meo-beachcam:<slug>`, `camera-meteoestrela:<slug>`, or
`camera-madeira-web:<slug>`), approximate WGS84 coordinates, source page,
attribution, and an allowlisted media mode. Iframes load only for sources whose
in-page players are selected for the pilot. Capture time is always reported as
unknown unless the operator exposes a verified timestamp.

## NetMadeira — 28 Madeira camera pages

The current [Madeira cameras page](https://www.netmadeira.com/webcams-madeira/)
lists 28 cameras and each entry links to a named detail page. The catalogue
includes those 28 names as map markers with approximate town or landmark
coordinates. Selecting any one links directly to its individual operator page.

The operator's [published iframe examples](https://www.netmadeira.com/webcams-madeira-for-webmasters)
still use `/webcams/show/netmadeira/<slug>`. Live checks on 2026-09-23 found
those iframe pages return an HTML document containing only the `disable.jpg`
placeholder, so Portugal Live does not show a player for them. The individual
camera pages currently include signed image URLs under
`/webcams-madeira/load/netmadeira/...`; sampled endpoints returned JPEG bytes
with `Content-Type: text/html`, and their signatures change over time. These
are still-image snapshots, not browser-playable video. The app does not scrape,
rewrite, relay, or store these images. Until there is a supported, verified
in-page transport, it links to each individual camera page.

Locations are approximate and based on camera names and public geography, not
published mounting coordinates. NetMadeira positions are restricted to its
stated Madeira coverage bounds. Availability is unverified per camera, and the
panel does not claim the linked image is current. The map catalogue refreshes
daily; catalogue retrieval time is distinct from camera capture time.

## Porto de Lisboa embedded live views

The official [Tejo Live page](https://www.portodelisboa.pt/tejo-live) lists
Câmara Cacilhas and Câmara VTS. The operator describes Cacilhas as installed in
Cacilhas and VTS as being at its VTS building in Algés. The catalogue uses
approximate town/site coordinates and `camera-portolisboa` IDs. The VTS/Algés
YouTube iframe is confirmed working by the user. Cacilhas remains link-only
because its player did not work in the user's app. The Porto de Lisboa page
remains the attribution/source link. No stream extraction, proxy, or recording
is implemented. A reported 30-second delay does not establish an exact capture
time.

## Clube Naval de Santa Maria embedded player

The Clube Naval de Santa Maria page names the “Câmara Clube Naval” and links to
its viewing page. The club's location page places it at Marina de Vila do Porto
and publishes GPS coordinates. The marker uses that published club coordinate
as an approximate camera location; the exact mount is unverified. The official
viewing page links an Olho Mariense player page. That page currently loads an
HLS playlist and a referenced MPEG-TS segment; both returned HTTP 200 during
the 2026-09-23 check. The app embeds the player page on selection and preserves
the club's official page as the source link. Feed availability and reuse terms
beyond the provided player remain unverified.

## MEO Beachcam — 185 individually linked cameras

The official [Beachcam live-camera index](https://beachcam.meo.pt/livecams/)
currently lists 185 named cameras with map coordinates and individual operator
pages. All 185 appear in the map catalogue, including Praia do Monte Verde in
the Açores. The source list coordinates are used as approximate camera
locations. Entries link directly to their individual operator pages and remain
link-only until their in-page players are verified. The Monte Verde page's HLS
playlist returned HTTP 403 and the page disallowed external framing in the
2026-09-23 check; this result is not generalized to the other 184 pages.

## MeteoEstrela webcams

The official [webcam gallery](https://www.meteoestrela.pt/web-tv-nowcasting/)
lists 10 weather views at five named sites: Torre, Estância, Penhas da Saúde,
Vale do Rossim, and Covilhã. The map groups views at the same site into five
markers. The gallery uses direct JPEGs for its views; a sampled image returned
HTTP 200 with `Content-Type: image/jpeg` on 2026-09-24. The operator says the
images update every 60 seconds and are for meteorology, not surveillance or
recording. When selected, Portugal Live displays one site image and refreshes
it once a minute while visible; the link opens the corresponding MeteoEstrela
page. Coordinates are approximate site locations, not published camera mounts.

## Madeira-Web — 30 fixed camera pages

The [Madeira-Web index](https://www.madeira-web.com/es/noticias/webcams-isla-madeira.html)
describes around 30 live cameras. Thirty fixed views are catalogued from its
individual camera pages; its rotating island panorama is omitted because it
does not have one fixed camera location. Locations are approximate town or
landmark placements, except Funchal Marina 1, whose operator page publishes
coordinates. Four individual pages publish direct YouTube iframe URLs: Funchal
Marina 1, Lido pools, Museu da Baleia in Caniçal, and Porto de Machico. These
are loaded only when selected. The other 26 entries link to their Madeira-Web
camera page and do not render an empty player. No video is extracted, proxied,
or stored. The operator says its live footage is not recorded or stored. The
embed URLs and source pages were checked on 2026-09-24; playback still depends
on the operator and YouTube availability.

## Via Verde / Brisa — 100 highway camera locations

The official [Via Verde traffic information page](https://www.viaverde.pt/Ferramentas/informacao-de-transito)
advertises Brisa cameras and exposes a located catalogue for 100 cameras on
the A1–A4. Portugal Live retrieves the catalogue through a fixed broker route,
validates IDs, coordinates and the operator's image host, and returns only
location metadata to the browser. The camera panel links to the official Via
Verde page; it does not show a player or snapshot. The page is same-origin
framed, and a dozen sampled snapshot objects reported a last-modified date of
2026-09-13 during the 2026-09-24 review, so they are not represented as live
images. Catalogue retrieval time is not image capture time.

## VR1 Madeira — 71 road camera locations

The current [VR1 operator map](https://www.vr1madeira.pt/map) exposes an
operator-published catalogue at `/assets/json/cctvs.json` with names and
coordinates for 64 VR1 and seven regional-road cameras. The catalogue is
included as a dated source snapshot. Image requests for both the VR1 and DRE
sample handlers returned HTTP 403 on 2026-09-24, so the markers link to the
operator map and do not render a player or image.

## Município do Funchal — three listed views

The municipal [webcam page](https://services.funchal.pt/webcams/) lists Baía do
Funchal, Torre and Parque Ecológico, and reloads every minute. Its three image
endpoints returned the same SVG fallback rather than camera images on
2026-09-24. The app shows approximate location markers and links to the official
page; it does not display the fallback as a camera feed.

## Other reviewed candidates

SpotAzores is excluded: its published terms prohibit copying/distributing site
content and creating links without express written authorization. Do not add
its catalogue or links absent that authorization.

ViaExpresso's public streams are technically reachable, but its official terms
require prior written consent to copy site information, images, or create links.
Do not add its camera links or media until consent is obtained. Funchal
municipal camera endpoints sampled on 2026-09-24 returned SVG fallback images,
so they are not integrated as camera feeds.

CIVISA publishes a network page confirming live volcano imagery but the
reviewed page does not identify individual camera IDs, locations, or embeddable
URLs. It is not enough evidence to create geographically placed markers;
revisit if CIVISA publishes a located catalogue or supplies those details.
Madeira Info Vias describes
cameras in its mobile app, but no current public catalogue or media endpoint
was found. These sources remain outside the catalogue until their access paths
are verified.
