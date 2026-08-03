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
