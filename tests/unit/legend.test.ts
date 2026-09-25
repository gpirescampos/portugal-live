import assert from 'node:assert/strict';
import test from 'node:test';
import { legendDefinitions, renderLegend } from '../../src/ui/legend.ts';

test('legend definitions render dataset-specific, accessible legends', () => {
  const seismic = renderLegend(legendDefinitions.seismic);
  const warnings = renderLegend(legendDefinitions.warnings);

  assert.match(seismic, /id="ipma-legend"/);
  assert.match(seismic, /Tamanho = magnitude/);
  assert.match(seismic, /Opacidade = idade do evento/);
  assert.match(warnings, /id="ipma-warnings-legend"/);
  assert.match(warnings, /warning-label--yellow/);
  assert.match(warnings, /Amarelo/);
  assert.match(warnings, /Pontos representam a área de aviso/);
  const firms = renderLegend(legendDefinitions.firms);
  assert.match(firms, /DETEÇÕES TÉRMICAS · NASA FIRMS/);
  assert.match(firms, /Sem dado/);
  assert.match(firms, /Anomalias térmicas não confirmam incêndios/);
});
