import { execFile as execFileCallback } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { invokedAsMain, projectRoot, readJson } from './release-utils.mjs';

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

async function recordedExceptions(root) {
  const manifestPath = path.join(root, 'governance', 'dco-exceptions.json');
  let manifest;
  try {
    manifest = await readJson(manifestPath);
  } catch (error) {
    if (error?.code === 'ENOENT') return new Map();
    throw error;
  }
  if (!manifest || manifest.schemaVersion !== 1 || manifest.policy !== 'exact-commit-only' || !Array.isArray(manifest.exceptions)) {
    throw new Error('governance/dco-exceptions.json must be a schemaVersion 1 exact-commit-only manifest.');
  }
  const packageJson = await readJson(path.join(root, 'package.json'));
  const repositoryUrl = typeof packageJson.repository === 'string' ? packageJson.repository : packageJson.repository?.url;
  const repositoryMatch = String(repositoryUrl ?? '').match(/github\.com[/:]([^/]+)\/([^/.]+)(?:\.git)?$/u);
  if (!repositoryMatch) throw new Error('package.json must identify the canonical GitHub repository before DCO exceptions can be used.');
  const repositorySlug = `${repositoryMatch[1]}/${repositoryMatch[2]}`;
  const exceptions = new Map();
  for (const [index, exception] of manifest.exceptions.entries()) {
    if (!/^[a-f0-9]{40}$/u.test(String(exception?.commit ?? ''))
      || !/^[a-f0-9]{40}$/u.test(String(exception?.sourceCommit ?? ''))
      || !/^refs\/tags\/dco-source-pr-\d+$/u.test(String(exception?.sourceRef ?? ''))
      || !/^[a-f0-9]{40}$/u.test(String(exception?.sourceTree ?? ''))
      || !new RegExp(`^https://github\\.com/${repositorySlug.replace('/', '\\/')}/pull/\\d+$`, 'u').test(String(exception?.pullRequest ?? ''))
      || typeof exception?.reason !== 'string' || !exception.reason.trim()
      || !/^\d{4}-\d{2}-\d{2}$/u.test(String(exception?.recordedAt ?? ''))
      || typeof exception?.recordedBy !== 'string' || !exception.recordedBy.trim()) {
      throw new Error(`governance/dco-exceptions.json exceptions[${index}] is incomplete or invalid.`);
    }
    if (exceptions.has(exception.commit)) throw new Error(`Duplicate DCO exception: ${exception.commit}`);

    let resolvedSource;
    try {
      ({ stdout: resolvedSource } = await execFile('git', ['rev-parse', '--verify', `${exception.sourceRef}^{commit}`], { cwd: root, encoding: 'utf8' }));
    } catch {
      throw new Error(`DCO exception source ref does not resolve: ${exception.sourceRef}`);
    }
    if (resolvedSource.trim() !== exception.sourceCommit) throw new Error(`DCO exception source ref does not match sourceCommit: ${exception.sourceRef}`);

    const [{ stdout: sourceMessage }, { stdout: sourceTree }, { stdout: exemptTree }] = await Promise.all([
      execFile('git', ['show', '-s', '--format=%B', exception.sourceCommit], { cwd: root, encoding: 'utf8' }),
      execFile('git', ['rev-parse', `${exception.sourceCommit}^{tree}`], { cwd: root, encoding: 'utf8' }),
      execFile('git', ['rev-parse', `${exception.commit}^{tree}`], { cwd: root, encoding: 'utf8' }),
    ]);
    if (!/^Signed-off-by:\s+.+<[^>]+>\s*$/im.test(sourceMessage)) throw new Error(`DCO exception source commit is not signed off: ${exception.sourceCommit}`);
    if (sourceTree.trim() !== exception.sourceTree) throw new Error(`DCO exception source tree differs from its evidence record: ${exception.sourceCommit}`);
    if (sourceTree.trim() !== exemptTree.trim()) throw new Error(`DCO exception source and squash trees differ: ${exception.commit}`);
    exceptions.set(exception.commit, exception);
  }
  return exceptions;
}

export async function checkDco({ root = projectRoot, range, allowDependabot = false } = {}) {
  const revisionRange = await commitRange(range, root);
  const exceptions = await recordedExceptions(root);
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
    if (!signed && exceptions.has(commit)) exemptionCount += 1;
    else if (!signed && allowDependabot && exactDependabotAuthor && exactDependabotCommitter) exemptionCount += 1;
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
  console.log(`DCO check passed: ${result.commitCount} commit(s) in ${result.range}; ${result.exemptionCount} exact exemption(s).`);
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`DCO check failed: ${error.message}`); process.exitCode = 1; });
