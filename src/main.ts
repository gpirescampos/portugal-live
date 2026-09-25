import * as Cesium from 'cesium';
import './styles.css';
import { readConfig } from './config';
import { createViewer, destroyViewer } from './map/viewer';
import { flyToPortugal } from './map/portugalView';
import { addPortugalBoundary, removePortugalBoundary } from './map/portugalBoundary';
import { flyToTerritory } from './map/territories';
import { renderShell, setMapStatus, showCameraPanel, setCameraCatalogueStatus, setLayerControlExpanded, getLayerControlFilterSelection, showQualArStationDetails, showTideGaugeDetails } from './ui/shell';
import { LayerRegistry } from './data/layerRegistry';
import { PointLayerRenderer } from './rendering/pointLayer';
import { ProviderScheduler } from './data/scheduler';
import { MemoryProviderStore } from './domain/provider';
import { ipmaSeismicAdapter } from './providers/ipma-seismic/adapter';
import { setLayerStatus, setSeismicLegendVisible, setWarningLegendVisible, setFogosLegendVisible, showSeismicEventDetails, showWarningEventDetails, showFogosEventDetails, showAircraftEventDetails, showFirmsEventDetails } from './ui/shell';
import { ipmaWarningsAdapter } from './providers/ipma-warnings/adapter';
import { WarningAreaLayerRenderer } from './rendering/warningAreaLayer';
import { registerDataset } from './data/datasetRegistry';
import type { ProviderId } from './domain/world';
import { fogosAdapter } from './providers/fogos/adapter';
import { openSkyAdapter } from './providers/opensky/adapter';
import { AircraftLayerRenderer } from './rendering/aircraftLayer';
import { firmsAdapter } from './providers/firms/adapter';
import { qualArAdapter } from './providers/qualar/adapter';
import { groupQualArRecords } from './providers/qualar/parser';
import { QUALAR_PATH } from '../broker/contract.ts';
import { formatDatasetStatus } from './ui/datasetStatus';
import { clubeNavalSantaMariaCameraAdapter, funchalCameraAdapter, madeiraWebCameraAdapter, meoBeachcamCameraAdapter, meteoEstrelaCameraAdapter, netMadeiraCameraAdapter, portoLisboaCameraAdapter, viaVerdeCameraAdapter, vr1MadeiraCameraAdapter, VIAVERDE_CAMERA_BROKER_ENDPOINT } from './providers/cameras/adapter';
import { CameraLayerRenderer } from './rendering/cameraLayer';
import type { CameraProviderId } from './providers/cameras/types';
import { hidrograficoTideAdapter, TIDE_LOCATIONS_URL } from './providers/hidrografico-tide/adapter';
import { registerDatasetMarkerIcons } from './rendering/datasetMarker';
import { datasetMarkerIcons } from './rendering/datasetMarkerIcons';

registerDatasetMarkerIcons(datasetMarkerIcons);

const root = document.querySelector<HTMLElement>('#app');
if (!root) throw new Error('Portugal Live app root is missing');

renderShell(root);
const config = readConfig();
if (config.cesiumIonToken) Cesium.Ion.defaultAccessToken = config.cesiumIonToken;

const container = document.querySelector<HTMLElement>('#cesium-container');
const credits = document.querySelector<HTMLElement>('#cesium-credits');
if (!container || !credits) throw new Error('Portugal Live map containers are missing');

let viewer: Cesium.Viewer | null = null;
let portugalBoundary: Cesium.GeoJsonDataSource | null = null;
const layers = new LayerRegistry();
const pointRenderer = new PointLayerRenderer();
const fogosRenderer = new PointLayerRenderer();
const aircraftRenderer = new AircraftLayerRenderer();
const firmsRenderer = new PointLayerRenderer();
const qualArRenderer = new PointLayerRenderer();
const tideRenderer = new PointLayerRenderer();
const warningRenderer = new WarningAreaLayerRenderer();
const cameraRenderer = new CameraLayerRenderer();
const providerStore = new MemoryProviderStore();
const providerScheduler = new ProviderScheduler();
registerDataset({
  id: 'ipma', label: 'Sismicidade IPMA', recordNoun: 'EVENTOS',
  endpoint: 'https://api.ipma.pt/open-data/observation/seismic', adapter: ipmaSeismicAdapter,
  renderer: pointRenderer,
  formatStatus: (snapshot) => formatDatasetStatus(snapshot, 'EVENTOS'),
}, { layers, store: providerStore, scheduler: providerScheduler, setStatus: setLayerStatus });
registerDataset({
  id: 'opensky', label: 'Aeronaves', recordNoun: 'AERONAVES', endpoint: `${config.brokerBaseUrl}/api/providers/opensky/states`, adapter: openSkyAdapter,
  renderer: aircraftRenderer, getConfig: () => ({ brokerConfigured: true }),
  formatStatus: (snapshot) => formatDatasetStatus(snapshot, 'AERONAVES'),
}, { layers, store: providerStore, scheduler: providerScheduler, setStatus: setLayerStatus });
registerDataset({
  id: 'fogos', label: 'Incêndios rurais', recordNoun: 'INCIDENTES', endpoint: `${config.brokerBaseUrl}/api/providers/fogos/incidents`, adapter: fogosAdapter,
  renderer: fogosRenderer, getConfig: () => ({ apiKeyConfigured: true }),
  formatStatus: (snapshot) => formatDatasetStatus(snapshot, 'INCIDENTES'),
}, { layers, store: providerStore, scheduler: providerScheduler, setStatus: setLayerStatus });
registerDataset({
  id: 'ipma-warnings', label: 'Avisos IPMA', recordNoun: 'AVISOS',
  endpoint: 'https://api.ipma.pt/open-data/forecast/warnings/warnings_www.json', adapter: ipmaWarningsAdapter,
  renderer: warningRenderer,
  formatStatus: (snapshot) => formatDatasetStatus(snapshot, 'AVISOS'),
}, { layers, store: providerStore, scheduler: providerScheduler, setStatus: setLayerStatus });
registerDataset({
  id: 'firms', label: 'Deteções térmicas', recordNoun: 'DETEÇÕES', endpoint: `${config.brokerBaseUrl}/api/providers/firms/detections`, adapter: firmsAdapter,
  renderer: firmsRenderer, getConfig: () => ({ brokerConfigured: true }),
  formatStatus: (snapshot) => formatDatasetStatus(snapshot, 'DETEÇÕES'),
}, { layers, store: providerStore, scheduler: providerScheduler, setStatus: setLayerStatus });
registerDataset({
  id: 'qualar', label: 'Qualidade do ar', recordNoun: 'MEDIÇÕES', endpoint: `${config.brokerBaseUrl}${QUALAR_PATH}`, adapter: qualArAdapter,
  renderer: { render: (records) => qualArRenderer.render(groupQualArRecords(records)) }, getConfig: () => ({ brokerConfigured: true }),
  formatStatus: (snapshot) => formatDatasetStatus(snapshot, 'MEDIÇÕES'),
}, { layers, store: providerStore, scheduler: providerScheduler, setStatus: setLayerStatus });
registerDataset({
  id: 'hidrografico-tide', label: 'Marégrafos IH', recordNoun: 'ESTAÇÕES', endpoint: TIDE_LOCATIONS_URL, adapter: hidrograficoTideAdapter,
  renderer: tideRenderer,
  formatStatus: (snapshot) => `${snapshot.records.length} ESTAÇÕES · ${snapshot.status.state.toUpperCase()}`,
}, { layers, store: providerStore, scheduler: providerScheduler, setStatus: setLayerStatus });
const cameraProviderIds: CameraProviderId[] = ['camera-netmadeira', 'camera-portolisboa', 'camera-cnsantamaria', 'camera-meo-beachcam', 'camera-meteoestrela', 'camera-madeira-web', 'camera-viaverde', 'camera-vr1madeira', 'camera-funchal'];
let cameraLayerEnabled = false;
let activeCameraProviderIds = new Set<CameraProviderId>(cameraProviderIds);
function refreshCameraStatus(): void {
  const statuses = cameraProviderIds.map((id) => providerStore.get(id)?.status).filter((status): status is NonNullable<typeof status> => Boolean(status));
  const records = cameraProviderIds.flatMap((id) => providerStore.get(id)?.records ?? []);
  if (!statuses.length) return;
  const offline = records.filter((record) => record.properties.sourceStatus === 'offline').length;
  const unverified = records.filter((record) => record.properties.sourceStatus === 'unverified').length;
  const sourceNames: Record<CameraProviderId, string> = { 'camera-netmadeira': 'NetMadeira', 'camera-portolisboa': 'Porto de Lisboa', 'camera-cnsantamaria': 'Clube Naval de Santa Maria', 'camera-meo-beachcam': 'MEO Beachcam', 'camera-meteoestrela': 'MeteoEstrela', 'camera-madeira-web': 'Madeira-Web', 'camera-viaverde': 'Via Verde / Brisa', 'camera-vr1madeira': 'VR1 Madeira', 'camera-funchal': 'Município do Funchal' };
  const failed = statuses.filter((status) => ['error', 'unavailable', 'rate-limited'].includes(status.state)).map((status) => sourceNames[status.providerId as CameraProviderId] ?? status.providerId);
  const sourceSuffix = failed.length ? ` · FALHA: ${failed.join(', ')}` : '';
  const summary = `${records.length} LOCAIS · ${offline} INDISP. · ${unverified} POR VERIFICAR${sourceSuffix}`;
  setCameraCatalogueStatus(summary);
  const statusLabel = document.querySelector<HTMLElement>('#layer-cameras-status');
  if (statusLabel && cameraLayerEnabled) {
    const status = activeCameraProviderIds.size === 0 ? 'SEM FONTES ATIVAS' : statuses.every((entry) => entry.state === 'ready') ? 'CATÁLOGOS DISPONÍVEIS' : `CATÁLOGOS · ${statuses.map((entry) => entry.state.toUpperCase()).join(' / ')}`;
    setLayerStatus('cameras', status);
  }
}
for (const [id, adapter] of [['camera-netmadeira', netMadeiraCameraAdapter], ['camera-portolisboa', portoLisboaCameraAdapter], ['camera-cnsantamaria', clubeNavalSantaMariaCameraAdapter], ['camera-meo-beachcam', meoBeachcamCameraAdapter], ['camera-meteoestrela', meteoEstrelaCameraAdapter], ['camera-madeira-web', madeiraWebCameraAdapter], ['camera-viaverde', viaVerdeCameraAdapter], ['camera-vr1madeira', vr1MadeiraCameraAdapter], ['camera-funchal', funchalCameraAdapter]] as const) {
  registerDataset({ id, label: adapter.displayName, recordNoun: 'CÂMARAS', endpoint: id === 'camera-viaverde' ? `${config.brokerBaseUrl}${VIAVERDE_CAMERA_BROKER_ENDPOINT}` : '', adapter,
    renderer: cameraRenderer.forProvider(id), formatStatus: (snapshot) => {
      const unavailableCount = snapshot.records.filter((record) => record.properties.sourceStatus === 'offline').length;
      return `${snapshot.records.length} LOCAIS · ${unavailableCount} INDISPONÍVEIS`;
    },
  }, { layers, store: providerStore, scheduler: providerScheduler, setStatus: refreshCameraStatus });
}
void (async () => {
  try {
    viewer = await createViewer(container, credits, Boolean(config.cesiumIonToken));
    portugalBoundary = await addPortugalBoundary(viewer);
    pointRenderer.mount(viewer);
    fogosRenderer.mount(viewer);
    aircraftRenderer.mount(viewer);
      firmsRenderer.mount(viewer);
      qualArRenderer.mount(viewer);
      tideRenderer.mount(viewer);
    warningRenderer.mount(viewer);
    cameraRenderer.mount(viewer);
    let selectedAircraft: Cesium.Entity | undefined;
    viewer.selectedEntityChanged.addEventListener((entity) => {
      selectedAircraft = entity?.properties && entity.properties.getValue(Cesium.JulianDate.now()).providerId === 'opensky' ? entity : undefined;
      aircraftRenderer.setSelectedAircraft(selectedAircraft?.id ?? null);
      const selectedProviderId = entity?.properties?.getValue(Cesium.JulianDate.now()).providerId;
      const recordId = entity?.properties?.getValue(Cesium.JulianDate.now()).recordId;
      const selectedRecordId = typeof recordId === 'string' ? recordId : null;
      pointRenderer.setSelectedRecord(selectedProviderId === 'ipma' ? selectedRecordId : null);
      fogosRenderer.setSelectedRecord(selectedProviderId === 'fogos' ? selectedRecordId : null);
      firmsRenderer.setSelectedRecord(selectedProviderId === 'firms' ? selectedRecordId : null);
      qualArRenderer.setSelectedRecord(selectedProviderId === 'qualar' ? selectedRecordId : null);
      tideRenderer.setSelectedRecord(selectedProviderId === 'hidrografico-tide' ? selectedRecordId : null);
      warningRenderer.setSelectedRecord(selectedProviderId === 'ipma-warnings' ? selectedRecordId : null);
      const selectedCameraId = cameraProviderIds.includes(selectedProviderId as CameraProviderId) ? entity!.id : null;
      cameraRenderer.setSelectedCamera(selectedCameraId);
      if (!entity?.properties) {
        showCameraPanel(null);
        showSeismicEventDetails(null);
        return;
      }
      const values = entity.properties.getValue(Cesium.JulianDate.now()) as Record<string, unknown>;
      const value = (name: string) => values[name];
      if (cameraProviderIds.includes(value('providerId') as CameraProviderId)) {
        showCameraPanel({ name: String(value('name') ?? 'Câmara'), sourcePage: String(value('sourcePage') ?? 'https://www.netmadeira.com/webcams-madeira/mapa'), mediaMode: String(value('mediaMode') ?? 'link'), mediaUrl: typeof value('mediaUrl') === 'string' ? value('mediaUrl') as string : undefined, sourceStatus: String(value('sourceStatus') ?? 'unverified') });
        return;
      }
      showCameraPanel(null);
      if (value('providerId') === 'opensky') {
        showAircraftEventDetails({ callsign: typeof value('callsign') === 'string' ? (value('callsign') as string).trim() || undefined : undefined, country: typeof value('originCountry') === 'string' ? value('originCountry') as string : undefined, altitude: typeof value('geoAltitudeM') === 'number' ? `${Math.round(value('geoAltitudeM') as number)} m` : undefined, speed: typeof value('velocityMps') === 'number' ? `${Math.round((value('velocityMps') as number) * 3.6)} km/h` : undefined, heading: typeof value('headingDegrees') === 'number' ? `${Math.round(value('headingDegrees') as number)}°` : undefined, age: typeof value('observedAt') === 'string' ? `Observado ${new Date(value('observedAt') as string).toLocaleString('pt-PT')}` : undefined });
        return;
      }
      if (value('providerId') === 'fogos') {
        const resources = values.resources as Record<string, unknown> | undefined;
        const resourceLabels: Record<string, string> = { personnel: 'Operacionais', terrestrial: 'Terrestres', aerial: 'Aéreos', aquatic: 'Aquáticos' };
        const resourceParts = resources ? Object.entries(resources).filter(([, v]) => typeof v === 'number' && v > 0).map(([k, v]) => `${resourceLabels[k] ?? k}: ${v}`).join(' · ') : undefined;
        showFogosEventDetails({ nature: typeof value('nature') === 'string' ? value('nature') as string : undefined, status: typeof value('status') === 'string' ? value('status') as string : undefined, location: typeof value('municipality') === 'string' ? value('municipality') as string : undefined, startedAt: typeof value('startedAt') === 'string' ? new Date(value('startedAt') as string).toLocaleString('pt-PT') : undefined, resources: resourceParts, age: typeof value('observedAt') === 'string' ? `Observado ${new Date(value('observedAt') as string).toLocaleString('pt-PT')}` : undefined });
        return;
      }
      if (value('providerId') === 'firms') {
        const confidenceValue = value('confidence');
        const confidenceLabel = confidenceValue === 'high' ? 'Alta' : confidenceValue === 'nominal' ? 'Nominal' : confidenceValue === 'low' ? 'Baixa' : typeof confidenceValue === 'string' ? confidenceValue : undefined;
        const frp = typeof value('frpMw') === 'number' ? value('frpMw') as number : undefined;
        const bt = typeof value('brightTi4Kelvin') === 'number' ? value('brightTi4Kelvin') as number : undefined;
        const longitude = typeof value('longitude') === 'number' ? value('longitude') as number : undefined;
        const latitude = typeof value('latitude') === 'number' ? value('latitude') as number : undefined;
        const region = value('regionId') === 'mainland' ? 'Portugal continental' : value('regionId') === 'madeira' ? 'Madeira' : value('regionId') === 'azores' ? 'Açores' : undefined;
        showFirmsEventDetails({
          satellite: typeof value('satellite') === 'string' ? value('satellite') as string : undefined,
          confidence: confidenceLabel, frp: frp !== undefined ? `${frp.toFixed(1)} MW` : undefined,
          brightness: bt !== undefined ? `${bt.toFixed(1)} K (canal I4)` : undefined,
          instrument: typeof value('instrument') === 'string' ? value('instrument') as string : undefined,
          region,
          coordinates: longitude !== undefined && latitude !== undefined ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : undefined,
          age: typeof value('observedAt') === 'string' ? `Aquisição ${new Date(value('observedAt') as string).toLocaleString('pt-PT')}` : undefined,
        });
        return;
      }
      if (value('providerId') === 'qualar') {
        const measurements = Array.isArray(value('measurements')) ? value('measurements') as Array<Record<string, unknown>> : [];
        const stationType = value('stationType');
        showQualArStationDetails({
          name: String(value('stationName') ?? 'Estação de qualidade do ar'), stationId: String(value('stationId') ?? ''),
          stationType: typeof stationType === 'string' ? stationType : undefined,
          measurements: measurements.map((measurement) => ({
            pollutant: String(measurement.pollutant), value: Number(measurement.value), unit: String(measurement.unit), averagingPeriod: String(measurement.averagingPeriod),
            observedAt: String(measurement.observedAt), freshness: String(measurement.freshness ?? 'unknown'),
            sourceQuality: typeof measurement.sourceQuality === 'string' ? measurement.sourceQuality : undefined,
          })),
        });
        return;
      }
      if (value('providerId') === 'hidrografico-tide') {
        const observedAt = typeof value('observedAt') === 'string' ? value('observedAt') as string : undefined;
        showTideGaugeDetails({
          name: String(value('stationName') ?? 'Marégrafo'), stationId: String(value('stationId') ?? ''),
          heightMetres: typeof value('heightMetres') === 'number' ? value('heightMetres') as number : undefined,
          observedAt, freshness: typeof value('freshness') === 'string' ? value('freshness') as string : undefined,
          coverage: providerStore.get('hidrografico-tide')?.status.recordCount ? `${providerStore.get('hidrografico-tide')!.status.recordCount} estações ativas` : undefined,
        });
        return;
      }
      if (typeof value('warningType') === 'string') {
        const validity = typeof value('validity') === 'string' ? value('validity') as string : undefined;
        const validityLabel = validity === 'active' ? 'Em vigor' : validity === 'upcoming' ? 'Futuro' : validity;
        showWarningEventDetails({
          warningType: value('warningType') as string,
          severity: typeof value('severity') === 'string' ? ({ yellow: 'Amarelo', orange: 'Laranja', red: 'Vermelho' }[value('severity') as string] ?? value('severity') as string) : undefined,
          validity: validityLabel,
          area: typeof value('areaName') === 'string' ? value('areaName') as string : typeof value('areaCode') === 'string' ? value('areaCode') as string : undefined,
          age: typeof value('validUntil') === 'string' ? `até ${new Date(value('validUntil') as string).toLocaleString('pt-PT')}` : undefined,
        });
        return;
      }
      const observedAt = typeof value('observedAt') === 'string' ? value('observedAt') as string : undefined;
      const magnitude = typeof value('magnitude') === 'number' ? value('magnitude') as number : undefined;
      const depthKm = typeof value('depthKm') === 'number' ? value('depthKm') as number : undefined;
      const region = typeof value('region') === 'string' ? value('region') as string : undefined;
      showSeismicEventDetails({
        title: 'Evento sísmico',
        magnitude: magnitude !== undefined ? `M ${magnitude.toFixed(1)}` : undefined,
        depth: depthKm !== undefined ? `${depthKm.toFixed(1)} km` : undefined,
        time: observedAt ? new Date(observedAt).toLocaleString('pt-PT') : undefined,
        region,
        age: observedAt ? `Observado ${new Date(observedAt).toLocaleString('pt-PT')}` : undefined,
      });
    });
    document.querySelector<HTMLButtonElement>('#event-details-follow')?.addEventListener('click', () => {
      if (!viewer || !selectedAircraft) return;
      viewer.trackedEntity = viewer.trackedEntity === selectedAircraft ? undefined : selectedAircraft;
      const button = document.querySelector<HTMLButtonElement>('#event-details-follow');
      if (button) button.textContent = viewer.trackedEntity === selectedAircraft ? 'PARAR DE SEGUIR' : 'SEGUIR AERONAVE';
    });
    document.querySelector<HTMLButtonElement>('#event-details-close')?.addEventListener('click', () => {
      if (viewer) {
        viewer.trackedEntity = undefined;
        viewer.selectedEntity = undefined;
      }
      selectedAircraft = undefined;
    });
    setMapStatus(config.cesiumIonToken ? 'MAPA PRONTO / ION' : 'MAPA PRONTO / SEM CHAVE', 'ready');
    if (!config.cesiumIonToken) {
      const fallback = document.querySelector<HTMLElement>('#map-fallback');
      if (fallback) fallback.hidden = false;
    }
  } catch (error) {
    console.error('[Portugal Live] Cesium initialization failed', error);
    setMapStatus('FALHA AO INICIALIZAR O MAPA', 'error');
  }
})();

document.querySelector<HTMLButtonElement>('#reset-view')?.addEventListener('click', () => {
  if (viewer) flyToPortugal(viewer);
});
document.querySelector<HTMLButtonElement>('#zoom-in')?.addEventListener('click', () => {
  if (viewer) viewer.camera.zoomIn(Math.max(viewer.camera.positionCartographic.height * 0.35, 10_000));
});
document.querySelector<HTMLButtonElement>('#zoom-out')?.addEventListener('click', () => {
  if (viewer) viewer.camera.zoomOut(Math.max(viewer.camera.positionCartographic.height * 0.35, 10_000));
});
document.querySelector<HTMLButtonElement>('#focus-azores')?.addEventListener('click', () => {
  if (viewer) flyToTerritory(viewer, 'azores');
});
document.querySelector<HTMLButtonElement>('#focus-madeira')?.addEventListener('click', () => {
  if (viewer) flyToTerritory(viewer, 'madeira');
});

document.querySelector<HTMLButtonElement>('#tilt-view')?.addEventListener('click', () => {
  if (!viewer) return;
  const camera = viewer.camera;
  const cartographic = camera.positionCartographic;
  camera.flyTo({
    destination: Cesium.Cartesian3.fromRadians(
      cartographic.longitude,
      cartographic.latitude,
      Math.max(cartographic.height, 650_000),
    ),
    orientation: {
      heading: camera.heading,
      pitch: Cesium.Math.toRadians(-48),
      roll: camera.roll,
    },
    duration: 0.8,
  });
});

function bindDatasetToggle(options: {
  id: ProviderId;
  loadingLabel: string;
  disabledLabel: string;
  legend: (visible: boolean) => void;
  clear: () => void;
}): void {
  document.querySelector<HTMLButtonElement>(`#layer-${options.id}`)?.addEventListener('click', (event) => {
    const button = event.currentTarget as HTMLButtonElement;
    const enabled = !layers.isEnabled(options.id);
    layers.setEnabled(options.id, enabled);
    options.legend(enabled);
    if (enabled) providerScheduler.start(options.id);
    else {
      providerScheduler.stop(options.id);
      options.clear();
    }
    button.setAttribute('aria-pressed', String(enabled));
    const status = document.querySelector<HTMLElement>(`#layer-${options.id}-status`);
    if (status) status.textContent = enabled ? options.loadingLabel : options.disabledLabel;
    setLayerStatus(options.id, status?.textContent ?? '', enabled);
  });
}

bindDatasetToggle({ id: 'ipma', loadingLabel: 'A CARREGAR · IPMA', disabledLabel: 'DESLIGADO · OBSERVAÇÕES HORÁRIAS', legend: setSeismicLegendVisible, clear: () => pointRenderer.render([]) });
bindDatasetToggle({ id: 'ipma-warnings', loadingLabel: 'A CARREGAR · IPMA', disabledLabel: 'DESLIGADO · ATUALIZAÇÃO FREQUENTE', legend: setWarningLegendVisible, clear: () => warningRenderer.clear() });
bindDatasetToggle({ id: 'fogos', loadingLabel: 'A CARREGAR · FOGOS.PT', disabledLabel: 'DESLIGADO · FOGOS.PT', legend: setFogosLegendVisible, clear: () => fogosRenderer.clear() });
bindDatasetToggle({ id: 'opensky', loadingLabel: 'A CARREGAR · OPENSKY', disabledLabel: 'DESLIGADO · OPENSKY', legend: (visible) => { const legend = document.querySelector<HTMLElement>('#aircraft-legend'); if (legend) legend.hidden = !visible; }, clear: () => aircraftRenderer.clear() });
bindDatasetToggle({ id: 'firms', loadingLabel: 'A CARREGAR · NASA FIRMS', disabledLabel: 'DESLIGADO · NASA FIRMS', legend: (visible) => { const legend = document.querySelector<HTMLElement>('#firms-legend'); if (legend) legend.hidden = !visible; }, clear: () => firmsRenderer.clear() });
bindDatasetToggle({ id: 'qualar', loadingLabel: 'A CARREGAR · EEA E2a', disabledLabel: 'DESLIGADO · EEA E2a · DADOS NÃO VERIFICADOS', legend: (visible) => { const legend = document.querySelector<HTMLElement>('#qualar-legend'); if (legend) legend.hidden = !visible; }, clear: () => qualArRenderer.clear() });
bindDatasetToggle({ id: 'hidrografico-tide', loadingLabel: 'A CARREGAR · IH L1', disabledLabel: 'DESLIGADO · IH L1 · ZH', legend: (visible) => { const legend = document.querySelector<HTMLElement>('#hidrografico-tide-legend'); if (legend) legend.hidden = !visible; }, clear: () => tideRenderer.clear() });
function syncCameraLayer(): void {
  const button = document.querySelector<HTMLButtonElement>('#layer-cameras');
  const enabled = cameraLayerEnabled;
  for (const id of cameraProviderIds) {
    const sourceEnabled = enabled && activeCameraProviderIds.has(id);
    if (layers.isEnabled(id) === sourceEnabled) continue;
    layers.setEnabled(id, sourceEnabled);
    if (sourceEnabled) providerScheduler.start(id);
    else {
      providerScheduler.stop(id);
      cameraRenderer.clear(id);
    }
  }
  const legend = document.querySelector<HTMLElement>('#camera-netmadeira-legend');
  if (legend) legend.hidden = !enabled || activeCameraProviderIds.size === 0;
  button?.setAttribute('aria-pressed', String(enabled));
  setLayerControlExpanded('cameras', enabled);
  const status = document.querySelector<HTMLElement>('#layer-cameras-status');
  if (status) status.textContent = !enabled ? 'DESLIGADO' : activeCameraProviderIds.size === 0 ? 'SEM FONTES ATIVAS' : 'A CARREGAR · CATÁLOGOS';
  setLayerStatus('cameras', status?.textContent ?? '', enabled);
  if (!enabled) { cameraRenderer.clear(); showCameraPanel(null); }
  refreshCameraStatus();
}

document.querySelector<HTMLButtonElement>('#layer-cameras')?.addEventListener('click', () => {
  cameraLayerEnabled = !cameraLayerEnabled;
  syncCameraLayer();
});
document.querySelectorAll<HTMLInputElement>('[data-layer-filter="cameras"]').forEach((input) => {
  input.addEventListener('change', () => {
    const selected = new Set(getLayerControlFilterSelection('cameras'));
    activeCameraProviderIds = new Set(cameraProviderIds.filter((id) => selected.has(id)));
    syncCameraLayer();
  });
});
document.querySelector<HTMLButtonElement>('#camera-panel-close')?.addEventListener('click', () => { showCameraPanel(null); const owner = viewer?.selectedEntity?.properties?.getValue(Cesium.JulianDate.now()).providerId; if (cameraProviderIds.includes(owner as CameraProviderId)) viewer!.selectedEntity = undefined; });

window.addEventListener('beforeunload', () => {
  providerScheduler.destroy();
  pointRenderer.destroy(viewer ?? undefined);
  fogosRenderer.destroy(viewer ?? undefined);
  aircraftRenderer.destroy(viewer ?? undefined);
  firmsRenderer.destroy(viewer ?? undefined);
  qualArRenderer.destroy(viewer ?? undefined);
  tideRenderer.destroy(viewer ?? undefined);
  warningRenderer.clear();
  cameraRenderer.destroy();
  if (viewer) removePortugalBoundary(viewer, portugalBoundary);
  destroyViewer(viewer);
}, { once: true });
