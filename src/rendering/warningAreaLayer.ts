import * as Cesium from 'cesium';
import type { WorldRecord, Position } from '../domain/world.ts';
import { warningVisualFor } from './warningStyle.ts';
import { applyDatasetMarkerState, updateDatasetMarker } from './datasetMarker.ts';

/** Minimal viewer collection surface used by the renderer lifecycle. */
export interface WarningEntityCollectionPort {
  removeById(id: string): boolean;
}

/** Removes the entities owned by a warning render before rebuilding it. */
export function removeWarningEntities(collection: WarningEntityCollectionPort, ids: Iterable<string>): void {
  for (const id of ids) collection.removeById(id);
}

/** Renders provider-supplied warning polygons without inventing their geometry. */
export class WarningAreaLayerRenderer {
  private readonly entities = new Cesium.EntityCollection();
  private readonly ids = new Set<string>();
  private readonly baseStyles = new Map<string, { fill: Cesium.Color; outline: Cesium.Color }>();
  private viewer: Cesium.Viewer | null = null;
  private selectedId: string | null = null;

  mount(viewer: Cesium.Viewer): void {
    this.viewer = viewer;
    for (const entity of this.entities.values) {
      if (!viewer.entities.getById(entity.id)) viewer.entities.add(entity);
    }
  }

  render(records: WorldRecord[]): void {
    // Cesium's viewer collection is separate from our private collection.
    // Remove the previous viewer entities first, otherwise the new entities
    // reuse IDs that Cesium still considers occupied and never get added.
    removeWarningEntities(this.viewer?.entities ?? { removeById: () => false }, this.ids);
    this.entities.removeAll();
    this.ids.clear();
    this.baseStyles.clear();
    for (const record of records) {
      if (record.geometry.type === 'Point') {
        const [longitude, latitude, altitude = 0] = record.geometry.coordinates;
        const visual = warningVisualFor(record);
        this.baseStyles.set(record.id, { fill: visual.fill, outline: visual.outline });
        const entity = this.entities.add({
          id: record.id,
          position: new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude)),
          properties: new Cesium.PropertyBag({ recordId: record.id, providerId: record.providerId, markerKind: record.kind, warningType: record.properties.warningType, severity: visual.severity, validity: record.properties.validity, areaName: record.properties.areaName, areaCode: record.properties.areaCode, validUntil: record.validUntil }),
        });
        updateDatasetMarker(entity, record.kind, visual.outline, 24, record.id === this.selectedId, this.viewer);
        this.ids.add(record.id);
        if (this.viewer && !this.viewer.entities.getById(record.id)) this.viewer.entities.add(entity);
        continue;
      }
      const polygons = record.geometry.type === 'Polygon'
        ? [record.geometry.coordinates]
        : record.geometry.type === 'MultiPolygon' ? record.geometry.coordinates : [];
      polygons.forEach((rings, index) => {
        const outer = rings[0];
        if (!outer || outer.length < 3) return;
        const id = `${record.id}:${index}`;
        const visual = warningVisualFor(record);
        this.baseStyles.set(id, { fill: visual.fill, outline: visual.outline });
        const entity = this.entities.add({
          id,
          polygon: {
            hierarchy: new Cesium.ConstantProperty(toHierarchy(outer)),
            material: new Cesium.ColorMaterialProperty(visual.fill),
            outline: new Cesium.ConstantProperty(true),
            outlineColor: new Cesium.ConstantProperty(visual.outline),
            height: new Cesium.ConstantProperty(150),
          },
          properties: new Cesium.PropertyBag({ recordId: record.id, severity: visual.severity, providerId: record.providerId, warningType: record.properties.warningType, validity: record.properties.validity, areaName: record.properties.areaName, areaCode: record.properties.areaCode, validUntil: record.validUntil }),
        });
        this.ids.add(id);
        if (this.viewer && !this.viewer.entities.getById(id)) this.viewer.entities.add(entity);
      });
    }
    this.setSelectedRecord(this.selectedId);
    this.viewer?.scene.requestRender();
  }

  setSelectedRecord(id: string | null): void {
    this.selectedId = id;
    for (const entity of this.entities.values) {
      const values = entity.properties?.getValue(Cesium.JulianDate.now());
      const selected = Boolean(id && values?.recordId === id);
      const style = this.baseStyles.get(entity.id);
      if (!style) continue;
      if (entity.billboard) {
        const kind = values?.markerKind as string ?? 'weather-warning';
        applyDatasetMarkerState(entity, kind, style.outline, selected, this.viewer);
      }
      if (entity.polygon) {
        const fill = selected ? selectedMarkerColor().withAlpha(0.28) : style.fill;
        entity.polygon.material = new Cesium.ColorMaterialProperty(fill);
        entity.polygon.outlineColor = new Cesium.ConstantProperty(selected ? selectedMarkerColor() : style.outline);
      }
    }
    this.viewer?.scene.requestRender();
  }

  clear(): void {
    for (const id of this.ids) this.viewer?.entities.removeById(id);
    this.entities.removeAll();
    this.ids.clear();
    this.baseStyles.clear();
    this.selectedId = null;
    this.viewer?.scene.requestRender();
  }
}

function selectedMarkerColor(): Cesium.Color {
  return Cesium.Color.fromCssColorString('#ff4d6d');
}

function toHierarchy(positions: Position[]): Cesium.Cartesian3[] {
  return positions.map(([longitude, latitude, altitude = 150]) =>
    Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude));
}
