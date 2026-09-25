/**
 * Small, renderer-independent motion model for aircraft observations.
 *
 * OpenSky positions are snapshots, not a continuous track.  This module lets
 * the renderer animate between two observations and briefly predict forward
 * using the last known velocity.  It deliberately expires predictions rather
 * than allowing an aircraft to coast indefinitely on stale data.
 */

export interface AircraftMotionState {
  longitude: number;
  latitude: number;
  altitudeMeters: number | null;
  /** Ground velocity components in metres per second. */
  velocityEastMps: number | null;
  velocityNorthMps: number | null;
  verticalRateMps: number | null;
  headingDegrees: number | null;
  observedAt: number;
  /** Maximum time after observedAt for dead reckoning. */
  predictionHorizonSeconds?: number;
}

export interface AircraftMotionSample {
  longitude: number;
  latitude: number;
  altitudeMeters: number | null;
  headingDegrees: number | null;
  observedAt: number;
  predicted: boolean;
}

export const DEFAULT_AIRCRAFT_PREDICTION_HORIZON_SECONDS = 30;
const EARTH_METERS_PER_DEGREE = 111_320;

function clampLatitude(latitude: number): number {
  return Math.max(-90, Math.min(90, latitude));
}

function normalizeLongitude(longitude: number): number {
  return ((longitude + 540) % 360) - 180;
}

function shortestLongitudeDelta(from: number, to: number): number {
  return ((to - from + 540) % 360) - 180;
}

function normalizedHeading(east: number, north: number): number | null {
  if (Math.hypot(east, north) < 0.01) return null;
  return (Math.atan2(east, north) * 180 / Math.PI + 360) % 360;
}

function horizonFor(state: AircraftMotionState): number {
  return Math.max(0, state.predictionHorizonSeconds ?? DEFAULT_AIRCRAFT_PREDICTION_HORIZON_SECONDS);
}

/** Interpolates two timestamped observations. No extrapolation is performed. */
export function interpolateAircraft(
  previous: AircraftMotionState,
  next: AircraftMotionState,
  at: number,
): AircraftMotionSample {
  const duration = next.observedAt - previous.observedAt;
  const ratio = duration <= 0 ? 1 : Math.max(0, Math.min(1, (at - previous.observedAt) / duration));
  const altitude = previous.altitudeMeters === null || next.altitudeMeters === null
    ? (ratio < 0.5 ? previous.altitudeMeters : next.altitudeMeters)
    : previous.altitudeMeters + (next.altitudeMeters - previous.altitudeMeters) * ratio;
  const heading = previous.headingDegrees === null || next.headingDegrees === null
    ? (ratio < 0.5 ? previous.headingDegrees : next.headingDegrees)
    : (previous.headingDegrees + shortestLongitudeDelta(previous.headingDegrees, next.headingDegrees) * ratio + 360) % 360;
  return {
    longitude: normalizeLongitude(previous.longitude + shortestLongitudeDelta(previous.longitude, next.longitude) * ratio),
    latitude: previous.latitude + (next.latitude - previous.latitude) * ratio,
    altitudeMeters: altitude,
    headingDegrees: heading,
    observedAt: at,
    predicted: false,
  };
}

/**
 * Predicts from an observation for a bounded horizon. Returns null once the
 * horizon is exceeded, which makes stale aircraft disappear instead of
 * remaining misleadingly frozen or coasting forever.
 */
export function predictAircraft(
  state: AircraftMotionState,
  at: number,
): AircraftMotionSample | null {
  const elapsedSeconds = (at - state.observedAt) / 1000;
  if (elapsedSeconds < 0 || elapsedSeconds > horizonFor(state)) return null;

  const east = state.velocityEastMps ?? 0;
  const north = state.velocityNorthMps ?? 0;
  const up = state.verticalRateMps ?? 0;
  const latitudeRadians = state.latitude * Math.PI / 180;
  const longitudeScale = Math.max(0.01, Math.cos(latitudeRadians));
  const northDegrees = north * elapsedSeconds / EARTH_METERS_PER_DEGREE;
  const eastDegrees = east * elapsedSeconds / (EARTH_METERS_PER_DEGREE * longitudeScale);
  const altitude = state.altitudeMeters === null ? null : state.altitudeMeters + up * elapsedSeconds;
  return {
    longitude: normalizeLongitude(state.longitude + eastDegrees),
    latitude: clampLatitude(state.latitude + northDegrees),
    altitudeMeters: altitude,
    headingDegrees: state.headingDegrees ?? normalizedHeading(east, north),
    observedAt: at,
    predicted: elapsedSeconds > 0,
  };
}

/**
 * Reconciles a pair of observations at render time. During the observation
 * interval it interpolates; after the newest observation it dead-reckons for
 * the configured bounded horizon.
 */
export function reconcileAircraft(
  previous: AircraftMotionState | null,
  latest: AircraftMotionState,
  at: number,
): AircraftMotionSample | null {
  if (previous && latest.observedAt > previous.observedAt && at < latest.observedAt) {
    return interpolateAircraft(previous, latest, at);
  }
  return predictAircraft(latest, at);
}
