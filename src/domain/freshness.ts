import type { FreshnessState, ProviderId } from "./world";

export interface FreshnessThresholds {
  liveMs?: number;
  nearLiveMs?: number;
  currentMs: number;
  staleMs: number;
}

export const FRESHNESS_THRESHOLDS: Record<ProviderId, FreshnessThresholds> = {
  opensky: { liveMs: 60_000, nearLiveMs: 300_000, currentMs: 900_000, staleMs: 900_000 },
  fogos: { liveMs: 300_000, nearLiveMs: 900_000, currentMs: 3_600_000, staleMs: 3_600_000 },
  firms: { nearLiveMs: 10_800_000, currentMs: 86_400_000, staleMs: 86_400_000 },
  // Periodic measurements: allow publication lag, then mark readings stale.
  qualar: { currentMs: 24 * 60 * 60_000, staleMs: 24 * 60 * 60_000 },
  // IH L1 observations normally arrive about once a minute.
  "hidrografico-tide": { liveMs: 2 * 60_000, nearLiveMs: 10 * 60_000, currentMs: 60 * 60_000, staleMs: 60 * 60_000 },
  ipma: { currentMs: 86_400_000, staleMs: 172_800_000 },
  "ipma-warnings": { currentMs: 1_800_000, staleMs: 3_600_000 },
  "camera-netmadeira": { currentMs: 7 * 24 * 60 * 60_000, staleMs: 30 * 24 * 60 * 60_000 },
  "camera-portolisboa": { currentMs: 7 * 24 * 60 * 60_000, staleMs: 30 * 24 * 60 * 60_000 },
  "camera-cnsantamaria": { currentMs: 7 * 24 * 60 * 60_000, staleMs: 30 * 24 * 60 * 60_000 },
  "camera-meo-beachcam": { currentMs: 7 * 24 * 60 * 60_000, staleMs: 30 * 24 * 60 * 60_000 },
  "camera-meteoestrela": { currentMs: 7 * 24 * 60 * 60_000, staleMs: 30 * 24 * 60 * 60_000 },
  "camera-madeira-web": { currentMs: 7 * 24 * 60 * 60_000, staleMs: 30 * 24 * 60 * 60_000 },
  "camera-viaverde": { currentMs: 12 * 60 * 60_000, staleMs: 24 * 60 * 60_000 },
  "camera-vr1madeira": { currentMs: 7 * 24 * 60 * 60_000, staleMs: 30 * 24 * 60 * 60_000 },
  "camera-funchal": { currentMs: 7 * 24 * 60 * 60_000, staleMs: 30 * 24 * 60 * 60_000 },
};

export function freshnessForAge(providerId: ProviderId, ageMs: number): FreshnessState {
  const t = FRESHNESS_THRESHOLDS[providerId];
  if (ageMs < 0) return "current";
  if (t.liveMs !== undefined && ageMs < t.liveMs) return "live";
  if (t.nearLiveMs !== undefined && ageMs < t.nearLiveMs) return "near-live";
  if (ageMs < t.currentMs) return "current";
  return "stale";
}

export function freshnessForObservedAt(providerId: ProviderId, observedAt: string | null, now: Date): FreshnessState {
  if (!observedAt) return "current";
  const timestamp = Date.parse(observedAt);
  return Number.isNaN(timestamp) ? "stale" : freshnessForAge(providerId, now.getTime() - timestamp);
}
