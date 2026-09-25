import * as Cesium from 'cesium';
import { flyToPortugal } from './portugalView';

export async function createViewer(
  container: HTMLElement,
  credits: HTMLElement,
  hasIonToken: boolean,
): Promise<Cesium.Viewer> {
  const viewer = new Cesium.Viewer(container, {
    animation: false,
    baseLayerPicker: false,
    fullscreenButton: false,
    geocoder: false,
    homeButton: false,
    infoBox: false,
    navigationHelpButton: false,
    sceneModePicker: false,
    selectionIndicator: false,
    timeline: false,
    vrButton: false,
    creditContainer: credits,
    baseLayer: false,
    requestRenderMode: true,
    maximumRenderTimeChange: Infinity,
  });

  viewer.scene.globe.show = true;
  if (viewer.scene.skyAtmosphere) {
    viewer.scene.skyAtmosphere.show = true;
  }
  viewer.scene.backgroundColor = Cesium.Color.fromCssColorString('#071015');
  const imageryProvider = hasIonToken
    ? await Cesium.IonImageryProvider.fromAssetId(2)
    : new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
      });
  viewer.imageryLayers.addImageryProvider(imageryProvider);
  viewer.scene.requestRender();
  flyToPortugal(viewer, 0);
  return viewer;
}

export function destroyViewer(viewer: Cesium.Viewer | null): void {
  if (viewer) viewer.destroy();
}
