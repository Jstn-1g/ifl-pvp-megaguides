import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { invokedAsMain, projectRoot } from './release-utils.mjs';

const execFile = promisify(execFileCallback);

export async function checkGeneratedCleanliness({ root = projectRoot } = {}) {
  const { stdout } = await execFile('git', ['status', '--porcelain=v1', '--untracked-files=all'], { cwd: root, encoding: 'utf8' });
  const lines = stdout.split(/\r?\n/).filter(Boolean);
  const failures = lines.map((line) => `working tree is not reproducible after checks: ${line}`);
  return { ok: failures.length === 0, failures };
}

async function main() {
  const result = await checkGeneratedCleanliness();
  if (!result.ok) { console.error('Generated-output cleanliness check failed:'); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return; }
  console.log('Generated-output cleanliness check passed.');
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`Generated-output cleanliness check failed: ${error.message}`); process.exitCode = 1; });
