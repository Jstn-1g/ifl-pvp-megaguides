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

test('workflow checker rejects mutable actions and direct shell expressions', async () => {
  const root = await fixture(`name: Unsafe\non: [push]\npermissions:\n  contents: read\njobs:\n  verify:\n    runs-on: ubuntu-latest\n    steps:\n      - uses: actions/checkout@v4\n      - run: echo \"\${{ github.event.issue.title }}\"\n`);
  try {
    const result = await checkWorkflows({ root });
    assert.equal(result.ok, false);
    assert.ok(result.failures.some((failure) => failure.includes('full commit SHA')));
    assert.ok(result.failures.some((failure) => failure.includes('quoted environment variable')));
  } finally { await rm(root, { recursive: true, force: true }); }
});
