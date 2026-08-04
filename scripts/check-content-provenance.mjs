import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { invokedAsMain, projectRoot, readJson } from './release-utils.mjs';

const execFile = promisify(execFileCallback);
const contentPrefixes = ['content/', 'data/', 'src/content/', 'src/data/'];
const contentExtensions = new Set(['.csv', '.json', '.md', '.mdx', '.ts', '.txt', '.yaml', '.yml']);

async function trackedPaths(root) {
  const { stdout } = await execFile('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'buffer' });
  return stdout.toString('utf8').split('\0').filter(Boolean).sort();
}

export async function checkContentProvenance({ root = projectRoot, paths } = {}) {
  const manifestPath = path.join(root, 'governance', 'content-rights-manifest.json');
  const manifest = await readJson(manifestPath);
  const failures = [];
  if (!manifest || manifest.schemaVersion !== 1 || !Array.isArray(manifest.content)) {
    return { ok: false, failures: ['governance/content-rights-manifest.json must be a schemaVersion 1 manifest with content records.'] };
  }
  const records = new Map();
  for (const item of manifest.content) {
    if (!item || typeof item.path !== 'string' || !/^[a-f0-9]{64}$/i.test(String(item.sha256 ?? '')) || typeof item.rightsBasis !== 'string' || !item.rightsBasis.trim()) {
      failures.push('content-rights records require exact path, SHA-256, and rightsBasis.'); continue;
    }
    if (records.has(item.path)) failures.push(`duplicate content-rights record: ${item.path}`);
    records.set(item.path, item);
  }
  const candidates = (paths ?? await trackedPaths(root)).filter((item) => contentPrefixes.some((prefix) => item.startsWith(prefix)) && contentExtensions.has(path.posix.extname(item).toLowerCase()));
  for (const candidate of candidates) {
    const record = records.get(candidate);
    if (!record) { failures.push(`${candidate}: content/data file has no exact public-rights record.`); continue; }
    const digest = createHash('sha256').update(await readFile(path.join(root, ...candidate.split('/')))).digest('hex');
    if (digest !== record.sha256) failures.push(`${candidate}: content/data digest differs from its approved-rights record.`);
    if (record.sourceUrl !== undefined && !/^https:\/\//.test(record.sourceUrl)) failures.push(`${candidate}: sourceUrl must use HTTPS when supplied.`);
  }
  for (const item of records.keys()) if (!candidates.includes(item)) failures.push(`${item}: content-rights record does not match a tracked content/data file.`);
  return { ok: failures.length === 0, failures, contentCount: candidates.length };
}

async function main() {
  const result = await checkContentProvenance();
  if (!result.ok) { console.error('Content provenance check failed:'); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return; }
  console.log(`Content provenance check passed: ${result.contentCount} reviewed content/data file(s).`);
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`Content provenance check failed: ${error.message}`); process.exitCode = 1; });
