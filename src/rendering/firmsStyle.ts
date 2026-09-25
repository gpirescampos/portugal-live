import * as Cesium from 'cesium';
import type { WorldRecord } from '../domain/world';

export interface FirmsVisual { pixelSize: number; color: Cesium.Color; }

/** Confidence controls hue; FRP controls marker size without implying incident severity. */
export function firmsVisualFor(record: WorldRecord): FirmsVisual {
  const band = record.properties.confidenceBand;
  const frp = Math.max(0, Number(record.properties.frpMw) || 0);
  const color = band === 'high' ? '#ff8a69' : band === 'nominal' ? '#d887db' : band === 'low' ? '#9488ef' : '#9aa7a5';
  const alpha = record.freshness === 'stale' ? 0.48 : 0.94;
  return { pixelSize: Math.max(7, Math.min(15, 7 + Math.sqrt(frp) * 1.3)), color: Cesium.Color.fromCssColorString(color).withAlpha(alpha) };
}
