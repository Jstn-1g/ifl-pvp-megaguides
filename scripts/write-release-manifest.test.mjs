import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeReleaseManifest } from './write-release-manifest.mjs';

test('release manifest is byte-identical across repeated writes', async () => {
  const root = await mkdtemp(path.join(tmpdir(), 'ifl-release-manifest-'));
  const dist = path.join(root, 'dist');
  const commit = '0123456789abcdef0123456789abcdef01234567';

  try {
    await mkdir(path.join(dist, 'nested'), { recursive: true });
    await writeFile(path.join(dist, 'a.txt'), 'alpha\n', 'utf8');
    await writeFile(path.join(dist, 'B.txt'), 'bravo\n', 'utf8');
    await writeFile(path.join(dist, 'nested', 'c.txt'), 'charlie\n', 'utf8');

    const first = await writeReleaseManifest({ root, tag: 'v1.2.3', commit });
    const firstBytes = await readFile(path.join(dist, 'release-manifest.json'));
    const second = await writeReleaseManifest({ root, tag: 'v1.2.3', commit });
    const secondBytes = await readFile(path.join(dist, 'release-manifest.json'));

    assert.deepEqual(secondBytes, firstBytes);
    assert.deepEqual(second, first);
    assert.equal(first.schemaVersion, 2);
    assert.equal(Object.hasOwn(first, 'generatedAt'), false);
    assert.deepEqual(first.files.map((file) => file.path), ['B.txt', 'a.txt', 'nested/c.txt']);
    assert.equal(
      first.manifestSha256,
      createHash('sha256')
        .update(first.files.map((file) => `${file.path}\0${file.sha256}\n`).join(''))
        .digest('hex'),
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
