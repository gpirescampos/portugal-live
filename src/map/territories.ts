import * as Cesium from 'cesium';

export const PORTUGUESE_TERRITORIES = {
  // Frame the full archipelago, including the eastern camera locations.
  azores: { label: 'AÇORES', longitude: -27.7, latitude: 38.1, height: 500_000 },
  madeira: { label: 'MADEIRA', longitude: -16.95, latitude: 32.75, height: 140_000 },
} as const;

export function flyToTerritory(viewer: Cesium.Viewer, territory: keyof typeof PORTUGUESE_TERRITORIES): void {
  const target = PORTUGUESE_TERRITORIES[territory];
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(target.longitude, target.latitude, target.height),
    orientation: { heading: 0, pitch: Cesium.Math.toRadians(-89), roll: 0 },
    duration: 1.1,
  });
}
