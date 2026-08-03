import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { invokedAsMain, projectRoot } from './release-utils.mjs';

const execFile = promisify(execFileCallback);

async function commitRange(suppliedRange, root) {
  if (suppliedRange) return suppliedRange;
  if (path.resolve(root) !== path.resolve(projectRoot)) return 'HEAD';
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

const dependabotIdentity = {
  name: 'dependabot[bot]',
  email: '49699333+dependabot[bot]@users.noreply.github.com',
};

export async function checkDco({ root = projectRoot, range, allowDependabot = false } = {}) {
  const revisionRange = await commitRange(range, root);
  const { stdout } = await execFile('git', ['log', '--format=%H%x00%an%x00%ae%x00%cn%x00%ce%x00%B%x00', revisionRange], { cwd: root, encoding: 'utf8' });
  const chunks = stdout.split('\0').map((chunk) => chunk.trim()).filter(Boolean);
  const failures = [];
  let exemptionCount = 0;
  for (let index = 0; index < chunks.length; index += 6) {
    const commit = chunks[index];
    const authorName = chunks[index + 1] ?? '';
    const authorEmail = chunks[index + 2] ?? '';
    const committerName = chunks[index + 3] ?? '';
    const committerEmail = chunks[index + 4] ?? '';
    const message = chunks[index + 5] ?? '';
    const signed = /^Signed-off-by:\s+.+<[^>]+>\s*$/im.test(message);
    const exactDependabotAuthor = authorName === dependabotIdentity.name && authorEmail === dependabotIdentity.email;
    const exactDependabotCommitter = committerName === dependabotIdentity.name && committerEmail === dependabotIdentity.email;
    if (!signed && allowDependabot && exactDependabotAuthor && exactDependabotCommitter) exemptionCount += 1;
    else if (!signed) failures.push(`${commit}: missing Signed-off-by trailer.`);
  }
  return { ok: failures.length === 0, failures, range: revisionRange, commitCount: chunks.length / 6, exemptionCount };
}

async function main() {
  const args = process.argv.slice(2);
  const unknown = args.filter((argument) => argument !== '--allow-dependabot');
  if (unknown.length > 0) throw new Error(`Unknown option(s): ${unknown.join(', ')}`);
  const result = await checkDco({ allowDependabot: args.includes('--allow-dependabot') });
  if (!result.ok) { console.error(`DCO check failed for ${result.range}:`); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return; }
  console.log(`DCO check passed: ${result.commitCount} commit(s) in ${result.range}.`);
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`DCO check failed: ${error.message}`); process.exitCode = 1; });
