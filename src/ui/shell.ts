import { legendDefinitions, renderLegend } from './legend';

interface LayerFilterOption { value: string; label: string; count?: number; }
interface LayerControlOption {
  id: string;
  label: string;
  swatch: 'air' | 'weather' | 'fire' | 'thermal' | 'camera' | 'tide';
  status: string;
  filters?: readonly LayerFilterOption[];
}

function renderLayerControl({ id, label, swatch, status, filters }: LayerControlOption): string {
  const expandable = Boolean(filters?.length);
  const filterPanel = expandable ? `
    <fieldset class="layer-filter-panel" id="layer-${id}-filters" aria-label="Filtros de ${label}" hidden>
      <legend>FILTRAR POR FONTE</legend>
      ${filters!.map(({ value, label: filterLabel, count }) => `
        <label class="layer-filter-option">
          <input type="checkbox" data-layer-filter="${id}" value="${value}" checked>
          <span>${filterLabel}</span>${count === undefined ? '' : `<small>${count}</small>`}
        </label>
      `).join('')}
    </fieldset>` : '';
  return `<div class="layer-control" data-layer-control="${id}">
    <button class="layer-row layer-row--toggle" id="layer-${id}" type="button" aria-pressed="false"${expandable ? ` aria-expanded="false" aria-controls="layer-${id}-filters"` : ''}>
      <span class="layer-swatch layer-swatch--${swatch}"></span>
      <span><strong>${label}</strong><small id="layer-${id}-status">${status}</small>${id === 'cameras' ? '<small id="layer-cameras-count" hidden></small>' : ''}</span>
      ${expandable ? '<span class="layer-row-expand-icon" aria-hidden="true">⌄</span>' : ''}
    </button>${filterPanel}
  </div>`;
}

const layerControls: LayerControlOption[] = [
  { id: 'opensky', label: 'Aeronaves', swatch: 'air', status: 'DESLIGADO · OPENSKY' },
  { id: 'ipma', label: 'Sismicidade IPMA', swatch: 'weather', status: 'DESLIGADO · OBSERVAÇÕES HORÁRIAS' },
  { id: 'ipma-warnings', label: 'Avisos IPMA', swatch: 'weather', status: 'DESLIGADO · ATUALIZAÇÃO FREQUENTE' },
  { id: 'fogos', label: 'Incêndios rurais', swatch: 'fire', status: 'DESLIGADO · FOGOS.PT' },
  { id: 'firms', label: 'Deteções térmicas', swatch: 'thermal', status: 'DESLIGADO · NASA FIRMS' },
  { id: 'qualar', label: 'Qualidade do ar', swatch: 'weather', status: 'DESLIGADO · EEA E2a · DADOS NÃO VERIFICADOS' },
  { id: 'hidrografico-tide', label: 'Marégrafos IH', swatch: 'tide', status: 'DESLIGADO · L1 · ZH · SEM CONTROLO DE QUALIDADE' },
  {
    id: 'cameras', label: 'Câmaras', swatch: 'camera', status: 'DESLIGADO',
    filters: [
      { value: 'camera-netmadeira', label: 'NetMadeira', count: 28 },
      { value: 'camera-portolisboa', label: 'Porto de Lisboa', count: 2 },
      { value: 'camera-cnsantamaria', label: 'Clube Naval de Santa Maria', count: 1 },
      { value: 'camera-meo-beachcam', label: 'MEO Beachcam', count: 185 },
      { value: 'camera-meteoestrela', label: 'MeteoEstrela', count: 5 },
      { value: 'camera-madeira-web', label: 'Madeira-Web', count: 30 },
      { value: 'camera-viaverde', label: 'Via Verde / Brisa', count: 100 },
      { value: 'camera-vr1madeira', label: 'VR1 Madeira', count: 71 },
      { value: 'camera-funchal', label: 'Município do Funchal', count: 3 },
    ],
  },
];

export function renderShell(root: HTMLElement): void {
  root.innerHTML = `
    <main class="app-shell">
      <header class="topbar">
        <div class="brand-lockup">
          <span class="brand-mark" aria-hidden="true"></span>
          <div>
          <p class="eyebrow">MAPA NACIONAL DE SINAIS</p>
            <h1>Portugal Live</h1>
          </div>
        </div>
        <div class="topbar-status" aria-live="polite">
          <span class="status-dot status-dot--amber"></span>
          <span id="map-status">A INICIALIZAR O MAPA</span>
        </div>
      </header>

      <section class="map-stage" aria-label="Mapa Portugal Live">
        <div id="cesium-container" class="map-canvas"></div>
        <div class="map-vignette" aria-hidden="true"></div>
        <div class="map-reticle" aria-hidden="true"><span></span></div>

        <aside class="layer-rail" aria-label="Camadas de dados">
          <div class="rail-heading"><span>CAMADAS DE DADOS</span><span class="rail-count">00 / 08</span></div>
          ${layerControls.map(renderLayerControl).join('')}
        </aside>

        <div class="map-readout" aria-label="Informação da vista do mapa">
          <span>PORTUGAL / VISTA NACIONAL</span>
          <span>2.5D PRONTO</span>
        </div>

        <aside class="territory-locator" aria-label="Territórios portugueses">
          <p class="eyebrow">TERRITÓRIOS PORTUGUESES</p>
          <button id="focus-azores" type="button"><span class="locator-dot"></span>AÇORES</button>
          <button id="focus-madeira" type="button"><span class="locator-dot"></span>MADEIRA</button>
        </aside>

        <div class="map-legends" aria-label="Legendas das camadas ativas">
          ${renderLegend(legendDefinitions.seismic)}
          ${renderLegend(legendDefinitions.warnings)}
          ${renderLegend(legendDefinitions.fogos)}
          ${renderLegend(legendDefinitions.aircraft)}
          ${renderLegend(legendDefinitions.firms)}
          ${renderLegend(legendDefinitions.qualar)}
          ${renderLegend(legendDefinitions.tide)}
          ${renderLegend(legendDefinitions.cameras)}
        </div>

        <aside class="event-details" id="event-details" aria-live="polite" hidden>
          <button class="event-details-close" id="event-details-close" type="button" aria-label="Fechar detalhes do evento">×</button>
          <p class="eyebrow" id="event-details-eyebrow">EVENTO SELECIONADO</p>
          <h2 id="event-details-title">Evento sísmico</h2>
          <dl id="event-details-fields"></dl>
          <p class="event-details-provenance"><span id="event-details-provenance-label">Fonte</span> · <span id="event-details-age">—</span> · <a id="event-details-source-link" target="_blank" rel="noopener noreferrer" hidden>Origem</a><span id="event-details-terms-separator" hidden> · </span><a id="event-details-terms-link" target="_blank" rel="noopener noreferrer" hidden>Licença CC BY-NC 4.0</a></p>
        </aside>

        <aside class="camera-panel" id="camera-panel" aria-live="polite" hidden>
          <button class="event-details-close" id="camera-panel-close" type="button" aria-label="Fechar câmara">×</button>
          <h2 id="camera-panel-title">Câmara</h2>
          <div class="camera-viewer" id="camera-viewer"></div>
          <a id="camera-source-link" href="https://www.netmadeira.com/webcams-madeira/mapa" target="_blank" rel="noopener noreferrer">Abrir transmissão</a>
        </aside>

        <div class="map-controls" aria-label="Controlos do mapa">
          <button id="zoom-out" type="button" aria-label="Diminuir zoom">−</button>
          <button id="zoom-in" type="button" aria-label="Aumentar zoom">+</button>
          <button id="reset-view" type="button">REPOR VISTA</button>
          <button id="tilt-view" type="button">INCLINAR</button>
        </div>

        <div class="map-fallback" id="map-fallback" hidden>
          <p class="eyebrow">CONFIGURAÇÃO DO MAPA</p>
          <p>O Cesium está a funcionar sem um token ion. Adicione <code>VITE_CESIUM_ION_TOKEN</code> a <code>.env.local</code> para utilizar recursos alojados no ion.</p>
        </div>

        <div class="cesium-credit-slot" id="cesium-credits"></div>
      </section>
    </main>
  `;
}

export function setMapStatus(status: string, tone: 'ready' | 'amber' | 'error' = 'amber'): void {
  const label = document.querySelector<HTMLElement>('#map-status');
  const dot = document.querySelector<HTMLElement>('.topbar-status .status-dot');
  if (label) label.textContent = status;
  if (dot) dot.className = `status-dot status-dot--${tone}`;
}

export type LayerStatusTone = 'ready' | 'amber' | 'error';

/** Updates a layer's compact status without coupling the UI to a provider. */
export function setLayerStatus(layerId: string, status: string, enabled?: boolean): void {
  const button = document.querySelector<HTMLButtonElement>(`#layer-${layerId}`);
  const label = document.querySelector<HTMLElement>(`#layer-${layerId}-status`);
  if (label) label.textContent = status;
  if (button && enabled !== undefined) button.setAttribute('aria-pressed', String(enabled));
  const rows = [...document.querySelectorAll<HTMLButtonElement>('.layer-row--toggle')];
  const activeCount = rows.filter((row) => row.getAttribute('aria-pressed') === 'true').length;
  const totalCount = rows.length;
  const count = document.querySelector<HTMLElement>('.rail-count');
  if (count) count.textContent = `${String(activeCount).padStart(2, '0')} / ${String(totalCount).padStart(2, '0')}`;
}

export function setLayerControlExpanded(layerId: string, expanded: boolean): void {
  const button = document.querySelector<HTMLButtonElement>(`#layer-${layerId}`);
  const panel = document.querySelector<HTMLElement>(`#layer-${layerId}-filters`);
  if (!button || !panel) return;
  button.setAttribute('aria-expanded', String(expanded));
  panel.hidden = !expanded;
}

export function getLayerControlFilterSelection(layerId: string): string[] {
  return [...document.querySelectorAll<HTMLInputElement>(`[data-layer-filter="${layerId}"]:checked`)].map((input) => input.value);
}

export function setSeismicLegendVisible(visible: boolean): void {
  const legend = document.querySelector<HTMLElement>('#ipma-legend');
  if (legend) legend.hidden = !visible;
}

export function setWarningLegendVisible(visible: boolean): void {
  const legend = document.querySelector<HTMLElement>('#ipma-warnings-legend');
  if (legend) legend.hidden = !visible;
}
export function setFogosLegendVisible(visible: boolean): void {
  const legend = document.querySelector<HTMLElement>('#fogos-legend'); if (legend) legend.hidden = !visible;
}

export interface SeismicEventDetails {
  title?: string;
  magnitude?: string;
  depth?: string;
  time?: string;
  region?: string;
  age?: string;
}

export interface WarningEventDetails {
  warningType?: string;
  severity?: string;
  validity?: string;
  area?: string;
  age?: string;
}

/** Declarative presentation contract for any selected dataset record. */
export interface EventDetailsSchema {
  title: string;
  eyebrow?: string;
  fields: ReadonlyArray<{ label: string; value: string | undefined }>;
  provenanceLabel: string;
  freshness?: string;
  sourceUrl?: string;
  termsUrl?: string;
}

function setEventDetail(id: string, value: string | undefined): void {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (element) element.textContent = value || '—';
}

/** Renders the shared inspector shell from a dataset-specific schema. */
export function renderEventDetails(schema: EventDetailsSchema | null): void {
  const panel = document.querySelector<HTMLElement>('#event-details');
  if (!panel) return;
  if (!schema) { panel.hidden = true; return; }
  panel.hidden = false;
  const follow = document.querySelector<HTMLButtonElement>('#event-details-follow'); if (follow && schema.title !== 'Aeronave') follow.hidden = true;
  setEventDetail('event-details-title', schema.title);
  setEventDetail('event-details-eyebrow', schema.eyebrow ?? 'EVENTO SELECIONADO');
  const fields = document.querySelector<HTMLElement>('#event-details-fields');
  if (fields) {
    fields.replaceChildren(...schema.fields.map(({ label, value }) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const description = document.createElement('dd');
      term.textContent = label;
      description.textContent = value || '—';
      row.append(term, description);
      return row;
    }));
  }
  setEventDetail('event-details-provenance-label', schema.provenanceLabel);
  setEventDetail('event-details-age', schema.freshness);
  const sourceLink = document.querySelector<HTMLAnchorElement>('#event-details-source-link');
  if (sourceLink) { sourceLink.hidden = !schema.sourceUrl; if (schema.sourceUrl) sourceLink.href = schema.sourceUrl; }
  const termsLink = document.querySelector<HTMLAnchorElement>('#event-details-terms-link');
  const termsSeparator = document.querySelector<HTMLElement>('#event-details-terms-separator');
  if (termsLink) { termsLink.hidden = !schema.termsUrl; if (schema.termsUrl) termsLink.href = schema.termsUrl; }
  if (termsSeparator) termsSeparator.hidden = !schema.termsUrl;
}

/** Displays a selected event's source-backed details, or closes the card. */
export function showSeismicEventDetails(details: SeismicEventDetails | null): void {
  renderEventDetails(details && { title: details.title ?? 'Evento sísmico', provenanceLabel: 'Observado pelo IPMA', freshness: details.age, fields: [
    { label: 'Magnitude', value: details.magnitude },
    { label: 'Profundidade', value: details.depth },
    { label: 'Hora', value: details.time },
    { label: 'Região', value: details.region },
  ] });
}

/** Displays provider-specific warning details using the same inspector shell. */
export function showWarningEventDetails(details: WarningEventDetails | null): void {
  renderEventDetails(details && { title: 'Aviso meteorológico', provenanceLabel: 'Fonte IPMA', freshness: details.age, fields: [
    { label: 'Fenómeno', value: details.warningType },
    { label: 'Nível', value: details.severity },
    { label: 'Validade', value: details.validity },
    { label: 'Área', value: details.area },
  ] });
}
export interface FogosEventDetails { nature?: string; status?: string; location?: string; startedAt?: string; resources?: string; age?: string; }
export function showFogosEventDetails(details: FogosEventDetails | null): void {
  renderEventDetails(details && { title: 'Incêndio rural', provenanceLabel: 'Fonte Fogos.pt', freshness: details.age, fields: [
    { label: 'Natureza', value: details.nature }, { label: 'Estado', value: details.status },
    { label: 'Local', value: details.location }, { label: 'Início', value: details.startedAt }, { label: 'Meios', value: details.resources },
  ] });
}
export interface AircraftEventDetails { callsign?: string; country?: string; altitude?: string; speed?: string; heading?: string; age?: string; }
export function showAircraftEventDetails(details: AircraftEventDetails | null): void {
  const follow = document.querySelector<HTMLButtonElement>('#event-details-follow'); if (follow) follow.hidden = !details;
  renderEventDetails(details && { title: 'Aeronave', provenanceLabel: 'Fonte OpenSky Network', freshness: details.age, fields: [
    { label: 'Indicativo', value: details.callsign }, { label: 'Origem', value: details.country },
    { label: 'Altitude', value: details.altitude }, { label: 'Velocidade', value: details.speed }, { label: 'Rumo', value: details.heading },
  ] });
}
export interface FirmsEventDetails { satellite?: string; confidence?: string; frp?: string; brightness?: string; instrument?: string; region?: string; coordinates?: string; age?: string; }
export function showFirmsEventDetails(details: FirmsEventDetails | null): void {
  renderEventDetails(details && { title: 'Deteção térmica por satélite', provenanceLabel: 'Fonte NASA FIRMS', freshness: details.age, fields: [
    { label: 'Satélite', value: details.satellite },
    { label: 'Instrumento', value: details.instrument }, { label: 'Confiança', value: details.confidence },
    { label: 'Potência radiativa', value: details.frp }, { label: 'Temperatura de brilho', value: details.brightness },
    { label: 'Região', value: details.region }, { label: 'Coordenadas', value: details.coordinates },
  ] });
}

export interface QualArMeasurementDetail { pollutant: string; value: number; unit: string; averagingPeriod: string; observedAt: string; sourceQuality?: string; freshness?: string; }
export function showQualArStationDetails(details: { name: string; stationId: string; stationType?: string; measurements: QualArMeasurementDetail[] } | null): void {
  if (!details) { renderEventDetails(null); return; }
  const freshestAge = details.measurements.some(({ freshness }) => freshness === 'stale') ? 'inclui medições desatualizadas' : 'medições recentes';
  const verification = details.measurements.some(({ sourceQuality }) => sourceQuality === '3') ? 'EEA · Portugal · E2a não verificado' : 'EEA · dados comunicados por Portugal (E2a)';
  renderEventDetails({ title: details.name, provenanceLabel: verification, sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/778ef9f5-6293-4846-badd-56a29c70880d', freshness: freshestAge,
    fields: [
      ...details.measurements.flatMap((measurement) => [
        { label: measurement.pollutant, value: `${measurement.value.toLocaleString('pt-PT', { maximumFractionDigits: 3 })} ${measurement.unit} · média ${measurement.averagingPeriod}` },
        { label: `Observado · ${measurement.pollutant}`, value: new Date(measurement.observedAt).toLocaleString('pt-PT') },
      ]),
    ],
  });
  const fields = document.querySelector<HTMLElement>('#event-details-fields');
  if (!fields) return;
  fields.parentElement?.querySelector('.qualar-station-meta')?.remove();
  const detailsElement = document.createElement('details');
  detailsElement.className = 'qualar-station-meta';
  const summary = document.createElement('summary');
  summary.textContent = 'Detalhes da estação';
  detailsElement.append(summary);
  const stationList = document.createElement('dl');
  for (const [label, value] of [['Estação', details.stationId], ['Tipo de estação', details.stationType]] as const) {
    if (!value) continue;
    const row = document.createElement('div');
    const term = document.createElement('dt'); term.textContent = label;
    const description = document.createElement('dd'); description.textContent = value;
    row.append(term, description); stationList.append(row);
  }
  detailsElement.append(stationList);
  fields.insertAdjacentElement('afterend', detailsElement);
}

export function showTideGaugeDetails(details: { name: string; stationId: string; heightMetres?: number; observedAt?: string; freshness?: string; coverage?: string } | null): void {
  if (!details) { renderEventDetails(null); return; }
  const age = details.observedAt ? Math.max(0, Date.now() - Date.parse(details.observedAt)) : NaN;
  const ageLabel = Number.isFinite(age) ? age < 60_000 ? 'há menos de 1 minuto' : `há ${Math.floor(age / 60_000)} min` : 'sem observação válida';
  renderEventDetails({ title: details.name, eyebrow: 'MARÉGRAFO SELECIONADO', provenanceLabel: 'Instituto Hidrográfico · L1 sem controlo de qualidade', sourceUrl: 'https://ogcapi.hidrografico.pt/collections/tide_obs_nrt', termsUrl: 'https://creativecommons.org/licenses/by-nc/4.0/', freshness: `${ageLabel} · feed consultado a cada minuto`, fields: [
    { label: 'Estação', value: details.stationId },
    { label: 'Altura da superfície do mar', value: typeof details.heightMetres === 'number' ? `${details.heightMetres.toLocaleString('pt-PT', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} m acima do ZH` : undefined },
    { label: 'Observado em (UTC)', value: details.observedAt ? new Date(details.observedAt).toLocaleString('pt-PT', { timeZone: 'UTC', timeZoneName: 'short' }) : undefined },
    { label: 'Frescura da amostra', value: details.freshness === 'stale' ? 'Desatualizada' : details.freshness === 'live' || details.freshness === 'near-live' ? 'Recente' : details.freshness === 'current' ? 'Com atraso' : 'Sem observação' },
    { label: 'Datum vertical', value: 'Zero Hidrográfico de Portugal (ZH) · EPSG:10349' },
    { label: 'Cobertura recebida', value: details.coverage },
  ] });
}

export interface CameraPanelData { name: string; sourcePage: string; mediaMode: string; mediaUrl?: string; sourceStatus: string; }
let activeCameraPanel: CameraPanelData | null = null;
let activeCameraRefreshTimer: number | null = null;
export function showCameraPanel(camera: CameraPanelData | null): void {
  const panel = document.querySelector<HTMLElement>('#camera-panel');
  const viewer = document.querySelector<HTMLElement>('#camera-viewer');
  if (!panel || !viewer) return;
  if (activeCameraRefreshTimer !== null) window.clearInterval(activeCameraRefreshTimer);
  activeCameraRefreshTimer = null;
  viewer.replaceChildren();
  viewer.hidden = true;
  panel.hidden = !camera;
  activeCameraPanel = camera;
  if (!camera) return;
  const title = document.querySelector<HTMLElement>('#camera-panel-title'); if (title) title.textContent = camera.name;
  const link = document.querySelector<HTMLAnchorElement>('#camera-source-link'); if (link) link.href = camera.sourcePage;
  if (camera.sourceStatus !== 'offline' && camera.mediaMode === 'iframe' && camera.mediaUrl) {
    const iframe = document.createElement('iframe');
    iframe.src = camera.mediaUrl; iframe.title = `Câmara ${camera.name}`;
    iframe.loading = 'lazy'; iframe.referrerPolicy = 'strict-origin'; iframe.allow = 'autoplay; encrypted-media; picture-in-picture; fullscreen';
    iframe.allowFullscreen = true;
    iframe.addEventListener('error', () => {
      if (viewer.contains(iframe)) viewer.hidden = true;
    }, { once: true });
    viewer.append(iframe);
    viewer.hidden = false;
  }
  if (camera.sourceStatus !== 'offline' && camera.mediaMode === 'image' && camera.mediaUrl) {
    const image = document.createElement('img');
    image.alt = `Câmara ${camera.name}`;
    const refreshImage = () => {
      const url = new URL(camera.mediaUrl!);
      url.searchParams.set('refresh', String(Date.now()));
      image.src = url.toString();
    };
    image.addEventListener('load', () => { if (viewer.contains(image)) viewer.hidden = false; });
    image.addEventListener('error', () => { if (viewer.contains(image)) viewer.hidden = true; });
    viewer.append(image);
    refreshImage();
    activeCameraRefreshTimer = window.setInterval(() => {
      if (!document.hidden && viewer.contains(image)) refreshImage();
    }, 60_000);
  }
}

document.addEventListener('visibilitychange', () => {
  if (!activeCameraPanel) return;
  if (document.hidden) {
    if (activeCameraRefreshTimer !== null) window.clearInterval(activeCameraRefreshTimer);
    activeCameraRefreshTimer = null;
    document.querySelector<HTMLElement>('#camera-viewer')?.replaceChildren();
    const viewer = document.querySelector<HTMLElement>('#camera-viewer');
    if (viewer) viewer.hidden = true;
  } else {
    showCameraPanel(activeCameraPanel);
  }
});

export function setCameraCatalogueStatus(summary: string): void {
  const label = document.querySelector<HTMLElement>('#layer-cameras-count');
  if (label) { label.hidden = false; label.textContent = summary; }
}

document.addEventListener('click', (event) => {
  const target = event.target as HTMLElement;
  if (target.closest('#event-details-close')) showSeismicEventDetails(null);
});
