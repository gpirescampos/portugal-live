import { readdir, readFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const SECRET_NAMES = ['FOGOS_API_KEY', 'FIRMS_MAP_KEY', 'OPENSKY_CLIENT_ID', 'OPENSKY_CLIENT_SECRET'];

export function extractConfiguredSecrets(envText = '', credentialsText = '') {
  const values = new Map();
  for (const line of envText.split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!match || !SECRET_NAMES.includes(match[1])) continue;
    const value = unquote(match[2].split(/\s+#/, 1)[0]);
    if (value && !value.startsWith('replace-me')) values.set(match[1], value);
  }
  try {
    const credentials = JSON.parse(credentialsText);
    for (const name of ['clientId', 'clientSecret']) {
      const value = typeof credentials?.[name] === 'string' ? credentials[name].trim() : '';
      if (value) values.set(name === 'clientId' ? 'OPENSKY_CLIENT_ID' : 'OPENSKY_CLIENT_SECRET', value);
    }
  } catch { /* Missing or invalid local credentials are not required to build. */ }
  return values;
}

export function findClientSecretLeaks(bundleText, configuredSecrets) {
  const leaks = SECRET_NAMES.filter((name) => bundleText.includes(name));
  for (const [name, value] of configuredSecrets) if (value.length >= 8 && bundleText.includes(value)) leaks.push(name);
  return [...new Set(leaks)];
}

function unquote(value) {
  const trimmed = value.trim();
  if ((trimmed.startsWith('"') && trimmed.endsWith('"')) || (trimmed.startsWith("'") && trimmed.endsWith("'"))) return trimmed.slice(1, -1);
  return trimmed;
}

async function readTree(root) {
  const files = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = join(root, entry.name);
    if (entry.isDirectory()) files.push(...await readTree(path));
    else files.push(path);
  }
  return files;
}

async function main() {
  const projectRoot = process.cwd();
  const outputDir = resolve(projectRoot, process.argv[2] ?? 'dist');
  let files;
  try { files = await readTree(outputDir); }
  catch { console.error('Client secret scan failed: build output directory is missing. Run npm run build first.'); process.exitCode = 2; return; }

  let envText = '';
  let credentialText = '';
  try { envText = await readFile(join(projectRoot, '.env.broker.local'), 'utf8'); } catch { /* Optional local broker config. */ }
  try { credentialText = await readFile(join(projectRoot, '.secrets/opensky-credentials.json'), 'utf8'); } catch { /* Optional local OpenSky credentials. */ }
  const secrets = extractConfiguredSecrets(envText, credentialText);
  const leaks = [];
  for (const file of files) {
    const content = await readFile(file, 'utf8');
    leaks.push(...findClientSecretLeaks(content, secrets));
  }
  if (leaks.length) {
    console.error(`Client bundle contains broker-only secret material: ${[...new Set(leaks)].join(', ')}`);
    process.exitCode = 1;
    return;
  }
  console.log(`Client secret scan passed (${files.length} output files; configured secret values were not printed).`);
}

if (import.meta.url === `file://${process.argv[1]}`) await main();
