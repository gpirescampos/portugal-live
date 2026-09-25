export interface AppConfig {
  cesiumIonToken: string | null;
  brokerBaseUrl: string;
}

export function readConfig(env: ImportMetaEnv = import.meta.env): AppConfig {
  const token = env.VITE_CESIUM_ION_TOKEN?.trim();
  return { cesiumIonToken: token || null, brokerBaseUrl: env.VITE_BROKER_BASE_URL?.trim() || 'http://127.0.0.1:8787' };
}
