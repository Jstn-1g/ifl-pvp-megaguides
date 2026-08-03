import { execFile as execFileCallback } from 'node:child_process';
import { promisify } from 'node:util';
import { invokedAsMain, projectRoot } from './release-utils.mjs';

const execFile = promisify(execFileCallback);

async function commitRange(suppliedRange) {
  if (suppliedRange) return suppliedRange;
  if (process.env.GITHUB_EVENT_PATH) {
    try {
      const event = JSON.parse(await (await import('node:fs/promises')).readFile(process.env.GITHUB_EVENT_PATH, 'utf8'));
      if (event.pull_request?.base?.sha) return `${event.pull_request.base.sha}..HEAD`;
    } catch {
      // Fall back to auditing the local candidate when an event file is unavailable.
    }
  }
  return 'HEAD';
}

export async function checkDco({ root = projectRoot, range } = {}) {
  const revisionRange = await commitRange(range);
  const { stdout } = await execFile('git', ['log', '--format=%H%x00%B%x00', revisionRange], { cwd: root, encoding: 'utf8' });
  const chunks = stdout.split('\0').map((chunk) => chunk.trim()).filter(Boolean);
  const failures = [];
  for (let index = 0; index < chunks.length; index += 2) {
    const commit = chunks[index];
    const message = chunks[index + 1] ?? '';
    if (!/^Signed-off-by:\s+.+<[^>]+>\s*$/im.test(message)) failures.push(`${commit}: missing Signed-off-by trailer.`);
  }
  return { ok: failures.length === 0, failures, range: revisionRange, commitCount: chunks.length / 2 };
}

async function main() {
  const result = await checkDco();
  if (!result.ok) { console.error(`DCO check failed for ${result.range}:`); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return; }
  console.log(`DCO check passed: ${result.commitCount} commit(s) in ${result.range}.`);
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`DCO check failed: ${error.message}`); process.exitCode = 1; });
