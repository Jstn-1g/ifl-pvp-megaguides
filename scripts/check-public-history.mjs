import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { invokedAsMain, projectRoot } from './release-utils.mjs';

const execFile = promisify(execFileCallback);

export async function checkPublicHistory({ root = projectRoot } = {}) {
  const failures = [];
  const roots = (await execFile('git', ['rev-list', '--max-parents=0', 'HEAD'], { cwd: root, encoding: 'utf8' })).stdout.trim().split(/\s+/).filter(Boolean);
  if (roots.length !== 1) failures.push(`public repository must have exactly one reachable root commit; found ${roots.length}.`);
  if (roots[0]) {
    const rootMessage = (await execFile('git', ['show', '-s', '--format=%B', roots[0]], { cwd: root, encoding: 'utf8' })).stdout;
    if (!/^Public-Export:\s*IFL PvP MegaGuides\s*$/im.test(rootMessage)) failures.push('fresh root commit must include "Public-Export: IFL PvP MegaGuides" provenance trailer.');
    if (!/^Signed-off-by:\s+.+<[^>]+>\s*$/im.test(rootMessage)) failures.push('fresh root commit must include a Signed-off-by trailer.');
  }
  const { stdout: remotes } = await execFile('git', ['remote', '-v'], { cwd: root, encoding: 'utf8' });
  if (/ifl-pvp-news|private-archive/i.test(remotes)) failures.push('public repository remote configuration still points at a private or legacy archive.');
  return { ok: failures.length === 0, failures, root: roots[0] };
}

async function main() {
  const result = await checkPublicHistory();
  if (!result.ok) { console.error('Public history check failed:'); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return; }
  console.log(`Public history check passed: fresh root ${result.root}.`);
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`Public history check failed: ${error.message}`); process.exitCode = 1; });
