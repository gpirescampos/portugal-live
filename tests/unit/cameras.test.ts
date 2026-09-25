import test from 'node:test';
import assert from 'node:assert/strict';
import { cameraSnapshot, clubeNavalSantaMariaCameras, meoBeachcamCameras, netMadeiraCameras, portoLisboaCameras, validateCameraCatalogue } from '../../src/providers/cameras/parser.ts';

const netMadeiraProvenance = { sourceUrl: 'https://www.netmadeira.com/webcams-madeira/mapa', termsUrl: 'https://www.netmadeira.com/webcams-madeira-for-webmasters', dataset: 'Curated public camera locations', coverageNote: 'Approximate location.' };

test('NetMadeira camera snapshot keeps catalogue time separate from capture time', () => {
  const snapshot = cameraSnapshot(new Date('2026-09-23T10:00:00.000Z'), 'camera-netmadeira', netMadeiraCameras, netMadeiraProvenance);
  assert.equal(snapshot.records.length, netMadeiraCameras.length);
  assert.ok(snapshot.records.length >= 8);
  assert.ok(snapshot.records.every((record) => record.kind === 'public-camera' && record.observedAt === null && record.temporalClass === 'static' && record.quality === 'reported'));
  assert.ok(snapshot.records.every((record) => record.fetchedAt === snapshot.fetchedAt));
  assert.ok(snapshot.records.every((record) => record.properties.locationConfidence === 'approximate'));
  assert.equal(snapshot.records.length, 28);
  assert.ok(snapshot.records.every((record) => record.properties.mediaMode === 'link' && record.properties.mediaUrl === undefined));
  assert.ok(snapshot.records.every((record) => record.properties.sourceStatus === 'unverified'));
  assert.ok(snapshot.records.every((record) => record.properties.sourceCheckedAt === '2026-09-23T18:04:00.000Z'));
});

test('Porto de Lisboa catalogue embeds the user-confirmed VTS player and keeps the other camera link-only', () => {
  const snapshot = cameraSnapshot(new Date('2026-09-23T10:00:00.000Z'), 'camera-portolisboa', portoLisboaCameras, { sourceUrl: 'https://www.portodelisboa.pt/tejo-live', termsUrl: 'https://www.portodelisboa.pt/tejo-live', dataset: 'Curated public camera locations', coverageNote: 'Approximate locations.' });
  assert.equal(snapshot.providerId, 'camera-portolisboa');
  assert.equal(snapshot.records.length, 2);
  assert.equal(snapshot.records.find((record) => record.id.endsWith('vts-alges'))?.properties.mediaMode, 'iframe');
  assert.equal(snapshot.records.find((record) => record.id.endsWith('cacilhas'))?.properties.mediaMode, 'link');
});

test('Santa Maria catalogue uses the official club HLS player and approximate marina position', () => {
  const snapshot = cameraSnapshot(new Date('2026-09-23T16:00:00.000Z'), 'camera-cnsantamaria', clubeNavalSantaMariaCameras, { sourceUrl: 'https://www.cnsantamaria.pt/broadcast-live/', termsUrl: 'https://www.cnsantamaria.pt/localizacao/', dataset: 'Curated public camera location', coverageNote: 'Approximate marina location.' });
  assert.equal(snapshot.records.length, 1);
  assert.equal(snapshot.records[0]?.providerId, 'camera-cnsantamaria');
  assert.equal(snapshot.records[0]?.properties.mediaMode, 'iframe');
  assert.equal(snapshot.records[0]?.properties.mediaUrl, 'https://cnsm.olho.mariense.pt/index.html');
  assert.equal(snapshot.records[0]?.properties.region, 'Açores');
  assert.equal(snapshot.records[0]?.properties.sourceStatus, 'catalogued');
});

test('MEO Beachcam catalogue links all currently listed cameras to their operator pages', () => {
  const snapshot = cameraSnapshot(new Date('2026-09-23T16:05:00.000Z'), 'camera-meo-beachcam', meoBeachcamCameras, { sourceUrl: 'https://beachcam.meo.pt/livecams/acores-ribeira-grande-praia-do-monte-verde/', termsUrl: 'https://back-office.beachcam.pt/termos-e-condicoes/', dataset: 'Curated public camera location', coverageNote: 'Approximate beach location.' });
  assert.equal(snapshot.records.length, 185);
  const monteVerde = snapshot.records.find((record) => record.id.endsWith('acores-ribeira-grande-praia-do-monte-verde'));
  assert.equal(monteVerde?.providerId, 'camera-meo-beachcam');
  assert.equal(monteVerde?.properties.mediaMode, 'link');
  assert.equal(monteVerde?.properties.mediaUrl, undefined);
  assert.equal(monteVerde?.properties.sourceStatus, 'unverified');
});

test('camera catalogue allows only the published YouTube, Santa Maria and Beachcam media URLs', () => {
  assert.doesNotThrow(() => validateCameraCatalogue(portoLisboaCameras));
  assert.doesNotThrow(() => validateCameraCatalogue(clubeNavalSantaMariaCameras));
  assert.throws(() => validateCameraCatalogue([{ ...meoBeachcamCameras[0]!, mediaMode: 'iframe', mediaUrl: 'https://video-auth1.iol.pt/auth-beachcam/bcribeiragrande/playlist.m3u8' }]), /not approved/);
});

test('camera catalogue rejects duplicate IDs and coordinates outside Madeira bounds', () => {
  const base = netMadeiraCameras[0]!;
  assert.throws(() => validateCameraCatalogue([base, { ...base }]), /duplicate camera ID/);
  assert.throws(() => validateCameraCatalogue([{ ...base, id: 'camera-netmadeira:bad-place', longitude: -8 }]), /outside/);
});

test('camera catalogue rejects arbitrary media origins', () => {
  const base = netMadeiraCameras[0]!;
  assert.throws(() => validateCameraCatalogue([{ ...base, mediaUrl: 'https://example.com/frame' }]), /Unapproved camera URL/);
  assert.throws(() => validateCameraCatalogue([{ ...base, mediaUrl: 'https://www.netmadeira.com/private/frame' }]), /Unapproved camera URL/);
});
