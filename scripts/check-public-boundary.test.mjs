import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtemp, mkdir, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { auditPublicBoundary } from './check-public-boundary.mjs';

test('public boundary accepts an exact reviewed asset and rejects an unreviewed one', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ifl-public-boundary-'));
  await mkdir(path.join(root, 'public'), { recursive: true });
  await mkdir(path.join(root, 'governance'), { recursive: true });
  const approved = path.join(root, 'public', 'og.png');
  await writeFile(approved, 'first-party');
  const digest = createHash('sha256').update('first-party').digest('hex');
  await writeFile(path.join(root, 'governance', 'public-asset-allowlist.json'), JSON.stringify({ schemaVersion: 1, assets: [{ path: 'public/og.png', sha256: digest, rightsBasis: 'first-party original', role: 'social-card' }] }));
  const accepted = await auditPublicBoundary({ root, paths: ['public/og.png'] });
  assert.equal(accepted.ok, true);
  await writeFile(path.join(root, 'public', 'unreviewed.png'), 'not-reviewed');
  const rejected = await auditPublicBoundary({ root, paths: ['public/og.png', 'public/unreviewed.png'] });
  assert.equal(rejected.ok, false);
  assert.match(rejected.failures.join('\n'), /not on the exact public asset allowlist/);
});
