export type BrokerState = "live" | "partial" | "stale" | "rate-limited" | "configuration-required" | "unavailable";

export interface BrokerResponse<T = unknown> {
  provider: "fogos" | "opensky" | "firms" | "qualar" | "broker";
  state: BrokerState;
  fetchedAt?: string;
  expiresAt?: string;
  retryAfterSeconds?: number;
  data?: T;
  error?: { code: string; message: string };
}

export const FOGOS_PATH = "/api/providers/fogos/incidents";
export const FOGOS_UPSTREAM = "https://api.fogos.pt/v2/incidents/active?geojson=1";
export const OPENSKY_PATH = "/api/providers/opensky/states";
export const OPENSKY_UPSTREAM = "https://opensky-network.org/api/states/all";
export const FIRMS_PATH = "/api/providers/firms/detections";
export const FIRMS_UPSTREAM = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
export const QUALAR_PATH = '/api/providers/qualar/observations';
export const QUALAR_EEA_API = 'https://eeadmz1-downloads-api-appservice.azurewebsites.net/ParquetFile/dynamic';
export const QUALAR_STATIONS_API = 'https://air.discomap.eea.europa.eu/arcgis/rest/services/AirQuality/AirQualityDownloadServiceEUMonitoringStations/MapServer/0/query';
export const VIAVERDE_CAMERAS_PATH = '/api/providers/cameras/viaverde/catalogue';
