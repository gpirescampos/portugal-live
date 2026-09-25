import assert from 'node:assert/strict';
import test from 'node:test';
import { extractConfiguredSecrets, findClientSecretLeaks } from '../../scripts/scan-client-secrets.mjs';

test('client bundle scan checks configured broker secrets without returning their values', () => {
  const secrets = extractConfiguredSecrets('FOGOS_API_KEY="fogos-secret-value"\nFIRMS_MAP_KEY=firms-secret-value\n', '{"clientId":"opensky-id-value","clientSecret":"opensky-secret-value"}');
  assert.deepEqual(findClientSecretLeaks('const leaked = "firms-secret-value";', secrets), ['FIRMS_MAP_KEY']);
  assert.deepEqual(findClientSecretLeaks('FOGOS_API_KEY', secrets), ['FOGOS_API_KEY']);
  assert.deepEqual(findClientSecretLeaks('clean public bundle', secrets), []);
});
