/** Declarative definition for a dataset legend. New datasets should provide a
 * definition here instead of adding provider-specific markup to the shell. */
export interface LegendItem {
  label: string;
  markerClass: string;
  labelClass?: string;
}

export interface LegendSection {
  ariaLabel: string;
  className: string;
  items: LegendItem[];
}

export interface LegendDefinition {
  id: string;
  title: string;
  ariaLabel: string;
  sections: LegendSection[];
  notes: string[];
  source: string;
  sourceUrl?: string;
  termsUrl?: string;
  extraClassName?: string;
}

export const legendDefinitions: Record<string, LegendDefinition> = {
  seismic: {
    id: 'ipma-legend',
    title: 'SISMICIDADE IPMA',
    ariaLabel: 'Legenda da sismicidade IPMA',
    sections: [
      { ariaLabel: 'O tamanho do marcador representa a magnitude', className: 'legend-scale', items: [
        { markerClass: 'legend-dot legend-dot--small', label: 'M 1–2' },
        { markerClass: 'legend-dot legend-dot--medium', label: 'M 3–4' },
        { markerClass: 'legend-dot legend-dot--large', label: 'M 5+' },
      ] },
      { ariaLabel: 'A opacidade do marcador representa a idade do evento', className: 'legend-age', items: [
        { markerClass: 'legend-age-swatch legend-age-swatch--recent', label: '0–6h' },
        { markerClass: 'legend-age-swatch legend-age-swatch--week', label: '1–7d' },
        { markerClass: 'legend-age-swatch legend-age-swatch--history', label: '7–30d' },
      ] },
    ],
    notes: ['Tamanho = magnitude', 'Opacidade = idade do evento'],
    source: 'IPMA',
    sourceUrl: 'https://api.ipma.pt/',
  },
  warnings: {
    id: 'ipma-warnings-legend',
    title: 'AVISOS IPMA',
    ariaLabel: 'Legenda dos avisos IPMA',
    extraClassName: 'warning-legend',
    sections: [{ ariaLabel: 'Severidade dos avisos', className: 'warning-legend-row', items: [
      { markerClass: 'warning-swatch warning-swatch--yellow', labelClass: 'warning-label--yellow', label: 'Amarelo' },
      { markerClass: 'warning-swatch warning-swatch--orange', labelClass: 'warning-label--orange', label: 'Laranja' },
      { markerClass: 'warning-swatch warning-swatch--red', labelClass: 'warning-label--red', label: 'Vermelho' },
    ] }],
    notes: ['Pontos representam a área de aviso', 'Os avisos expirados são removidos'],
    source: 'IPMA',
    sourceUrl: 'https://api.ipma.pt/',
  },
  fogos: {
    id: 'fogos-legend', title: 'INCÊNDIOS RURAIS', ariaLabel: 'Legenda dos incêndios rurais',
    sections: [
      { ariaLabel: 'Estado operacional', className: 'warning-legend-row', items: [
        { markerClass: 'fire-swatch fire-swatch--early', label: 'Despacho' },
        { markerClass: 'fire-swatch fire-swatch--active', label: 'Em curso' },
        { markerClass: 'fire-swatch fire-swatch--resolving', label: 'Resolução' },
      ] },
      { ariaLabel: 'Dimensão relativa dos meios', className: 'fire-size-row', items: [
        { markerClass: 'fire-size fire-size--small', label: 'Menor' },
        { markerClass: 'fire-size fire-size--large', label: 'Maior' },
      ] },
    ],
    notes: ['Tamanho = meios mobilizados', 'Opacidade reduzida = dados desatualizados'], source: 'Fogos.pt', sourceUrl: 'https://fogos.pt/',
  },
  aircraft: {
    id: 'aircraft-legend', title: 'AERONAVES OPENSKY', ariaLabel: 'Legenda das aeronaves',
    sections: [{ ariaLabel: 'Posições de aeronaves', className: 'aircraft-legend-row', items: [{ markerClass: 'aircraft-swatch', label: 'Posição ADS-B observada' }] }],
    notes: ['O movimento entre posições é estimado por breves instantes', 'A cobertura não é exaustiva'], source: 'OpenSky Network', sourceUrl: 'https://opensky-network.org/',
  },
  firms: {
    id: 'firms-legend', title: 'DETEÇÕES TÉRMICAS · NASA FIRMS', ariaLabel: 'Legenda das deteções térmicas NASA FIRMS',
    sections: [{ ariaLabel: 'Nível de confiança da deteção', className: 'firms-legend-row', items: [
      { markerClass: 'firms-swatch firms-swatch--low', label: 'Baixa' },
      { markerClass: 'firms-swatch firms-swatch--nominal', label: 'Nominal' },
      { markerClass: 'firms-swatch firms-swatch--high', label: 'Alta' },
      { markerClass: 'firms-swatch firms-swatch--unknown', label: 'Sem dado' },
    ] }],
    notes: ['Tamanho = potência radiativa (FRP)', 'Anomalias térmicas não confirmam incêndios'], source: 'NASA FIRMS', sourceUrl: 'https://firms.modaps.eosdis.nasa.gov/map/',
  },
  qualar: {
    id: 'qualar-legend', title: 'QUALIDADE DO AR · QUALAR', ariaLabel: 'Legenda das medições de qualidade do ar',
    sections: [{ ariaLabel: 'Medições por estação', className: 'camera-legend-row', items: [{ markerClass: 'camera-swatch', label: 'Estação de monitorização' }] }],
    notes: ['E2a · medições por país reportante, ainda não verificadas', 'Valores e médias por poluente; sem índice derivado'], source: 'EEA · dados comunicados por Portugal', sourceUrl: 'https://www.eea.europa.eu/en/datahub/datahubitem-view/778ef9f5-6293-4846-badd-56a29c70880d',
  },
  tide: {
    id: 'hidrografico-tide-legend', title: 'MARÉGRAFOS · INSTITUTO HIDROGRÁFICO', ariaLabel: 'Legenda das observações dos marégrafos do Instituto Hidrográfico',
    sections: [{ ariaLabel: 'Estações maregráficas', className: 'tide-legend-row', items: [{ markerClass: 'tide-swatch', label: 'Observação de altura da superfície do mar' }] }],
    notes: ['L1 sem controlo de qualidade · metros acima do ZH', 'Observações NRT; não são previsões de maré nem avisos de inundação'], source: 'Instituto Hidrográfico', sourceUrl: 'https://ogcapi.hidrografico.pt/collections/tide_obs_nrt', termsUrl: 'https://creativecommons.org/licenses/by-nc/4.0/',
  },
  cameras: {
    id: 'camera-netmadeira-legend', title: 'CÂMARAS PÚBLICAS', ariaLabel: 'Legenda das câmaras públicas',
    sections: [{ ariaLabel: 'Localizações conhecidas de câmaras', className: 'camera-legend-row', items: [{ markerClass: 'camera-swatch', label: 'Localização aproximada' }] }],
    notes: ['O estado e a hora da imagem são apresentados por câmara'], source: 'Atribuição no painel da câmara',
  },
};

export function renderLegend(definition: LegendDefinition): string {
  const sections = definition.sections.map((section) => `
    <div class="${section.className}" aria-label="${section.ariaLabel}">
      ${section.items.map((item) => `<span class="legend-item"><span class="${item.markerClass}" aria-hidden="true"></span><span${item.labelClass ? ` class="${item.labelClass}"` : ''}>${item.label}</span></span>`).join('')}
    </div>`).join('');
  const notes = definition.notes.map((note) => `<span>${note}</span>`).join('');
  return `<section class="map-legend${definition.extraClassName ? ` ${definition.extraClassName}` : ''}" id="${definition.id}" aria-label="${definition.ariaLabel}" hidden>
    <p class="eyebrow">${definition.title}</p>${sections}
    <p class="legend-note">${notes}</p>
    <p class="legend-source">${definition.sourceUrl ? `Fonte: <a href="${definition.sourceUrl}" target="_blank" rel="noreferrer">${definition.source}</a>` : definition.source}${definition.termsUrl ? ` · <a href="${definition.termsUrl}" target="_blank" rel="noreferrer">CC BY-NC 4.0</a>` : ''}</p>
  </section>`;
}
