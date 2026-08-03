import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkVersion } from './check-version.mjs';

test('version gate accepts a locked private package and matching tag', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ifl-version-'));
  const packageJson = { name: 'example', version: '1.2.3-rc.1', private: true };
  await writeFile(path.join(root, 'package.json'), JSON.stringify(packageJson));
  await writeFile(path.join(root, 'package-lock.json'), JSON.stringify({ name: 'example', packages: { '': packageJson } }));
  const result = await checkVersion({ root, environment: { GITHUB_REF_TYPE: 'tag', GITHUB_REF_NAME: 'v1.2.3-rc.1' } });
  assert.equal(result.ok, true);
});
