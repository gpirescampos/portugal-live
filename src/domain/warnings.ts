import type { Geometry, WorldRecord } from "./world.ts";

/** Severity values published by IPMA's warning feed. */
export type WarningSeverity = "yellow" | "orange" | "red";

export type WarningValidity = "upcoming" | "active" | "expired";

/** The typed subset of WorldRecord.properties used by weather warnings. */
export interface WarningProperties {
  areaCode: string;
  areaName?: string;
  warningType: string;
  severity: WarningSeverity;
  description?: string;
  validity: WarningValidity;
}

export type WarningRecord = WorldRecord & {
  kind: "weather-warning";
  properties: WarningProperties;
};

/**
 * Calculate validity independently from provider freshness. A warning can be
 * active while its feed snapshot is near-live, and an expired warning should
 * never be presented as an active observation.
 */
export function warningValidityFor(
  validFrom: string,
  validUntil: string,
  now: Date,
): WarningValidity {
  const start = Date.parse(validFrom);
  const end = Date.parse(validUntil);
  const timestamp = now.getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return "expired";
  if (timestamp < start) return "upcoming";
  if (timestamp >= end) return "expired";
  return "active";
}

export function isWarningRecord(record: WorldRecord): record is WarningRecord {
  if (record.kind !== "weather-warning" ||
    (record.geometry.type !== "Point" && record.geometry.type !== "Polygon" && record.geometry.type !== "MultiPolygon")) return false;
  const properties = record.properties as Partial<WarningProperties>;
  return typeof properties.areaCode === "string" &&
    typeof properties.warningType === "string" &&
    (properties.severity === "yellow" || properties.severity === "orange" || properties.severity === "red") &&
    (properties.validity === "upcoming" || properties.validity === "active" || properties.validity === "expired");
}

export type WarningGeometry = Extract<Geometry, { type: "Point" | "Polygon" | "MultiPolygon" }>;
