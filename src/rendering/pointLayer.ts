import * as Cesium from 'cesium';
import type { WorldRecord } from '../domain/world';
import { seismicVisualFor } from './seismicStyle';
import { incidentVisualFor } from './incidentStyle';
import { firmsVisualFor } from './firmsStyle';
import { tideVisualFor } from './tideStyle';
import { applyDatasetMarkerState, datasetMarkerSize, updateDatasetMarker } from './datasetMarker';

/** Owns a single Cesium entity collection for a normalized point layer. */
export class PointLayerRenderer {
  private readonly entities = new Cesium.EntityCollection();
  private readonly byId = new Map<string, Cesium.Entity>();
  private readonly baseColors = new Map<string, Cesium.Color>();
  private readonly kinds = new Map<string, string>();
  private selectedId: string | null = null;
  private viewer: Cesium.Viewer | null = null;

  mount(viewer: Cesium.Viewer): void {
    this.viewer = viewer;
    viewer.entities.suspendEvents();
    for (const entity of this.entities.values) viewer.entities.add(entity);
    viewer.entities.resumeEvents();
  }

  render(records: WorldRecord[]): void {
    const incoming = new Set(records.map((record) => record.id));
    for (const [id, entity] of this.byId) {
      if (!incoming.has(id)) {
        this.entities.remove(entity);
        this.viewer?.entities.removeById(id);
        this.byId.delete(id);
        this.baseColors.delete(id);
        this.kinds.delete(id);
      }
    }
    for (const record of records) {
      if (record.geometry.type !== 'Point') continue;
      const [longitude, latitude, altitude = 0] = record.geometry.coordinates;
      let entity = this.byId.get(record.id);
      if (!entity) {
        entity = this.entities.add({ id: record.id });
        this.byId.set(record.id, entity);
      }
      const selected = this.isSelected(record);
      entity.position = new Cesium.ConstantPositionProperty(
        Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude),
      );
      const visual = record.kind === 'seismic-event' ? seismicVisualFor(record) : record.kind === 'wildfire-incident' ? incidentVisualFor(record) : record.kind === 'thermal-detection' ? firmsVisualFor(record) : record.kind === 'tide-gauge-observation' ? tideVisualFor(record) : { pixelSize: 8, color: Cesium.Color.fromCssColorString('#8de6c0') };
      this.baseColors.set(record.id, visual.color);
      this.kinds.set(record.id, record.kind);
      updateDatasetMarker(entity, record.kind, visual.color, datasetMarkerSize(visual.pixelSize), selected, this.viewer);
      entity.properties = new Cesium.PropertyBag({
        recordId: record.id,
        providerId: record.providerId,
        markerKind: record.kind,
        magnitude: record.properties.magnitude,
        depthKm: record.properties.depthKm,
        region: record.properties.region,
        nature: record.properties.nature,
        status: record.properties.status,
        statusCode: record.properties.statusCode,
        municipality: record.properties.municipality,
        startedAt: record.properties.startedAt,
        resources: record.properties.resources,
        ...record.properties,
        longitude,
        latitude,
        observedAt: record.observedAt,
        freshness: record.freshness,
      });
      if (this.viewer && !this.viewer.entities.getById(entity.id)) this.viewer.entities.add(entity);
    }
    this.viewer?.scene.requestRender();
  }

  setSelectedRecord(id: string | null): void {
    this.selectedId = id;
    for (const [entityId, entity] of this.byId) {
      if (!entity.billboard) continue;
      const selected = id !== null && entityId === id;
      applyDatasetMarkerState(entity, this.kinds.get(entityId) ?? 'map-pin', this.baseColors.get(entityId) ?? Cesium.Color.WHITE, selected, this.viewer);
    }
    this.viewer?.scene.requestRender();
  }

  private isSelected(record: WorldRecord): boolean {
    return record.id === this.selectedId;
  }

  attachTo(viewer: Cesium.Viewer): void {
    this.viewer = viewer;
    for (const entity of this.entities.values) {
      if (!viewer.entities.getById(entity.id)) viewer.entities.add(entity);
    }
  }

  clear(): void {
    for (const entity of this.entities.values) this.viewer?.entities.removeById(entity.id);
    this.entities.removeAll();
    this.byId.clear();
    this.baseColors.clear();
    this.kinds.clear();
    this.selectedId = null;
    this.viewer?.scene.requestRender();
  }

  destroy(viewer?: Cesium.Viewer): void {
    if (viewer) {
      for (const entity of this.entities.values) viewer.entities.removeById(entity.id);
    }
    this.clear();
    this.viewer = null;
  }
}
