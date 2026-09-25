import { readFileSync } from 'node:fs';
import { configFromEnv as baseConfigFromEnv, type OpenSkyConfig } from './opensky.ts';

/** Node-only credential-file loading; the edge-compatible broker stays Web-API-only. */
export function configFromEnv(env: Record<string, string | undefined> = process.env): OpenSkyConfig {
  const path = env.OPENSKY_CREDENTIALS_FILE || '.secrets/opensky-credentials.json';
  try {
    const credentials = JSON.parse(readFileSync(path, 'utf8')) as { clientId?: string; clientSecret?: string };
    return baseConfigFromEnv(env, credentials);
  } catch {
    return baseConfigFromEnv(env);
  }
}
