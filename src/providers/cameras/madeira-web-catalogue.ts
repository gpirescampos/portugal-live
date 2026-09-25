import type { CameraDescriptor } from './types.ts';

const checkedAt = '2026-09-24T12:00:00.000Z';
const entry = (id: string, name: string, slug: string, longitude: number, latitude: number, mediaUrl?: string): CameraDescriptor => ({
  id: `camera-madeira-web:${id}`, providerId: 'camera-madeira-web', operator: 'Madeira-Web', name, region: 'Madeira', longitude, latitude,
  sourcePage: `https://www.madeira-web.com/es/webcams/${slug}.html`,
  mediaMode: mediaUrl ? 'iframe' : 'link', mediaUrl, attribution: 'Madeira-Web',
  locationConfidence: 'approximate', poseConfidence: 'unknown', sourceStatus: mediaUrl ? 'catalogued' : 'unverified', sourceCheckedAt: checkedAt,
});

// Coordinates are approximate town/site locations from the operator's camera descriptions.
// The four iframe URLs below are the operator-published YouTube embeds confirmed on 2026-09-24.
export const madeiraWebCameras: CameraDescriptor[] = [
  entry('funchal-marina-1', 'Marina do Funchal 1', 'livecam-puerto-deportivo-funchal', -16.912578, 32.646558, 'https://www.youtube.com/embed/-p1Xnt9n0yg?autoplay=1&mute=1'),
  entry('funchal-marina-2', 'Marina do Funchal 2', 'livecam2-puertodeportivo-funchal', -16.9120, 32.6465),
  entry('airport-spotting', 'Aeroporto da Madeira · spotting', 'livecam-spotting-aeropuerto-de-madeira', -16.7780, 32.6940),
  entry('airport', 'Aeroporto da Madeira', 'livecam-aeropuerto-madeira', -16.7780, 32.6940),
  entry('avenida-arriaga', 'Avenida Arriaga', 'livecam-eventos-avenidaarriaga', -16.9080, 32.6480),
  entry('ritz-funchal', 'Ritz · Funchal', 'livecam-ritzmadeira', -16.9085, 32.6480),
  entry('museu-cr7', 'Museu CR7', 'livecam-museo-cr7', -16.9110, 32.6445),
  entry('sunset-bar-centromar', 'Sunset Bar Centromar', 'livecam-sunsetbar-centromar', -16.9530, 32.6370),
  entry('fortim-lido', 'Fortim do Lido', 'livecam-fortim-do-lido', -16.9270, 32.6380),
  entry('funchal-sao-roque', 'Funchal · São Roque', 'livecam-ciudad-funchal', -16.9100, 32.6760),
  entry('foro-machico', 'Foro Machico', 'livecam-foro-machico', -16.7650, 32.7180),
  entry('praia-calheta', 'Praia da Calheta · MUDAS', 'livecam-playa-calheta', -17.1760, 32.7190),
  entry('ponta-gorda', 'Ponta Gorda', 'livecam-playa-ponta-gorda', -16.9400, 32.6370),
  entry('hotel-penha-franca', 'Hotel Penha de França Mar', 'livecam-penha-franca-mar', -16.9090, 32.6400),
  entry('piscinas-lido', 'Piscinas do Lido', 'livecam-complejo-balneario-lido', -16.9330, 32.6370, 'https://www.youtube.com/embed/K8Fl1Bm365M?autoplay=1&mute=1&rel=0'),
  entry('museu-baleias-canical', 'Museu da Baleia · Caniçal', 'livecam-museoballenas-canical', -16.7383, 32.7383, 'https://www.youtube.com/embed/H4ODWatYyb8?autoplay=1&mute=1&rel=0'),
  entry('praia-formosa', 'Praia Formosa', 'livecam-playa-formosa', -16.9500, 32.6350),
  entry('praia-reis-magos', 'Praia dos Reis Magos', 'livecam-playa-reis-magos', -16.8290, 32.6440),
  entry('porto-moniz', 'Vila do Porto Moniz', 'livecam-pueblo-de-portomoniz', -17.1667, 32.8667),
  entry('porto-machico', 'Porto de Machico', 'livecam-puerto-ciudad-machico', -16.7651, 32.7180, 'https://www.youtube.com/embed/MhOuCDXuP_0?autoplay=1&mute=1&rel=0'),
  entry('paul-do-mar', 'Paul do Mar', 'livecam-paul-do-mar', -17.2130, 32.7580),
  entry('madalena-do-mar', 'Madalena do Mar', 'camenvivo-madalenadomar', -17.1350, 32.7040),
  entry('piscinas-porto-da-cruz', 'Piscinas do Porto da Cruz', 'livecam-piscinas-porto-da-cruz', -16.8260, 32.7710),
  entry('praia-barreirinha', 'Praia da Barreirinha', 'livecam-playa-barreirinha', -16.8900, 32.6420),
  entry('doca-cavacas', 'Doca do Cavacas', 'livecam-doca-do-cavacas', -16.9510, 32.6370),
  entry('cruz-caldeira', 'Miradouro Cruz da Caldeira', 'livecam-cruzdacaldeira-camaradelobos', -16.9730, 32.6470),
  entry('praia-alagoa-porto-da-cruz', 'Praia da Alagoa · Porto da Cruz', 'livecam-playa-alagoa-portodacruz', -16.8270, 32.7760),
  entry('ponta-delgada', 'Ponta Delgada', 'livecam-pontadelgada', -16.9980, 32.8290),
  entry('piscinas-porto-moniz', 'Piscinas Naturais do Porto Moniz', 'livecam-porto-moniz-piscinas-naturales', -17.1660, 32.8660),
  entry('santana-quinta-do-furao', 'Santana · Quinta do Furão', 'livecam-santana-quintadofurao', -16.9030, 32.8120),
  entry('avenida-do-mar', 'Avenida do Mar', 'livecam-paso-peatones-av-do-mar', -16.9100, 32.6460),
];
