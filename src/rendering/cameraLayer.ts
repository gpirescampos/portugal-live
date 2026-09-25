import * as Cesium from 'cesium';
import type { WorldRecord } from '../domain/world.ts';
import type { CameraProviderId } from '../providers/cameras/types.ts';
import { applyDatasetMarkerState, updateDatasetMarker } from './datasetMarker.ts';

/** Source facades ensure one operator refresh cannot remove another's entities. */
export class CameraLayerRenderer {
  private readonly entities = new Map<string, Cesium.Entity>();
  private viewer: Cesium.Viewer | null = null;
  private selectedId: string | null = null;
  mount(viewer: Cesium.Viewer): void { this.viewer = viewer; }
  forProvider(providerId: CameraProviderId) { return { render: (records: WorldRecord[]) => this.renderProvider(providerId, records) }; }
  render(records: WorldRecord[]): void {
    this.renderProvider(null, records);
  }
  private renderProvider(providerId: CameraProviderId | null, records: WorldRecord[]): void {
    const incoming = new Set(records.filter((record) => providerId === null || record.providerId === providerId).map((record) => record.id));
    for (const [id, entity] of this.entities) {
      const owner = entity.properties?.getValue(Cesium.JulianDate.now()).providerId as CameraProviderId | undefined;
      if ((providerId === null || owner === providerId) && !incoming.has(id)) { this.viewer?.entities.removeById(id); this.entities.delete(id); }
    }
    for (const record of records) {
      if (record.geometry.type !== 'Point') continue;
      const [longitude, latitude] = record.geometry.coordinates;
      let entity = this.entities.get(record.id);
      if (!entity) {
        entity = new Cesium.Entity({ id: record.id });
        this.entities.set(record.id, entity);
      }
      entity.position = new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromDegrees(longitude, latitude));
      updateDatasetMarker(entity, record.kind, baseMarkerColor(), 28, record.id === this.selectedId, this.viewer);
      entity.properties = new Cesium.PropertyBag({ recordId: record.id, providerId: record.providerId, markerKind: record.kind, observedAt: record.observedAt, ...record.properties });
      if (this.viewer && !this.viewer.entities.getById(record.id)) this.viewer.entities.add(entity);
    }
    this.viewer?.scene.requestRender();
  }
  setSelectedCamera(id: string | null): void {
    this.selectedId = id;
    for (const [entityId, entity] of this.entities) if (entity.billboard) {
      const selected = entityId === id;
      const values = entity.properties?.getValue(Cesium.JulianDate.now());
      const kind = values?.markerKind as string | undefined;
      applyDatasetMarkerState(entity, kind ?? 'public-camera', baseMarkerColor(), selected, this.viewer);
    }
    this.viewer?.scene.requestRender();
  }
  clear(providerId?: CameraProviderId): void {
    for (const [id, entity] of this.entities) {
      const owner = entity.properties?.getValue(Cesium.JulianDate.now()).providerId as CameraProviderId | undefined;
      if (!providerId || owner === providerId) { this.viewer?.entities.removeById(id); this.entities.delete(id); }
    }
    if (!providerId || (this.selectedId && !this.entities.has(this.selectedId))) this.selectedId = null;
    const selectedOwner = this.viewer?.selectedEntity?.properties?.getValue(Cesium.JulianDate.now()).providerId;
    if (typeof selectedOwner === 'string' && selectedOwner.startsWith('camera-')) this.viewer!.selectedEntity = undefined;
    this.viewer?.scene.requestRender();
  }
  destroy(): void { this.clear(); this.viewer = null; }
}

function baseMarkerColor(): Cesium.Color { return Cesium.Color.fromCssColorString('#f1c56e'); }
