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
  await mkdir(path.join(root, 'docs', 'screenshots'), { recursive: true });
  await mkdir(path.join(root, 'governance'), { recursive: true });
  const approved = path.join(root, 'public', 'og.png');
  const approvedScreenshot = path.join(root, 'docs', 'screenshots', 'home.png');
  await writeFile(approved, 'first-party');
  await writeFile(approvedScreenshot, 'first-party-screen');
  const digest = createHash('sha256').update('first-party').digest('hex');
  const screenshotDigest = createHash('sha256').update('first-party-screen').digest('hex');
  await writeFile(path.join(root, 'governance', 'public-asset-allowlist.json'), JSON.stringify({ schemaVersion: 1, assets: [
    { path: 'public/og.png', sha256: digest, rightsBasis: 'first-party original', role: 'social-card' },
    { path: 'docs/screenshots/home.png', sha256: screenshotDigest, rightsBasis: 'first-party interface capture', role: 'other' },
  ] }));
  const accepted = await auditPublicBoundary({ root, paths: ['docs/screenshots/home.png', 'public/og.png'] });
  assert.equal(accepted.ok, true);
  await writeFile(path.join(root, 'public', 'unreviewed.png'), 'not-reviewed');
  await writeFile(path.join(root, 'docs', 'screenshots', 'unreviewed.png'), 'not-reviewed');
  const rejected = await auditPublicBoundary({ root, paths: ['docs/screenshots/home.png', 'docs/screenshots/unreviewed.png', 'public/og.png', 'public/unreviewed.png'] });
  assert.equal(rejected.ok, false);
  assert.match(rejected.failures.join('\n'), /not on the exact public asset allowlist/);
  assert.match(rejected.failures.join('\n'), /private\/media-vault path is forbidden/);
});
