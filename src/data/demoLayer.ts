import type { WorldRecord } from '../domain/world';

const provenance = {
  providerName: 'Portugal Live fixture',
  dataset: 'Milestone 2 demo points',
  sourceUrl: 'https://github.com/gpirescampos/portugal-live',
  attribution: 'Portugal Live fixture',
  transport: 'direct' as const,
};

export const DEMO_RECORDS: WorldRecord[] = [
  {
    id: 'ipma:fixture-lisbon', providerId: 'ipma', kind: 'warning-area-centroid',
    geometry: { type: 'Point', coordinates: [-9.14, 38.72] }, observedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(), temporalClass: 'current', freshness: 'current', quality: 'reported',
    properties: { label: 'Fixture · Lisboa' }, provenance,
  },
  {
    id: 'ipma:fixture-porto', providerId: 'ipma', kind: 'warning-area-centroid',
    geometry: { type: 'Point', coordinates: [-8.61, 41.15] }, observedAt: new Date().toISOString(),
    fetchedAt: new Date().toISOString(), temporalClass: 'current', freshness: 'current', quality: 'reported',
    properties: { label: 'Fixture · Porto' }, provenance,
  },
];
