import * as Cesium from 'cesium';

export const PORTUGAL_VIEW = {
  longitude: -8.2,
  latitude: 39.55,
  height: 1_450_000,
  heading: 0,
  pitch: Cesium.Math.toRadians(-89),
  roll: 0,
} as const;

export function flyToPortugal(viewer: Cesium.Viewer, duration = 1.2): void {
  viewer.camera.flyTo({
    destination: Cesium.Cartesian3.fromDegrees(
      PORTUGAL_VIEW.longitude,
      PORTUGAL_VIEW.latitude,
      PORTUGAL_VIEW.height,
    ),
    orientation: {
      heading: PORTUGAL_VIEW.heading,
      pitch: PORTUGAL_VIEW.pitch,
      roll: PORTUGAL_VIEW.roll,
    },
    duration,
  });
}
