import * as Cesium from 'cesium';
import type { WorldRecord } from '../domain/world';

export type IncidentStatusBand = 'early' | 'active' | 'resolving' | 'closed' | 'unknown';
export interface IncidentVisual { statusBand: IncidentStatusBand; pixelSize: number; color: Cesium.Color; }

/** Mirrors Fogos.pt's useful visual grammar without treating resources as risk. */
export function incidentVisualFor(record: WorldRecord): IncidentVisual {
  const status = `${record.properties.statusCode ?? ''} ${record.properties.status ?? ''}`.toLowerCase();
  const statusBand: IncidentStatusBand = /falso|encerrad|conclus|vigilância|vigilancia/.test(status) ? 'closed'
    : /resolu/.test(status) ? 'resolving'
      : /despacho|1º alerta|primeiro alerta/.test(status) ? 'early'
        : /curso|chegada|incêndio|incendio|alerta/.test(status) ? 'active' : 'unknown';
  const resources = record.properties.resources as Record<string, unknown> | undefined;
  const score = (Number(resources?.personnel) || 0) + 2 * (Number(resources?.terrestrial) || 0) + 4 * (Number(resources?.aerial) || 0);
  const pixelSize = Math.max(7, Math.min(18, 7 + Math.sqrt(Math.max(0, score)) * 1.6));
  const colors: Record<IncidentStatusBand, string> = { early: '#65c4ed', active: '#e87722', resolving: '#ffb202', closed: '#7e8c8d', unknown: '#bdbdbd' };
  const alpha = record.freshness === 'stale' ? 0.45 : 0.95;
  return { statusBand, pixelSize, color: Cesium.Color.fromCssColorString(colors[statusBand]).withAlpha(alpha) };
}
