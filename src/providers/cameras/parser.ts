import type { CameraDescriptor } from './types.ts';
import type { ProviderSnapshot, WorldRecord } from '../../domain/world.ts';
import { meoBeachcamLocations } from './meo-beachcam-catalogue.ts';
import { madeiraWebCameras } from './madeira-web-catalogue.ts';
import { vr1MadeiraCameras } from './vr1madeira-catalogue.ts';

const BASE = 'https://www.netmadeira.com';
const sourcePage = `${BASE}/webcams-madeira/mapa`;

// Coordinates are approximate town/landmark placements, not published camera mounts.
const entries: Array<[string, string, number, number]> = [
  ['achada-do-teixeira', 'Achada do Teixeira', -16.9370, 32.7650],
  ['boaventura', 'Boaventura', -17.0560, 32.8240],
  ['camara-de-lobos', 'Câmara de Lobos', -16.9712, 32.6504],
  ['camara-de-lobos-baia', 'Câmara de Lobos — Baía', -16.9687, 32.6530],
  ['canical', 'Caniçal', -16.7383, 32.7383],
  ['eira-do-serrado', 'Eira do Serrado', -16.9520, 32.7200],
  ['funchal-baia-do-funchal', 'Funchal — Baía do Funchal', -16.9118, 32.6471],
  ['funchal-lido', 'Funchal — Lido', -16.9315, 32.6373],
  ['funchal-parque-ecologico', 'Funchal — Parque Ecológico', -16.9100, 32.7200],
  ['funchal-pontinha', 'Funchal — Pontinha', -16.9100, 32.6410],
  ['machico', 'Machico', -16.7651, 32.7180],
  ['monte', 'Monte', -16.9000, 32.6750],
  ['palheiro-golf', 'Palheiro Golf', -16.8660, 32.6670],
  ['pico-do-arieiro', 'Pico do Areeiro', -16.9286, 32.7359],
  ['ponta-delgada', 'Ponta Delgada', -16.9980, 32.8290],
  ['ponta-do-sol', 'Ponta do Sol', -17.1000, 32.6800],
  ['portela-porto-da-cruz', 'Portela — Porto da Cruz', -16.8200, 32.7700],
  ['porto-moniz', 'Porto Moniz', -17.1667, 32.8667],
  ['porto-santo', 'Porto Santo', -16.3350, 33.0583],
  ['praia-faial', 'Praia do Faial', -16.8500, 32.7900],
  ['praia-do-vigario', 'Praia do Vigário', -16.9700, 32.6500],
  ['rabacal-madeira', 'Rabaçal', -17.1300, 32.7500],
  ['ribeira-brava', 'Ribeira Brava', -17.0628, 32.6500],
  ['santa-cruz', 'Santa Cruz', -16.7939, 32.6881],
  ['santana-parque-tematico', 'Santana — Parque Temático', -16.8900, 32.8100],
  ['santo-da-serra-golf', 'Santo da Serra — Golf', -16.8300, 32.7200],
  ['sao-jorge', 'São Jorge', -16.9200, 32.8300],
  ['seixal', 'Seixal', -17.1020, 32.8222],
];

export const netMadeiraCameras: CameraDescriptor[] = entries.map(([id, name, longitude, latitude]) => ({
  id: `camera-netmadeira:${id}`, providerId: 'camera-netmadeira',
  operator: 'NetMadeira', name, region: 'Madeira', longitude, latitude,
  sourcePage: `${BASE}/webcams-madeira/${id}`,
  mediaMode: 'link',
  attribution: 'NetMadeira', locationConfidence: 'approximate', poseConfidence: 'unknown', sourceStatus: 'unverified', sourceCheckedAt: '2026-09-23T18:04:00.000Z',
}));

export const portoLisboaCameras: CameraDescriptor[] = [
  { id: 'camera-portolisboa:cacilhas', providerId: 'camera-portolisboa', operator: 'Porto de Lisboa', name: 'Câmara Cacilhas', region: 'Portugal continental', longitude: -9.15, latitude: 38.69, sourcePage: 'https://www.portodelisboa.pt/tejo-live', mediaMode: 'link', attribution: 'Porto de Lisboa / APL', locationConfidence: 'approximate', poseConfidence: 'unknown', sourceStatus: 'unverified', sourceCheckedAt: '2026-09-23T17:04:00.000Z' },
  { id: 'camera-portolisboa:vts-alges', providerId: 'camera-portolisboa', operator: 'Porto de Lisboa', name: 'Câmara VTS · Algés', region: 'Portugal continental', longitude: -9.23, latitude: 38.70, sourcePage: 'https://www.portodelisboa.pt/tejo-live', mediaMode: 'iframe', mediaUrl: 'https://www.youtube.com/embed/FE-JfjvXFEU?autoplay=1&mute=1', attribution: 'Porto de Lisboa / APL', locationConfidence: 'approximate', poseConfidence: 'unknown', sourceStatus: 'catalogued', sourceCheckedAt: '2026-09-23T17:04:00.000Z' },
];

export const clubeNavalSantaMariaCameras: CameraDescriptor[] = [
  { id: 'camera-cnsantamaria:clube-naval', providerId: 'camera-cnsantamaria', operator: 'Clube Naval de Santa Maria', name: 'Câmara Clube Naval', region: 'Açores', longitude: -25.147639, latitude: 36.946528, sourcePage: 'https://www.cnsantamaria.pt/broadcast-live/', mediaMode: 'iframe', mediaUrl: 'https://cnsm.olho.mariense.pt/index.html', attribution: 'Clube Naval de Santa Maria', locationConfidence: 'approximate', poseConfidence: 'unknown', sourceStatus: 'catalogued', sourceCheckedAt: '2026-09-23T17:04:00.000Z' },
];

export const meoBeachcamCameras: CameraDescriptor[] = meoBeachcamLocations.map(([slug, name, latitude, longitude, region]) => ({
  id: `camera-meo-beachcam:${slug}`, providerId: 'camera-meo-beachcam', operator: 'MEO Beachcam', name, region, longitude, latitude,
  sourcePage: `https://beachcam.meo.pt/livecams/${slug}/`, mediaMode: 'link', attribution: 'MEO Beachcam', locationConfidence: 'approximate', poseConfidence: 'unknown', sourceStatus: 'unverified', sourceCheckedAt: '2026-09-24T08:16:00.000Z',
}));

const meteoEstrelaEntries: Array<[id: string, name: string, latitude: number, longitude: number, sourcePage: string, imageSlug: string]> = [
  ['torre', 'Torre · 2 vistas', 40.3210, -7.6120, 'https://www.meteoestrela.pt/dados-actuais/torre1993/', 'cam_100'],
  ['estancia', 'Estância · 4 vistas', 40.3200, -7.5600, 'https://www.meteoestrela.pt/dados-actuais/estancia1906/', 'cam_20'],
  ['penhas-da-saude', 'Penhas da Saúde · 2 vistas', 40.3005, -7.5360, 'https://www.meteoestrela.pt/dados-actuais/penhas-da-saude/', 'cam_40'],
  ['vale-do-rossim', 'Vale do Rossim', 40.4010, -7.5530, 'https://www.meteoestrela.pt/vale-do-rossim/', 'cam_vr'],
  ['covilha', 'Covilhã', 40.2825, -7.5030, 'https://www.meteoestrela.pt/dados-actuais/covilha/', 'cam_10'],
];
export const meteoEstrelaCameras: CameraDescriptor[] = meteoEstrelaEntries.map(([id, name, latitude, longitude, sourcePage, imageSlug]) => ({
  id: `camera-meteoestrela:${id}`, providerId: 'camera-meteoestrela', operator: 'MeteoEstrela', name, region: 'Portugal continental', longitude, latitude,
  sourcePage, mediaMode: 'image', mediaUrl: `https://www.meteoestrela.pt/assets/webcam/${imageSlug}.jpg`, attribution: 'MeteoEstrela', locationConfidence: 'approximate', poseConfidence: 'unknown', sourceStatus: 'unverified', sourceCheckedAt: '2026-09-24T08:16:00.000Z',
}));

export { madeiraWebCameras };
export { vr1MadeiraCameras };

export const funchalCameras: CameraDescriptor[] = [
  ['baia', 'Baía do Funchal', -16.9118, 32.6471],
  ['torre', 'Torre', -16.9000, 32.6750],
  ['parque-ecologico', 'Parque Ecológico', -16.9100, 32.7200],
].map(([id, name, longitude, latitude]) => ({
  id: `camera-funchal:${id}`, providerId: 'camera-funchal', operator: 'Município do Funchal', name: String(name), region: 'Madeira', longitude: Number(longitude), latitude: Number(latitude),
  sourcePage: 'https://services.funchal.pt/webcams/', mediaMode: 'link', attribution: 'Município do Funchal', locationConfidence: 'approximate', poseConfidence: 'unknown', sourceStatus: 'unverified', sourceCheckedAt: '2026-09-24T10:55:00.000Z',
}));

export function validateCameraCatalogue(cameras: CameraDescriptor[]): CameraDescriptor[] {
  const ids = new Set<string>();
  return cameras.map((camera) => {
    if (!['camera-netmadeira', 'camera-portolisboa', 'camera-cnsantamaria', 'camera-meo-beachcam', 'camera-meteoestrela', 'camera-madeira-web', 'camera-viaverde', 'camera-vr1madeira', 'camera-funchal'].includes(camera.providerId)) throw new Error(`Invalid camera provider: ${camera.id}`);
    const netMadeira = camera.providerId === 'camera-netmadeira';
    const portLisboa = camera.providerId === 'camera-portolisboa';
    const clubeNaval = camera.providerId === 'camera-cnsantamaria';
    const meteoEstrela = camera.providerId === 'camera-meteoestrela';
    const madeiraWeb = camera.providerId === 'camera-madeira-web';
    const viaVerde = camera.providerId === 'camera-viaverde';
    const vr1Madeira = camera.providerId === 'camera-vr1madeira';
    const funchal = camera.providerId === 'camera-funchal';
    const prefix = camera.providerId;
    if (!new RegExp(`^${prefix}:[a-z0-9-]{1,80}$`).test(camera.id) || ids.has(camera.id)) throw new Error(`Invalid or duplicate camera ID: ${camera.id}`);
    ids.add(camera.id);
    const expectedOperator = netMadeira ? 'NetMadeira' : portLisboa ? 'Porto de Lisboa' : clubeNaval ? 'Clube Naval de Santa Maria' : meteoEstrela ? 'MeteoEstrela' : madeiraWeb ? 'Madeira-Web' : viaVerde ? 'Via Verde / Brisa' : vr1Madeira ? 'VR1 Madeira' : funchal ? 'Município do Funchal' : 'MEO Beachcam';
    const inBounds = netMadeira
      ? camera.longitude >= -17.6 && camera.longitude <= -15.8 && camera.latitude >= 32.2 && camera.latitude <= 33.3
      : portLisboa
        ? camera.longitude >= -9.5 && camera.longitude <= -8.8 && camera.latitude >= 38.5 && camera.latitude <= 39.0
        : clubeNaval
          ? camera.longitude >= -25.3 && camera.longitude <= -24.9 && camera.latitude >= 36.8 && camera.latitude <= 37.1
        : meteoEstrela
            ? camera.longitude >= -7.8 && camera.longitude <= -7.3 && camera.latitude >= 40.1 && camera.latitude <= 40.5
            : madeiraWeb
              ? camera.longitude >= -17.6 && camera.longitude <= -15.8 && camera.latitude >= 32.2 && camera.latitude <= 33.3
              : viaVerde
                ? camera.longitude >= -9.5 && camera.longitude <= -8.0 && camera.latitude >= 37 && camera.latitude <= 42.2
                : vr1Madeira || funchal
                  ? camera.longitude >= -17.3 && camera.longitude <= -16.5 && camera.latitude >= 32.5 && camera.latitude <= 33.0
              : camera.longitude >= -26 && camera.longitude <= -7 && camera.latitude >= 32 && camera.latitude <= 42;
    if (!camera.name.trim() || camera.name.length > 120 || camera.operator !== expectedOperator || camera.attribution.length > 120) throw new Error(`Invalid camera label: ${camera.id}`);
    if (!Number.isFinite(camera.longitude) || !Number.isFinite(camera.latitude) || !inBounds) throw new Error(`Camera is outside the ${expectedOperator} coverage area: ${camera.id}`);
    if (camera.mediaMode !== 'iframe' && camera.mediaMode !== 'image' && camera.mediaMode !== 'link') throw new Error(`Invalid media mode: ${camera.id}`);
    const madeiraWebIframe = madeiraWeb && madeiraWebCameras.some((entry) => entry.id === camera.id && entry.mediaMode === 'iframe' && entry.mediaUrl === camera.mediaUrl);
    if ((netMadeira && camera.mediaMode !== 'link') || (clubeNaval && camera.mediaMode !== 'iframe') || (camera.providerId === 'camera-meo-beachcam' && camera.mediaMode !== 'link') || (meteoEstrela && camera.mediaMode !== 'image') || (madeiraWeb && camera.mediaMode === 'iframe' && !madeiraWebIframe) || ((viaVerde || vr1Madeira || funchal) && camera.mediaMode !== 'link')) throw new Error(`Media mode is not approved for this operator: ${camera.id}`);
    if (!['published', 'estimated', 'unknown'].includes(camera.poseConfidence) || !['catalogued', 'unverified', 'offline', 'removed'].includes(camera.sourceStatus)) throw new Error(`Invalid camera evidence state: ${camera.id}`);
    if (!Number.isFinite(Date.parse(camera.sourceCheckedAt)) || Date.parse(camera.sourceCheckedAt) > Date.now() + 60_000) throw new Error(`Invalid camera source check time: ${camera.id}`);
    for (const url of [camera.sourcePage, camera.mediaUrl].filter((value): value is string => Boolean(value))) {
      const parsed = new URL(url);
      const netMadeiraUrl = parsed.hostname === 'www.netmadeira.com' && (/^\/webcams-madeira\/[a-z0-9-]+$/.test(parsed.pathname) || parsed.pathname === '/webcams-madeira/mapa');
      const madeiraWebPageUrl = parsed.hostname === 'www.madeira-web.com' && /^\/es\/webcams\/[a-z0-9-]+\.html$/.test(parsed.pathname);
      const viaVerdePageUrl = parsed.hostname === 'www.viaverde.pt' && parsed.pathname.toLowerCase() === '/ferramentas/informacao-de-transito';
      const vr1PageUrl = parsed.hostname === 'www.vr1madeira.pt' && parsed.pathname === '/map';
      const funchalPageUrl = parsed.hostname === 'services.funchal.pt' && parsed.pathname === '/webcams/';
      const portUrl = parsed.hostname === 'www.portodelisboa.pt' && parsed.pathname === '/tejo-live';
      const clubeNavalUrl = parsed.hostname === 'www.cnsantamaria.pt' && parsed.pathname === '/broadcast-live/';
      const beachcamUrl = parsed.hostname === 'beachcam.meo.pt' && /^\/livecams\/[a-z0-9-]+\/$/.test(parsed.pathname);
      const meteoEstrelaUrl = parsed.hostname === 'www.meteoestrela.pt' && /^\/(?:dados-actuais\/(?:torre1993|estancia1906|penhas-da-saude|covilha)|vale-do-rossim)\/$/.test(parsed.pathname);
      const meteoEstrelaImageUrl = parsed.hostname === 'www.meteoestrela.pt' && /^\/assets\/webcam\/cam_(?:100|2|20|50|60|7|40|3|vr|10)\.jpg$/.test(parsed.pathname) && camera.mediaMode === 'image';
      const youtubeUrl = parsed.hostname === 'www.youtube.com' && /^\/embed\/[A-Za-z0-9_-]{11}$/.test(parsed.pathname);
      const cnsmEmbedUrl = parsed.hostname === 'cnsm.olho.mariense.pt' && parsed.pathname === '/index.html';
      const allowedUrl = url === camera.sourcePage
        ? (netMadeira ? netMadeiraUrl : portLisboa ? portUrl : clubeNaval ? clubeNavalUrl : meteoEstrela ? meteoEstrelaUrl : madeiraWeb ? madeiraWebPageUrl : viaVerde ? viaVerdePageUrl : vr1Madeira ? vr1PageUrl : funchal ? funchalPageUrl : beachcamUrl)
        : (portLisboa ? youtubeUrl && camera.id.endsWith(':vts-alges') : clubeNaval ? cnsmEmbedUrl : meteoEstrelaImageUrl || (madeiraWeb && madeiraWebIframe && youtubeUrl && madeiraWebCameras.some((entry) => entry.id === camera.id && entry.mediaUrl === url)));
      const allowEmbedQuery = (portLisboa && youtubeUrl && parsed.searchParams.toString() === 'autoplay=1&mute=1') || (madeiraWeb && madeiraWebIframe && youtubeUrl && ['autoplay=1&mute=1', 'autoplay=1&mute=1&rel=0'].includes(parsed.search.slice(1)));
      if (url.length > 400 || parsed.protocol !== 'https:' || parsed.username || parsed.password || (parsed.search && !allowEmbedQuery) || parsed.hash || !allowedUrl) throw new Error(`Unapproved camera URL: ${camera.id}`);
    }
    if (camera.mediaMode === 'iframe' && !camera.mediaUrl) throw new Error(`Iframe URL is required: ${camera.id}`);
    if (camera.mediaMode === 'image' && !camera.mediaUrl) throw new Error(`Image URL is required: ${camera.id}`);
    if (camera.mediaMode === 'link' && camera.mediaUrl) throw new Error(`Link-only camera cannot carry a media URL: ${camera.id}`);
    return camera;
  });
}

export function cameraSnapshot(now: Date, providerId: CameraDescriptor['providerId'], catalogue: CameraDescriptor[], provenance: { sourceUrl: string; termsUrl?: string; dataset: string; coverageNote: string }): ProviderSnapshot {
  const fetchedAt = now.toISOString();
  const cameras = validateCameraCatalogue(catalogue);
  if (cameras.some((camera) => camera.providerId !== providerId)) throw new Error(`Camera catalogue does not match provider ${providerId}`);
  const catalogueRevision = '2026-09-24';
  const records: WorldRecord[] = cameras.map((camera) => ({
    id: camera.id, providerId, kind: 'public-camera',
    geometry: { type: 'Point', coordinates: [camera.longitude, camera.latitude] },
    observedAt: null, fetchedAt, temporalClass: 'static', freshness: 'current', quality: 'reported',
    properties: { name: camera.name, operator: camera.operator, region: camera.region, sourcePage: camera.sourcePage, mediaMode: camera.mediaMode, mediaUrl: camera.mediaUrl, attribution: camera.attribution, locationConfidence: camera.locationConfidence, poseConfidence: camera.poseConfidence, sourceStatus: camera.sourceStatus, sourceCheckedAt: camera.sourceCheckedAt, catalogueRevision },
    provenance: { providerName: camera.operator, dataset: provenance.dataset, sourceUrl: camera.sourcePage, attribution: camera.attribution, termsUrl: provenance.termsUrl, transport: 'direct', coverageNote: provenance.coverageNote },
  }));
  return { providerId, records, fetchedAt, status: { providerId, state: 'ready', recordCount: records.length, fetchedAt } };
}
