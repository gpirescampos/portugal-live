/** WGS84 GeoJSON geometry kept in the domain layer; renderers convert it to Cesium. */
export type Position = [longitude: number, latitude: number, altitude?: number];

export type Geometry =
  | { type: "Point"; coordinates: Position }
  | { type: "LineString"; coordinates: Position[] }
  | { type: "Polygon"; coordinates: Position[][] }
  | { type: "MultiPolygon"; coordinates: Position[][][] };

export type ProviderId = "ipma" | "ipma-warnings" | "opensky" | "fogos" | "firms" | "qualar" | "hidrografico-tide" | "camera-netmadeira" | "camera-portolisboa" | "camera-cnsantamaria" | "camera-meo-beachcam" | "camera-meteoestrela" | "camera-madeira-web" | "camera-viaverde" | "camera-vr1madeira" | "camera-funchal";
export type TemporalClass = "live" | "near-live" | "current" | "forecast" | "modeled" | "static";
export type Quality = "observed" | "reported" | "satellite-detected" | "forecast" | "modeled" | "unknown";
export type FreshnessState = "live" | "near-live" | "current" | "stale" | "unavailable";
export type TransportMode = "direct" | "brokered";

export interface Provenance {
  providerName: string;
  dataset: string;
  sourceUrl: string;
  attribution: string;
  termsUrl?: string;
  transport: TransportMode;
  coverageNote?: string;
}

export interface WorldRecord {
  /** Stable, namespaced as `${providerId}:${providerStableId}`. */
  id: string;
  providerId: ProviderId;
  kind: string;
  geometry: Geometry;
  observedAt: string | null;
  fetchedAt: string;
  sourceUpdatedAt?: string;
  validFrom?: string;
  validUntil?: string;
  temporalClass: TemporalClass;
  freshness: FreshnessState;
  quality: Quality;
  properties: Record<string, unknown>;
  provenance: Provenance;
}

export type ProviderRunState =
  | "disabled"
  | "configuration-required"
  | "loading"
  | "ready"
  | "partial"
  | "stale"
  | "rate-limited"
  | "error"
  | "unavailable";

export interface ProviderStatus {
  providerId: ProviderId;
  state: ProviderRunState;
  recordCount: number;
  fetchedAt: string | null;
  sourceUpdatedAt?: string;
  staleSince?: string;
  nextAttemptAt?: string;
  error?: ProviderError;
}

export interface ProviderError {
  code: "configuration" | "network" | "http" | "parse" | "validation" | "rate-limit" | "unknown";
  message: string;
  retryAfterSeconds?: number;
  httpStatus?: number;
}

export interface ProviderSnapshot {
  providerId: ProviderId;
  records: WorldRecord[];
  fetchedAt: string;
  sourceUpdatedAt?: string;
  status: ProviderStatus;
}
