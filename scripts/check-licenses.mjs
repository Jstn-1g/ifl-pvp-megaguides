import { existsSync } from 'node:fs';
import path from 'node:path';
import { invokedAsMain, projectRoot, readJson } from './release-utils.mjs';

function assertDependencyManifest(manifest, packageJson, failures) {
  if (!manifest || typeof manifest !== 'object' || Array.isArray(manifest) || manifest.schemaVersion !== 1 || !Array.isArray(manifest.dependencies)) {
    failures.push('governance/dependency-licenses.json must be a schemaVersion 1 manifest with dependencies.');
    return;
  }
  const expected = Object.keys({ ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) }).sort();
  const records = new Map();
  for (const item of manifest.dependencies) {
    if (!item || typeof item !== 'object' || typeof item.name !== 'string' || typeof item.license !== 'string' || !item.license.trim()) {
      failures.push('dependency license records require name and license.'); continue;
    }
    if (records.has(item.name)) failures.push(`duplicate dependency license record: ${item.name}`);
    records.set(item.name, item);
  }
  for (const name of expected) if (!records.has(name)) failures.push(`dependency lacks reviewed license record: ${name}`);
  for (const name of records.keys()) if (!expected.includes(name)) failures.push(`dependency license manifest has stale record: ${name}`);
}

export async function checkLicenses({ root = projectRoot } = {}) {
  const failures = [];
  const requiredDocuments = ['LICENSE', 'NOTICE.md', 'CONTENT-LICENSE.md', 'TRADEMARKS.md'];
  for (const file of requiredDocuments) if (!existsSync(path.join(root, file))) failures.push(`required public-rights document is missing: ${file}`);
  if (existsSync(path.join(root, 'LICENSE'))) {
    const license = await (await import('node:fs/promises')).readFile(path.join(root, 'LICENSE'), 'utf8');
    if (!/MIT License/i.test(license)) failures.push('LICENSE must clearly identify the MIT license for original code only.');
  }
  const packageJson = await readJson(path.join(root, 'package.json'));
  const manifestPath = path.join(root, 'governance', 'dependency-licenses.json');
  if (!existsSync(manifestPath)) failures.push('governance/dependency-licenses.json is required before public release.');
  else assertDependencyManifest(await readJson(manifestPath), packageJson, failures);
  return { ok: failures.length === 0, failures };
}

async function main() {
  const result = await checkLicenses();
  if (!result.ok) { console.error('License check failed:'); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return; }
  console.log('License check passed.');
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`License check failed: ${error.message}`); process.exitCode = 1; });
