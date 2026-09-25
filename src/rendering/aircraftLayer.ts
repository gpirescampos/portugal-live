import * as Cesium from 'cesium';
import { predictAircraft, type AircraftMotionState } from '../domain/aircraftMotion.ts';
import type { WorldRecord } from '../domain/world.ts';
import { applyDatasetMarkerState, updateDatasetMarker } from './datasetMarker.ts';

/** Cesium renderer for aircraft with bounded, session-only dead reckoning. */
export class AircraftLayerRenderer {
  private readonly entities = new Cesium.EntityCollection();
  private readonly states = new Map<string, AircraftMotionState>();
  private readonly trails = new Map<string, Cesium.Cartesian3[]>();
  private readonly lastTrailSampleAt = new Map<string, number>();
  private selectedAircraftId: string | null = null;
  private viewer: Cesium.Viewer | null = null;
  private frame: number | null = null;
  private styledSelection = new Map<string, boolean>();

  mount(viewer: Cesium.Viewer): void { this.viewer = viewer; for (const entity of this.entities.values) viewer.entities.add(entity); this.startAnimation(); }

  render(records: WorldRecord[]): void {
    const incoming = new Set(records.map((record) => record.id));
    for (const [id, state] of this.states) {
      if (!incoming.has(id)) { this.states.delete(id); this.trails.delete(id); this.lastTrailSampleAt.delete(id); this.styledSelection.delete(id); this.entities.removeById(id); this.entities.removeById(`${id}:trail`); this.viewer?.entities.removeById(id); this.viewer?.entities.removeById(`${id}:trail`); }
    }
    for (const record of records) {
      if (record.geometry.type !== 'Point') continue;
      const [longitude, latitude, altitude = 0] = record.geometry.coordinates;
      const speed = Number(record.properties.velocityMps);
      const heading = Number(record.properties.headingDegrees);
      const state: AircraftMotionState = {
        longitude, latitude, altitudeMeters: altitude,
        velocityEastMps: Number.isFinite(speed) && Number.isFinite(heading) ? speed * Math.sin(Cesium.Math.toRadians(heading)) : null,
        velocityNorthMps: Number.isFinite(speed) && Number.isFinite(heading) ? speed * Math.cos(Cesium.Math.toRadians(heading)) : null,
        verticalRateMps: Number(record.properties.verticalRateMps) || null,
        headingDegrees: Number.isFinite(heading) ? heading : null,
        observedAt: Date.parse(record.observedAt ?? record.fetchedAt),
        // OpenSky refreshes every 90 seconds; keep a bounded prediction window
        // long enough to avoid an artificial blank interval between snapshots.
        predictionHorizonSeconds: 120,
      };
      this.states.set(record.id, state);
      const trail = this.trails.get(record.id) ?? [];
      trail.push(Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude));
      while (trail.length > 8) trail.shift();
      this.trails.set(record.id, trail);
      let entity = this.entities.getById(record.id);
      if (!entity) {
        entity = this.entities.add({ id: record.id });
        updateDatasetMarker(entity, 'aircraft', Cesium.Color.fromCssColorString('#8de6c0'), 28, false, this.viewer);
        entity.billboard!.rotation = new Cesium.ConstantProperty(0);
        entity.properties = new Cesium.PropertyBag({ recordId: record.id, providerId: record.providerId, markerKind: record.kind, callsign: record.properties.callsign, icao24: record.properties.icao24, originCountry: record.properties.originCountry, onGround: record.properties.onGround, observedAt: record.observedAt });
      }
      // Give Cesium a real position before the entity enters the collection;
      // animation then updates this observed position with bounded prediction.
      entity.position = new Cesium.ConstantPositionProperty(Cesium.Cartesian3.fromDegrees(longitude, latitude, altitude));
      this.lastTrailSampleAt.set(record.id, Date.now());
      if (entity.billboard) entity.billboard.rotation = new Cesium.ConstantProperty(Cesium.Math.toRadians(Number(record.properties.headingDegrees) || 0));
      this.applySelectionStyle(entity);
      if (this.viewer && !this.viewer.entities.getById(record.id)) this.viewer.entities.add(entity);
      let trailEntity = this.entities.getById(`${record.id}:trail`);
      if (!trailEntity) trailEntity = this.entities.add({ id: `${record.id}:trail` });
      trailEntity.polyline = new Cesium.PolylineGraphics({ positions: new Cesium.ConstantProperty(trail), width: 1.5, material: Cesium.Color.fromCssColorString('#8de6c0').withAlpha(0.28) });
      if (this.viewer && !this.viewer.entities.getById(trailEntity.id)) this.viewer.entities.add(trailEntity);
    }
    this.startAnimation();
  }

  private startAnimation(): void {
    if (this.frame !== null || !animationShouldRun(this.viewer !== null, this.states.size)) return;
    const tick = () => {
      this.frame = null;
      if (!animationShouldRun(this.viewer !== null, this.states.size)) return;
      this.animate(Date.now());
      this.frame = requestAnimationFrame(tick);
    };
    this.frame = requestAnimationFrame(tick);
  }

  private stopAnimation(): void {
    if (this.frame !== null) cancelAnimationFrame(this.frame);
    this.frame = null;
  }

  private animate(now: number): void {
    this.syncSelection();
    for (const [id, state] of this.states) {
      const sample = predictAircraft(state, now);
      const entity = this.entities.getById(id);
      // Keep the last observed position visible if a source timestamp is older
      // than the prediction horizon. The next provider snapshot decides whether
      // the aircraft is still present; the animation loop must not make it blink
      // out between refreshes.
      if (!sample || !entity) continue;
      const position = Cesium.Cartesian3.fromDegrees(sample.longitude, sample.latitude, sample.altitudeMeters ?? 0);
      if (entity.position instanceof Cesium.ConstantPositionProperty) entity.position.setValue(position);
      else entity.position = new Cesium.ConstantPositionProperty(position);
      if (entity.billboard && sample.headingDegrees !== null) {
        const heading = Cesium.Math.toRadians(sample.headingDegrees);
        if (entity.billboard.rotation instanceof Cesium.ConstantProperty) entity.billboard.rotation.setValue(heading);
        else entity.billboard.rotation = new Cesium.ConstantProperty(heading);
      }
      this.applySelectionStyle(entity);
      // Keep a small, time-sampled breadcrumb trail so motion remains legible
      // between provider snapshots. It is session-only and bounded.
      const lastTrailSample = this.lastTrailSampleAt.get(id) ?? 0;
      if (now - lastTrailSample >= 750) {
        const trail = this.trails.get(id) ?? [];
        trail.push(Cesium.Cartesian3.fromDegrees(sample.longitude, sample.latitude, sample.altitudeMeters ?? 0));
        while (trail.length > 12) trail.shift();
        this.trails.set(id, trail);
        const trailEntity = this.entities.getById(`${id}:trail`);
        if (trailEntity?.polyline?.positions instanceof Cesium.ConstantProperty) trailEntity.polyline.positions.setValue(trail);
        else if (trailEntity?.polyline) trailEntity.polyline.positions = new Cesium.ConstantProperty(trail);
        this.lastTrailSampleAt.set(id, now);
      }
    }
    this.viewer?.scene.requestRender();
  }
  setSelectedAircraft(id: string | null): void {
    this.selectedAircraftId = id;
    for (const entity of this.entities.values) {
      if (entity.id.endsWith(':trail')) continue;
      this.applySelectionStyle(entity);
    }
    this.viewer?.scene.requestRender();
  }
  clearSelection(): void {
    this.setSelectedAircraft(null);
    if (this.viewer?.selectedEntity?.properties?.getValue(Cesium.JulianDate.now()).providerId === 'opensky') {
      this.viewer.selectedEntity = undefined;
    }
  }
  private applySelectionStyle(entity: Cesium.Entity): void {
    if (!entity.billboard) return;
    const selected = entity.id === this.selectedAircraftId;
    if (this.styledSelection.get(entity.id) === selected) return;
    applyDatasetMarkerState(entity, 'aircraft', Cesium.Color.fromCssColorString('#8de6c0'), selected, this.viewer);
    this.styledSelection.set(entity.id, selected);
  }
  private syncSelection(): void {
    const selectedId = this.viewer?.selectedEntity?.id;
    if (selectedId !== this.selectedAircraftId) this.setSelectedAircraft(selectedId ?? null);
  }
  clear(): void {
    // The renderer maintains its own collection as well as Cesium's viewer
    // collection. Remove from both; clearing only the private collection leaves
    // visible entities orphaned in the scene.
    for (const entity of this.entities.values) this.viewer?.entities.removeById(entity.id);
    this.states.clear();
    this.trails.clear();
    this.lastTrailSampleAt.clear();
    this.selectedAircraftId = null;
    this.styledSelection.clear();
    this.entities.removeAll();
    this.stopAnimation();
    if (this.viewer?.selectedEntity?.properties?.getValue(Cesium.JulianDate.now()).providerId === 'opensky') this.viewer.selectedEntity = undefined;
    this.viewer?.scene.requestRender();
  }
  destroy(viewer?: Cesium.Viewer): void { if (viewer) for (const entity of this.entities.values) viewer.entities.removeById(entity.id); this.clear(); this.viewer = null; }
}

/** Kept pure so animation lifecycle can be tested without a Cesium scene. */
export function animationShouldRun(hasViewer: boolean, aircraftCount: number): boolean {
  return hasViewer && aircraftCount > 0;
}
