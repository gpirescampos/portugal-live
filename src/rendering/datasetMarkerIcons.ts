import airplane from '@phosphor-icons/core/fill/airplane-fill.svg?raw';
import waveform from '@phosphor-icons/core/fill/waveform-fill.svg?raw';
import triangle from '@phosphor-icons/core/fill/triangle-fill.svg?raw';
import fire from '@phosphor-icons/core/fill/fire-fill.svg?raw';
import sun from '@phosphor-icons/core/fill/sun-fill.svg?raw';
import wind from '@phosphor-icons/core/fill/wind-fill.svg?raw';
import waves from '@phosphor-icons/core/fill/waves-fill.svg?raw';
import camera from '@phosphor-icons/core/fill/camera-fill.svg?raw';
import mapPin from '@phosphor-icons/core/fill/map-pin-fill.svg?raw';

/** Filled Phosphor SVGs keyed by the provider-independent record kind. */
export const datasetMarkerIcons: Readonly<Record<string, string>> = {
  aircraft: airplane,
  'seismic-event': waveform,
  'weather-warning': triangle,
  'wildfire-incident': fire,
  'thermal-detection': sun,
  'air-quality-observation': wind,
  'tide-gauge-observation': waves,
  'public-camera': camera,
  'map-pin': mapPin,
};
