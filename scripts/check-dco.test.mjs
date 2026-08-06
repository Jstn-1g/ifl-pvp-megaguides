import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { checkDco } from './check-dco.mjs';

const execFile = promisify(execFileCallback);

async function fixture({
  name = 'Test Maintainer',
  email = 'maintainer@example.invalid',
  authorName = name,
  authorEmail = email,
  message,
}) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ifl-dco-'));
  await execFile('git', ['init', '-b', 'main'], { cwd: root });
  await execFile('git', ['config', 'user.name', name], { cwd: root });
  await execFile('git', ['config', 'user.email', email], { cwd: root });
  await writeFile(path.join(root, 'package.json'), `${JSON.stringify({ repository: { url: 'https://github.com/example/project.git' } }, null, 2)}\n`);
  await execFile('git', ['commit', '--allow-empty', `--author=${authorName} <${authorEmail}>`, '-m', message], { cwd: root });
  return root;
}

async function recordException(root, commit, overrides = {}) {
  const manifest = {
    schemaVersion: 1,
    policy: 'exact-commit-only',
    exceptions: [{
      commit,
      pullRequest: 'https://github.com/example/project/pull/1',
      sourceCommit: 'a'.repeat(40),
      sourceRef: 'refs/tags/dco-source-pr-1',
      sourceTree: 'b'.repeat(40),
      reason: 'A test-only exact exception for a generated squash commit.',
      recordedAt: '2026-08-06',
      recordedBy: 'Test Maintainer',
      ...overrides,
    }],
  };
  await mkdir(path.join(root, 'governance'), { recursive: true });
  await writeFile(path.join(root, 'governance', 'dco-exceptions.json'), `${JSON.stringify(manifest, null, 2)}\n`);
}

test('DCO checker validates a signed maintainer commit', async () => {
  const root = await fixture({ message: 'test: signed commit\n\nSigned-off-by: Test Maintainer <maintainer@example.invalid>' });
  try {
    const result = await checkDco({ root });
    assert.equal(result.ok, true, result.failures.join('\n'));
    assert.equal(result.commitCount, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker rejects an unsigned human even when the Dependabot exception is enabled', async () => {
  const root = await fixture({ message: 'test: unsigned human commit' });
  try {
    const result = await checkDco({ root, allowDependabot: true });
    assert.equal(result.ok, false);
    assert.match(result.failures[0], /missing Signed-off-by trailer/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker remains strict for an unsigned Dependabot commit by default', async () => {
  const root = await fixture({
    name: 'dependabot[bot]',
    email: '49699333+dependabot[bot]@users.noreply.github.com',
    message: 'build(deps): update a dependency',
  });
  try {
    const result = await checkDco({ root });
    assert.equal(result.ok, false);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker permits only the exact Dependabot identity when explicitly enabled', async () => {
  const root = await fixture({
    name: 'dependabot[bot]',
    email: '49699333+dependabot[bot]@users.noreply.github.com',
    message: 'build(deps): update a dependency',
  });
  try {
    const result = await checkDco({ root, allowDependabot: true });
    assert.equal(result.ok, true, result.failures.join('\n'));
    assert.equal(result.commitCount, 1);
    assert.equal(result.exemptionCount, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker rejects a Dependabot author with a human committer', async () => {
  const root = await fixture({
    authorName: 'dependabot[bot]',
    authorEmail: '49699333+dependabot[bot]@users.noreply.github.com',
    message: 'build(deps): update a dependency',
  });
  try {
    const result = await checkDco({ root, allowDependabot: true });
    assert.equal(result.ok, false);
    assert.equal(result.exemptionCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker rejects a Dependabot look-alike identity', async () => {
  const root = await fixture({
    name: 'dependabot[bot]',
    email: 'dependabot@example.invalid',
    message: 'build(deps): update a dependency',
  });
  try {
    const result = await checkDco({ root, allowDependabot: true });
    assert.equal(result.ok, false);
    assert.equal(result.exemptionCount, 0);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker permits only an exact recorded immutable commit', async () => {
  const root = await fixture({ message: 'test: signed source\n\nSigned-off-by: Test Maintainer <maintainer@example.invalid>' });
  try {
    const { stdout: sourceCommit } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    const { stdout: sourceTree } = await execFile('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root });
    await execFile('git', ['tag', 'dco-source-pr-1', sourceCommit.trim()], { cwd: root });
    await execFile('git', ['commit', '--allow-empty', '-m', 'test: generated squash without trailer'], { cwd: root });
    const { stdout: squashCommit } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    await recordException(root, squashCommit.trim(), { sourceCommit: sourceCommit.trim(), sourceTree: sourceTree.trim() });
    const result = await checkDco({ root });
    assert.equal(result.ok, true, result.failures.join('\n'));
    assert.equal(result.exemptionCount, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker rejects an unsigned commit that only resembles a recorded exception', async () => {
  const root = await fixture({ message: 'test: signed source\n\nSigned-off-by: Test Maintainer <maintainer@example.invalid>' });
  try {
    const { stdout: sourceCommit } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    const { stdout: sourceTree } = await execFile('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root });
    await execFile('git', ['tag', 'dco-source-pr-1', sourceCommit.trim()], { cwd: root });
    await execFile('git', ['commit', '--allow-empty', '-m', 'test: exact exempt squash'], { cwd: root });
    const { stdout: exemptCommit } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    await recordException(root, exemptCommit.trim(), { sourceCommit: sourceCommit.trim(), sourceTree: sourceTree.trim() });
    await execFile('git', ['commit', '--allow-empty', '-m', 'test: unsigned near-match'], { cwd: root });
    const result = await checkDco({ root });
    assert.equal(result.ok, false);
    assert.equal(result.exemptionCount, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker rejects malformed exception evidence', async () => {
  const root = await fixture({ message: 'test: malformed exception' });
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    await recordException(root, stdout.trim(), { pullRequest: 'not-a-url' });
    await assert.rejects(() => checkDco({ root }), /incomplete or invalid/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker rejects a source ref that does not resolve', async () => {
  const root = await fixture({ message: 'test: unsigned squash' });
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    await recordException(root, stdout.trim());
    await assert.rejects(() => checkDco({ root }), /source ref does not resolve/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker rejects an unsigned source commit', async () => {
  const root = await fixture({ message: 'test: unsigned source' });
  try {
    const { stdout: sourceCommit } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    const { stdout: sourceTree } = await execFile('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root });
    await execFile('git', ['tag', 'dco-source-pr-1', sourceCommit.trim()], { cwd: root });
    await execFile('git', ['commit', '--allow-empty', '-m', 'test: unsigned squash'], { cwd: root });
    const { stdout: squashCommit } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    await recordException(root, squashCommit.trim(), { sourceCommit: sourceCommit.trim(), sourceTree: sourceTree.trim() });
    await assert.rejects(() => checkDco({ root }), /source commit is not signed off/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker rejects a source tree that differs from the exempted squash', async () => {
  const root = await fixture({ message: 'test: signed source\n\nSigned-off-by: Test Maintainer <maintainer@example.invalid>' });
  try {
    const { stdout: sourceCommit } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    const { stdout: sourceTree } = await execFile('git', ['rev-parse', 'HEAD^{tree}'], { cwd: root });
    await execFile('git', ['tag', 'dco-source-pr-1', sourceCommit.trim()], { cwd: root });
    await writeFile(path.join(root, 'changed.txt'), 'different tree\n');
    await execFile('git', ['add', 'changed.txt'], { cwd: root });
    await execFile('git', ['commit', '-m', 'test: unsigned squash with changed tree'], { cwd: root });
    const { stdout: squashCommit } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    await recordException(root, squashCommit.trim(), { sourceCommit: sourceCommit.trim(), sourceTree: sourceTree.trim() });
    await assert.rejects(() => checkDco({ root }), /source and squash trees differ/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('DCO checker rejects a pull request URL from another repository', async () => {
  const root = await fixture({ message: 'test: unsigned squash' });
  try {
    const { stdout } = await execFile('git', ['rev-parse', 'HEAD'], { cwd: root });
    await recordException(root, stdout.trim(), { pullRequest: 'https://github.com/other/project/pull/1' });
    await assert.rejects(() => checkDco({ root }), /incomplete or invalid/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
