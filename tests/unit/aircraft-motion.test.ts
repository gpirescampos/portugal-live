import assert from 'node:assert/strict';
import test from 'node:test';
import {
  interpolateAircraft,
  predictAircraft,
  reconcileAircraft,
  type AircraftMotionState,
} from '../../src/domain/aircraftMotion.ts';

const state = (overrides: Partial<AircraftMotionState> = {}): AircraftMotionState => ({
  longitude: -9,
  latitude: 39,
  altitudeMeters: 1_000,
  velocityEastMps: 100,
  velocityNorthMps: 0,
  verticalRateMps: 2,
  headingDegrees: 90,
  observedAt: 1_000_000,
  ...overrides,
});

test('interpolates positions and altitude between observations', () => {
  const result = interpolateAircraft(state(), state({ longitude: -8, altitudeMeters: 2_000, observedAt: 1_010_000 }), 1_005_000);
  assert.equal(result.predicted, false);
  assert.equal(result.longitude, -8.5);
  assert.equal(result.altitudeMeters, 1_500);
});

test('interpolation uses the shortest path across the antimeridian', () => {
  const result = interpolateAircraft(state({ longitude: 179 }), state({ longitude: -179, observedAt: 1_010_000 }), 1_005_000);
  assert.ok(Math.abs(Math.abs(result.longitude) - 180) < 0.001);
});

test('predicts bounded motion from velocity and vertical rate', () => {
  const result = predictAircraft(state(), 1_010_000);
  assert.ok(result);
  assert.equal(result.predicted, true);
  assert.ok(result.longitude > -9);
  assert.equal(result.altitudeMeters, 1_020);
});

test('expires prediction after the horizon and never coasts indefinitely', () => {
  assert.equal(predictAircraft(state(), 1_031_000), null);
  assert.equal(predictAircraft(state({ predictionHorizonSeconds: 5 }), 1_006_000), null);
});

test('reconcile interpolates before latest observation and predicts after it', () => {
  const previous = state();
  const latest = state({ longitude: -8.9, observedAt: 1_010_000 });
  assert.equal(reconcileAircraft(previous, latest, 1_005_000)?.predicted, false);
  assert.equal(reconcileAircraft(previous, latest, 1_015_000)?.predicted, true);
});

test('handles stationary aircraft without inventing a heading', () => {
  const result = predictAircraft(state({ velocityEastMps: 0, velocityNorthMps: 0, headingDegrees: null }), 1_001_000);
  assert.equal(result?.headingDegrees, null);
});
