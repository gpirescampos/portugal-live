import type { ProviderSnapshot, ProviderRunState } from '../domain/world.ts';

const ERROR_LABELS: Record<string, string> = {
  configuration: 'CONFIGURAÇÃO NECESSÁRIA',
  'rate-limit': 'LIMITADO TEMPORARIAMENTE',
  network: 'FALHA DE REDE',
  http: 'ERRO DO FORNECEDOR',
  parse: 'RESPOSTA INVÁLIDA',
  validation: 'DADOS PARCIAIS',
  unknown: 'ERRO DESCONHECIDO',
};

function checkedAt(snapshot: ProviderSnapshot): string | undefined {
  const sourceTime = snapshot.status.sourceUpdatedAt ?? snapshot.sourceUpdatedAt;
  const timestamp = sourceTime ?? snapshot.status.fetchedAt ?? snapshot.fetchedAt;
  if (!timestamp || Number.isNaN(Date.parse(timestamp))) return undefined;
  const time = new Intl.DateTimeFormat('pt-PT', { hour: '2-digit', minute: '2-digit', timeZone: 'Europe/Lisbon' }).format(new Date(timestamp));
  return `${sourceTime ? 'ORIGEM' : 'CONSULTA'} ${time}`;
}

function stateLabel(state: ProviderRunState, count: number, errorCode?: string): string {
  switch (state) {
    case 'ready': return count === 0 ? 'SEM REGISTOS' : 'DISPONÍVEL';
    case 'partial': return 'PARCIAL';
    case 'stale': return 'DESATUALIZADO';
    case 'rate-limited': return 'LIMITADO TEMPORARIAMENTE';
    case 'configuration-required': return 'CONFIGURAÇÃO NECESSÁRIA';
    case 'loading': return 'A CARREGAR';
    case 'disabled': return 'DESLIGADO';
    case 'error': case 'unavailable': return ERROR_LABELS[errorCode ?? ''] ?? 'INDISPONÍVEL';
  }
}

/** Consistent PT-PT provider status; fetch time is not presented as observation time. */
export function formatDatasetStatus(snapshot: ProviderSnapshot, recordNoun: string): string {
  const { state, recordCount, error } = snapshot.status;
  const stateText = stateLabel(state, recordCount, error?.code);
  const countText = state === 'configuration-required' || state === 'loading' || state === 'disabled'
    ? ''
    : ` · ${recordCount} ${recordNoun}`;
  const time = checkedAt(snapshot);
  return `${stateText}${countText}${time ? ` · ${time}` : ''}`;
}
