import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkWorkflows } from './check-workflows.mjs';

async function fixture(source) {
  const root = await mkdtemp(path.join(tmpdir(), 'ifl-workflow-check-'));
  const workflows = path.join(root, '.github', 'workflows');
  await mkdir(workflows, { recursive: true });
  await writeFile(path.join(workflows, 'ci.yml'), source, 'utf8');
  return root;
}

test('workflow checker accepts pinned actions and quoted shell environment', async () => {
  const root = await fixture(`name: Safe\non: [push]\npermissions:\n  contents: read\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1\n      - env:\n          BUILD_SHA: \${{ github.sha }}\n        run: node verify.mjs \"$BUILD_SHA\"\n`);
  try { assert.equal((await checkWorkflows({ root })).ok, true); }
  finally { await rm(root, { recursive: true, force: true }); }
});

test('workflow checker rejects mutable actions, direct shell expressions, and unapproved write permissions', async () => {
  const root = await fixture(`name: Unsafe\non: [push]\npermissions:\n  contents: read\n  id-token: write\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo \"\${{ github.event.issue.title }}\"\n`);
  try {
    const result = await checkWorkflows({ root });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((failure) => failure.includes('full commit SHA')));
    assert.ok(result.failures.some((failure) => failure.includes('quoted environment variable')));
    assert.ok(result.failures.some((failure) => failure.includes('outside the workflow permission allowlist')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('workflow checker rejects a GitHub workflow dispatch without an explicit repository', async () => {
  const root = await fixture(`name: Unsafe dispatch\non: [push]\npermissions:\n  actions: write\n  contents: read\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - run: gh workflow run ci.yml --ref release-branch\n`);
  try {
    const result = await checkWorkflows({ root });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((failure) => failure.includes('explicit --repo target')));
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('release automation must use the repository vX.Y.Z tag convention', async () => {
  const root = await fixture(`name: Version PR\non: [push]\npermissions:\n  contents: write\n  pull-requests: write\njobs:\n  release:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: googleapis/release-please-action@45996ed1f6d02564a971a2fa1b5860e934307cf7\n`);
  try {
    await writeFile(path.join(root, 'release-please-config.json'), '{"include-component-in-tag":true,"include-v-in-tag":true}\n', 'utf8');
    const unsafe = await checkWorkflows({ root });
    assert.equal(unsafe.ok, false);
    assert.ok(unsafe.failures.some((failure) => failure.includes('vX.Y.Z tags without a component prefix')));

    await writeFile(path.join(root, 'release-please-config.json'), '{"include-component-in-tag":false,"include-v-in-tag":true}\n', 'utf8');
    assert.equal((await checkWorkflows({ root })).ok, true);
  } finally { await rm(root, { recursive: true, force: true }); }
});

test('public release workflow must identify and check out the pull request head', async () => {
  const root = await fixture(`name: Public release verification\non: [pull_request]\npermissions:\n  contents: read\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    env:\n      PUBLIC_BUILD_SHA: \${{ github.sha }}\n    steps:\n      - uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1\n`);
  try {
    const result = await checkWorkflows({ root });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((failure) => failure.includes('public build identity')));
    assert.ok(result.failures.some((failure) => failure.includes('synthetic merge commits')));
  } finally { await rm(root, { recursive: true, force: true }); }
});
