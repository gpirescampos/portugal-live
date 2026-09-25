import * as Cesium from 'cesium';

const BOUNDARY_URL = '/data/portugal-boundary.geojson';

/** Loads the static national outline as a separately owned Cesium data source. */
export async function addPortugalBoundary(viewer: Cesium.Viewer): Promise<Cesium.GeoJsonDataSource> {
  const source = await Cesium.GeoJsonDataSource.load(BOUNDARY_URL, {
    stroke: Cesium.Color.fromCssColorString('#8de6c0'),
    strokeWidth: 1.5,
    fill: Cesium.Color.TRANSPARENT,
    // Keep the line slightly above the globe so Cesium can render polygon outlines.
    clampToGround: false,
  });
  viewer.dataSources.add(source);
  viewer.scene.requestRender();
  return source;
}

export function removePortugalBoundary(viewer: Cesium.Viewer, source: Cesium.GeoJsonDataSource | null): void {
  if (source) viewer.dataSources.remove(source, true);
  viewer.scene.requestRender();
}
