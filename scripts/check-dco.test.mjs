import assert from 'node:assert/strict';
import { execFile as execFileCallback } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import test from 'node:test';
import { checkDco } from './check-dco.mjs';

const execFile = promisify(execFileCallback);

test('DCO checker ignores Git record-separator newlines and validates the real commit', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ifl-dco-'));
  try {
    await execFile('git', ['init', '-b', 'main'], { cwd: root });
    await execFile('git', ['config', 'user.name', 'Test Maintainer'], { cwd: root });
    await execFile('git', ['config', 'user.email', 'maintainer@example.invalid'], { cwd: root });
    await execFile('git', ['commit', '--allow-empty', '-m', 'test: signed commit\n\nSigned-off-by: Test Maintainer <maintainer@example.invalid>'], { cwd: root });
    const result = await checkDco({ root });
    assert.equal(result.ok, true, result.failures.join('\n'));
    assert.equal(result.commitCount, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
