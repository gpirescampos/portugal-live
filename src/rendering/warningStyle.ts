import * as Cesium from 'cesium';
import type { WorldRecord } from '../domain/world';

export type WarningSeverity = 'green' | 'yellow' | 'orange' | 'red' | 'unknown';

export interface WarningVisual {
  severity: WarningSeverity;
  fill: Cesium.Color;
  outline: Cesium.Color;
}

/** Maps provider severity values to a restrained, readable warning palette. */
export function warningVisualFor(record: WorldRecord): WarningVisual {
  const value = String(record.properties.severity ?? record.properties.warningLevel ?? '').toLowerCase();
  const severity: WarningSeverity = ['green', 'yellow', 'orange', 'red'].includes(value)
    ? value as WarningSeverity
    : 'unknown';
  const colors: Record<WarningSeverity, [string, string]> = {
    green: ['#5fbf91', '#9af0c9'],
    yellow: ['#d8b45c', '#f2d27a'],
    orange: ['#d77b43', '#f0a06e'],
    red: ['#c95757', '#ed8585'],
    unknown: ['#71827f', '#a4b9b1'],
  };
  const [fill, outline] = colors[severity];
  return {
    severity,
    fill: Cesium.Color.fromCssColorString(fill).withAlpha(severity === 'unknown' ? 0.12 : 0.2),
    outline: Cesium.Color.fromCssColorString(outline).withAlpha(0.9),
  };
}
