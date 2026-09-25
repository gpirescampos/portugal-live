import { compositeId } from "../../domain/ids.ts";
import { freshnessForObservedAt } from "../../domain/freshness.ts";
import type { ProviderError, WorldRecord } from "../../domain/world.ts";

/** OpenSky state-vector indexes, as documented by the OpenSky REST API. */
const StateVectorField = {
  Icao24: 0, Callsign: 1, OriginCountry: 2, TimePosition: 3,
  LastContact: 4, Longitude: 5, Latitude: 6, BaroAltitude: 7,
  OnGround: 8, Velocity: 9, TrueTrack: 10, VerticalRate: 11,
  Sensors: 12, GeoAltitude: 13, Squawk: 14, Spi: 15,
  PositionSource: 16, Category: 17,
} as const;

export interface ParsedOpenSky { records: WorldRecord[]; rejected: number; error?: ProviderError; sourceUpdatedAt?: string }

export const OPENSKY_SOURCE = "https://opensky-network.org/data";
export const OPENSKY_API_SOURCE = "https://opensky-network.org/api/states/all";

function text(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}
function number(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}
function unixIso(value: unknown): string | undefined {
  const seconds = number(value);
  if (seconds === undefined || seconds <= 0) return undefined;
  const date = new Date(seconds * 1000);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

function provenance() {
  return {
    providerName: "OpenSky Network",
    dataset: "Aircraft state vectors",
    sourceUrl: OPENSKY_SOURCE,
    attribution: "OpenSky Network",
    termsUrl: "https://opensky-network.org/about/terms-of-use",
    transport: "brokered" as const,
  };
}

export function parseOpenSkyEnvelope(payload: unknown, fetchedAt: string, now = new Date(fetchedAt)): ParsedOpenSky {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    return { records: [], rejected: 0, error: { code: "parse", message: "OpenSky response is not an object" } };
  }
  const envelope = payload as { time?: unknown; states?: unknown };
  if (envelope.states === null) return { records: [], rejected: 0, sourceUpdatedAt: unixIso(envelope.time) };
  if (!Array.isArray(envelope.states)) {
    return { records: [], rejected: 0, error: { code: "parse", message: "OpenSky response has no states array" } };
  }
  const records: WorldRecord[] = [];
  let rejected = 0;
  for (const raw of envelope.states) {
    if (!Array.isArray(raw)) { rejected++; continue; }
    const icao24 = text(raw[StateVectorField.Icao24])?.toLowerCase();
    const longitude = number(raw[StateVectorField.Longitude]);
    const latitude = number(raw[StateVectorField.Latitude]);
    if (!icao24 || longitude === undefined || latitude === undefined || longitude < -180 || longitude > 180 || latitude < -90 || latitude > 90) { rejected++; continue; }
    const observedAt = unixIso(raw[StateVectorField.LastContact]) ?? unixIso(raw[StateVectorField.TimePosition]) ?? unixIso(envelope.time);
    const stable = `opensky:${icao24}`;
    records.push({
      id: stable, providerId: "opensky", kind: "aircraft", geometry: { type: "Point", coordinates: [longitude, latitude, number(raw[StateVectorField.GeoAltitude]) ?? number(raw[StateVectorField.BaroAltitude]) ?? 0] },
      observedAt: observedAt ?? null, fetchedAt, sourceUpdatedAt: unixIso(envelope.time), temporalClass: "near-live",
      freshness: freshnessForObservedAt("opensky", observedAt ?? null, now), quality: "observed",
      properties: {
        icao24, callsign: text(raw[StateVectorField.Callsign]), originCountry: text(raw[StateVectorField.OriginCountry]),
        baroAltitudeM: number(raw[StateVectorField.BaroAltitude]), geoAltitudeM: number(raw[StateVectorField.GeoAltitude]),
        onGround: raw[StateVectorField.OnGround] === true, velocityMps: number(raw[StateVectorField.Velocity]),
        headingDegrees: number(raw[StateVectorField.TrueTrack]), verticalRateMps: number(raw[StateVectorField.VerticalRate]),
        squawk: text(raw[StateVectorField.Squawk]), category: number(raw[StateVectorField.Category]),
      }, provenance: provenance(),
    });
  }
  return { records, rejected, sourceUpdatedAt: unixIso(envelope.time) };
}
