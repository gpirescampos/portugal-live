# Dataset marker rendering

Point records across the map use the shared marker implementation in
`src/rendering/datasetMarker.ts`. Dataset renderers provide the normalized
record kind, base color, marker size, and selection state; the shared helper
owns the Cesium billboard image and applies the same selection treatment to
every dataset. Warning polygons keep their area geometry and use the shared
marker behavior for their representative point.

## Icon mapping

`src/rendering/datasetMarkerIcons.ts` maps provider-independent record kinds to
filled Phosphor Core SVG icons. A map pin is the fallback for an unrecognized
kind.

| Dataset / record kind | Filled icon |
| --- | --- |
| Aircraft (`aircraft`) | Airplane |
| Seismic event (`seismic-event`) | Waveform |
| Weather warning (`weather-warning`) | Triangle |
| Wildfire incident (`wildfire-incident`) | Fire |
| Satellite thermal detection (`thermal-detection`) | Sun |
| Air quality observation (`air-quality-observation`) | Wind |
| Tide gauge observation (`tide-gauge-observation`) | Waves |
| Public camera (`public-camera`) | Camera |
| Unknown kind | Map pin |

FIRMS marker hue continues to encode confidence and marker size encodes Fire
Radiative Power. The sun glyph identifies the record type; it does not assert
that a thermal anomaly is a confirmed fire.

## Selection and rendering

The shared helper applies a pink (`#ff4d6d`) color and a 1.5 scale while a
record is selected, then restores the renderer-provided base color and size
when deselected. Selection is driven by Cesium's selected entity and mirrored
through each dataset renderer so refreshed data keeps the same state. Closing
the detail panel clears Cesium selection, which returns the marker to its
normal style.

The viewer uses Cesium request-render mode with time-based rendering disabled.
Billboard images are added to Cesium's texture atlas asynchronously, so the
shared helper requests a follow-up frame after an image-changing render. This
makes newly enabled dataset icons visible without requiring a map resize or
another user interaction.

The browser entry point registers the Phosphor SVG assets with the shared
marker helper. The asset imports stay outside renderer modules so Node's unit
test runner can import those renderers without needing Vite's `?raw` loader.
