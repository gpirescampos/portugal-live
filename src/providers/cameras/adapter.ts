import type { ProviderAdapter, ProviderContext } from '../../domain/provider.ts';
import type { ProviderSnapshot } from '../../domain/world.ts';
import type { ProviderError } from '../../domain/world.ts';
import type { CameraDescriptor } from './types.ts';
import { VIAVERDE_CAMERAS_PATH } from '../../../broker/contract.ts';
import { cameraSnapshot, clubeNavalSantaMariaCameras, funchalCameras, madeiraWebCameras, meoBeachcamCameras, meteoEstrelaCameras, netMadeiraCameras, portoLisboaCameras, vr1MadeiraCameras } from './parser.ts';

export class NetMadeiraCameraAdapter implements ProviderAdapter<undefined> {
  readonly id = 'camera-netmadeira' as const;
  readonly displayName = 'NetMadeira cameras';
  readonly refreshIntervalMs = 24 * 60 * 60_000;
  readonly staleAfterMs = 30 * 24 * 60 * 60_000;
  readonly provenance = { dataset: 'Curated public camera locations', sourceUrl: 'https://www.netmadeira.com/webcams-madeira/mapa', attribution: 'NetMadeira', termsUrl: 'https://www.netmadeira.com/webcams-madeira-for-webmasters' };
  isConfigured(): boolean { return true; }
  async fetch(context: { now: Date }): Promise<ProviderSnapshot> { return cameraSnapshot(context.now, this.id, netMadeiraCameras, { sourceUrl: 'https://www.netmadeira.com/webcams-madeira/mapa', termsUrl: 'https://www.netmadeira.com/webcams-madeira-for-webmasters', dataset: 'Curated public camera locations', coverageNote: 'Localização aproximada; não indica o ponto de montagem nem o estado atual da imagem.' }); }
}
export const netMadeiraCameraAdapter = new NetMadeiraCameraAdapter();

export class PortoLisboaCameraAdapter implements ProviderAdapter<undefined> {
  readonly id = 'camera-portolisboa' as const;
  readonly displayName = 'Porto de Lisboa cameras';
  readonly refreshIntervalMs = 24 * 60 * 60_000;
  readonly staleAfterMs = 30 * 24 * 60 * 60_000;
  readonly provenance = { dataset: 'Curated public camera locations', sourceUrl: 'https://www.portodelisboa.pt/tejo-live', attribution: 'Porto de Lisboa / APL' };
  isConfigured(): boolean { return true; }
  async fetch(context: { now: Date }): Promise<ProviderSnapshot> { return cameraSnapshot(context.now, this.id, portoLisboaCameras, { sourceUrl: 'https://www.portodelisboa.pt/tejo-live', termsUrl: 'https://www.portodelisboa.pt/tejo-live', dataset: 'Curated public camera locations', coverageNote: 'Localização aproximada inferida do local indicado pelo operador; reprodutor YouTube publicado na página oficial.' }); }
}
export const portoLisboaCameraAdapter = new PortoLisboaCameraAdapter();

export class ClubeNavalSantaMariaCameraAdapter implements ProviderAdapter<undefined> {
  readonly id = 'camera-cnsantamaria' as const;
  readonly displayName = 'Clube Naval de Santa Maria camera';
  readonly refreshIntervalMs = 24 * 60 * 60_000;
  readonly staleAfterMs = 30 * 24 * 60 * 60_000;
  readonly provenance = { dataset: 'Curated public camera location', sourceUrl: 'https://www.cnsantamaria.pt/broadcast-live/', attribution: 'Clube Naval de Santa Maria' };
  isConfigured(): boolean { return true; }
  async fetch(context: { now: Date }): Promise<ProviderSnapshot> { return cameraSnapshot(context.now, this.id, clubeNavalSantaMariaCameras, { sourceUrl: 'https://www.cnsantamaria.pt/broadcast-live/', dataset: 'Curated public camera location', coverageNote: 'Localização do Clube Naval na Marina de Vila do Porto; reprodutor HLS publicado na página de visualização ligada pelo clube.' }); }
}
export const clubeNavalSantaMariaCameraAdapter = new ClubeNavalSantaMariaCameraAdapter();

export class MeoBeachcamCameraAdapter implements ProviderAdapter<undefined> {
  readonly id = 'camera-meo-beachcam' as const;
  readonly displayName = 'MEO Beachcam cameras';
  readonly refreshIntervalMs = 24 * 60 * 60_000;
  readonly staleAfterMs = 30 * 24 * 60 * 60_000;
  readonly provenance = { dataset: 'Curated public camera location', sourceUrl: 'https://beachcam.meo.pt/livecams/acores-ribeira-grande-praia-do-monte-verde/', attribution: 'MEO Beachcam', termsUrl: 'https://back-office.beachcam.pt/termos-e-condicoes/' };
  isConfigured(): boolean { return true; }
  async fetch(context: { now: Date }): Promise<ProviderSnapshot> { return cameraSnapshot(context.now, this.id, meoBeachcamCameras, { sourceUrl: this.provenance.sourceUrl, termsUrl: this.provenance.termsUrl, dataset: 'Curated public camera location', coverageNote: 'Praia do Monte Verde identificada pelo operador; posição da praia aproximada com coordenada pública da praia. Ligação à página oficial, sem incorporação nem reutilização do feed.' }); }
}
export const meoBeachcamCameraAdapter = new MeoBeachcamCameraAdapter();

export class MeteoEstrelaCameraAdapter implements ProviderAdapter<undefined> {
  readonly id = 'camera-meteoestrela' as const;
  readonly displayName = 'MeteoEstrela webcams';
  readonly refreshIntervalMs = 24 * 60 * 60_000;
  readonly staleAfterMs = 30 * 24 * 60 * 60_000;
  readonly provenance = { dataset: 'Curated public camera locations', sourceUrl: 'https://www.meteoestrela.pt/web-tv-nowcasting/', attribution: 'MeteoEstrela' };
  isConfigured(): boolean { return true; }
  async fetch(context: { now: Date }): Promise<ProviderSnapshot> { return cameraSnapshot(context.now, this.id, meteoEstrelaCameras, { sourceUrl: this.provenance.sourceUrl, dataset: 'Curated public camera locations', coverageNote: 'Cinco localizações aproximadas agrupam dez vistas meteorológicas indicadas pelo operador; apenas ligações para as páginas de origem.' }); }
}
export const meteoEstrelaCameraAdapter = new MeteoEstrelaCameraAdapter();

export class MadeiraWebCameraAdapter implements ProviderAdapter<undefined> {
  readonly id = 'camera-madeira-web' as const;
  readonly displayName = 'Madeira-Web cameras';
  readonly refreshIntervalMs = 24 * 60 * 60_000;
  readonly staleAfterMs = 30 * 24 * 60 * 60_000;
  readonly provenance = { dataset: 'Curated Madeira-Web camera locations', sourceUrl: 'https://www.madeira-web.com/es/noticias/webcams-isla-madeira.html', attribution: 'Madeira-Web', termsUrl: 'https://www.madeira-web.com/es/terminos-y-condiciones.html' };
  isConfigured(): boolean { return true; }
  async fetch(context: { now: Date }): Promise<ProviderSnapshot> { return cameraSnapshot(context.now, this.id, madeiraWebCameras, { sourceUrl: this.provenance.sourceUrl, termsUrl: this.provenance.termsUrl, dataset: this.provenance.dataset, coverageNote: 'Trinta câmaras fixas selecionadas do índice do operador; localização aproximada. Quatro reprodutores YouTube publicados são incorporados quando selecionados; as restantes abrem a página do operador.' }); }
}
export const madeiraWebCameraAdapter = new MadeiraWebCameraAdapter();

export const VIAVERDE_CAMERA_BROKER_ENDPOINT = VIAVERDE_CAMERAS_PATH;
const viaverdeSourcePage = 'https://www.viaverde.pt/Ferramentas/informacao-de-transito';

interface ViaVerdeCameraRow { id: number; name: string; roadName: string; latitude: number; longitude: number; }

export class ViaVerdeCameraAdapter implements ProviderAdapter<undefined> {
  readonly id = 'camera-viaverde' as const;
  readonly displayName = 'Via Verde / Brisa cameras';
  readonly refreshIntervalMs = 6 * 60 * 60_000;
  readonly staleAfterMs = 24 * 60 * 60_000;
  readonly provenance = { dataset: 'Brisa motorway cameras', sourceUrl: viaverdeSourcePage, attribution: 'Via Verde / Brisa' };
  isConfigured(): boolean { return true; }

  async fetch(context: ProviderContext): Promise<ProviderSnapshot> {
    const fetchedAt = context.now.toISOString();
    try {
      const response = await fetch(context.endpoint || VIAVERDE_CAMERA_BROKER_ENDPOINT, { signal: context.signal });
      const body = await response.json().catch(() => undefined) as { state?: string; fetchedAt?: string; data?: { cameras?: ViaVerdeCameraRow[] }; error?: { message?: string } } | undefined;
      if (!response.ok || !Array.isArray(body?.data?.cameras)) {
        return this.failure(fetchedAt, response.ok ? 'parse' : 'http', body?.error?.message ?? `O catálogo Brisa devolveu HTTP ${response.status}.`);
      }
      const sourceCheckedAt = body.fetchedAt && Number.isFinite(Date.parse(body.fetchedAt)) ? body.fetchedAt : fetchedAt;
      const cameras: CameraDescriptor[] = body.data.cameras.map((camera) => ({
        id: `camera-viaverde:${camera.id}`, providerId: this.id, operator: 'Via Verde / Brisa',
        name: camera.name, region: 'Portugal continental', longitude: camera.longitude, latitude: camera.latitude,
        sourcePage: viaverdeSourcePage, mediaMode: 'link',
        attribution: 'Via Verde / Brisa', locationConfidence: 'approximate', poseConfidence: 'unknown', sourceStatus: 'catalogued', sourceCheckedAt,
      }));
      const snapshot = cameraSnapshot(new Date(sourceCheckedAt), this.id, cameras, {
        sourceUrl: viaverdeSourcePage, dataset: 'Brisa motorway cameras',
        coverageNote: 'Cem localizações de câmaras nas autoestradas A1–A4 retiradas do catálogo público da Via Verde. A página não pode ser incorporada noutro domínio e os instantâneos testados não têm uma hora de captura verificável; abrir a página oficial para consultar a imagem.',
      });
      if (body.state === 'stale') {
        snapshot.status.state = 'stale';
        snapshot.status.error = { code: 'network', message: 'A mostrar o último catálogo de câmaras Brisa recebido.' };
      }
      return snapshot;
    } catch (cause) {
      if (context.signal.aborted) throw cause;
      return this.failure(fetchedAt, 'network', cause instanceof Error ? cause.message : 'Falha ao consultar o catálogo de câmaras Brisa.');
    }
  }

  private failure(fetchedAt: string, code: ProviderError['code'], message: string): ProviderSnapshot {
    return { providerId: this.id, records: [], fetchedAt, status: { providerId: this.id, state: 'error', recordCount: 0, fetchedAt, error: { code, message } } };
  }
}
export const viaVerdeCameraAdapter = new ViaVerdeCameraAdapter();

export class Vr1MadeiraCameraAdapter implements ProviderAdapter<undefined> {
  readonly id = 'camera-vr1madeira' as const;
  readonly displayName = 'VR1 Madeira cameras';
  readonly refreshIntervalMs = 24 * 60 * 60_000;
  readonly staleAfterMs = 30 * 24 * 60 * 60_000;
  readonly provenance = { dataset: 'VR1 Madeira camera locations', sourceUrl: 'https://www.vr1madeira.pt/map', attribution: 'VR1 Madeira / AIGIH Madeira, ACE' };
  isConfigured(): boolean { return true; }
  async fetch(context: { now: Date }): Promise<ProviderSnapshot> {
    return cameraSnapshot(context.now, this.id, vr1MadeiraCameras, {
      sourceUrl: this.provenance.sourceUrl, dataset: this.provenance.dataset,
      coverageNote: '71 câmaras com coordenadas publicadas pelo operador (64 VR1 e 7 estradas regionais). Os pedidos de imagem testados devolvem HTTP 403; esta seleção abre o mapa oficial, sem tentar mostrar um frame.',
    });
  }
}
export const vr1MadeiraCameraAdapter = new Vr1MadeiraCameraAdapter();

export class FunchalCameraAdapter implements ProviderAdapter<undefined> {
  readonly id = 'camera-funchal' as const;
  readonly displayName = 'Município do Funchal webcams';
  readonly refreshIntervalMs = 24 * 60 * 60_000;
  readonly staleAfterMs = 30 * 24 * 60 * 60_000;
  readonly provenance = { dataset: 'Municipal webcam locations', sourceUrl: 'https://services.funchal.pt/webcams/', attribution: 'Município do Funchal' };
  isConfigured(): boolean { return true; }
  async fetch(context: { now: Date }): Promise<ProviderSnapshot> {
    return cameraSnapshot(context.now, this.id, funchalCameras, {
      sourceUrl: this.provenance.sourceUrl, dataset: this.provenance.dataset,
      coverageNote: 'Três vistas listadas no portal municipal. Coordenadas aproximadas; o endpoint testado devolve uma imagem SVG de fallback, pelo que a seleção abre a página oficial sem pré-visualizador.',
    });
  }
}
export const funchalCameraAdapter = new FunchalCameraAdapter();
