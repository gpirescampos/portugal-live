import * as Cesium from 'cesium';
import type { WorldRecord } from '../domain/world.ts';

export interface TideVisual { pixelSize: number; color: Cesium.Color; }

export function tideVisualFor(record: WorldRecord): TideVisual {
  return {
    pixelSize: record.freshness === 'stale' ? 8 : 10,
    color: Cesium.Color.fromCssColorString(record.freshness === 'stale' ? '#82938d' : '#55d7d0')!.withAlpha(record.freshness === 'stale' ? 0.58 : 0.96),
  };
}
