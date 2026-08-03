import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
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
  await execFile('git', ['commit', '--allow-empty', `--author=${authorName} <${authorEmail}>`, '-m', message], { cwd: root });
  return root;
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
