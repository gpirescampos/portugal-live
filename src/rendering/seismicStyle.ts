import * as Cesium from 'cesium';
import type { WorldRecord } from '../domain/world';

export type SeismicAgeBand = 'recent' | 'today' | 'week' | 'history';

export interface SeismicVisual {
  ageBand: SeismicAgeBand;
  pixelSize: number;
  color: Cesium.Color;
}

/** Size encodes magnitude; opacity/saturation encodes event age. */
export function seismicVisualFor(record: WorldRecord, now = new Date()): SeismicVisual {
  const magnitude = Number(record.properties.magnitude);
  const ageMs = record.observedAt ? Math.max(0, now.getTime() - Date.parse(record.observedAt)) : Infinity;
  const ageHours = ageMs / 3_600_000;
  const pixelSize = Number.isFinite(magnitude) ? Math.max(6, Math.min(18, 5 + magnitude * 2)) : 8;
  if (ageHours <= 6) return { ageBand: 'recent', pixelSize, color: Cesium.Color.fromCssColorString('#9af0c9').withAlpha(1) };
  if (ageHours <= 24) return { ageBand: 'today', pixelSize, color: Cesium.Color.fromCssColorString('#8ddcbd').withAlpha(0.82) };
  if (ageHours <= 168) return { ageBand: 'week', pixelSize, color: Cesium.Color.fromCssColorString('#68aa98').withAlpha(0.54) };
  return { ageBand: 'history', pixelSize, color: Cesium.Color.fromCssColorString('#71827f').withAlpha(0.28) };
}
