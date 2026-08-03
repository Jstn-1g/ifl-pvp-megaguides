import assert from 'node:assert/strict';
import test from 'node:test';
import { checkLegacyRetirementPolicy, isPrivateDeployArtifactPath } from './check-legacy-retirement.mjs';

const validPolicy = `
ErrorDocument 410 /archive/index.html
RewriteEngine On
RewriteRule (^|/)\\.deploy-(?:stage|backup|lock)(?:-|/|$) - [F,L,NC]
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ - [G,L]
`;

test('accepts the governed legacy-retirement policy', () => {
  assert.deepEqual(checkLegacyRetirementPolicy(validPolicy), []);
});

test('rejects a policy that falls back to ambiguous 404 responses', () => {
  const failures = checkLegacyRetirementPolicy('Options -Indexes\n');
  assert.equal(failures.length, 6);
  assert.match(failures.join('\n'), /410 error document/);
  assert.match(failures.join('\n'), /terminal Gone rule/);
});

test('models private deployment artifact boundaries without blocking normal dot paths', () => {
  for (const path of [
    '.deploy-stage',
    '.deploy-stage-v0.3.3/index.html',
    'nested/.deploy-backup/legacy.html',
    '.deploy-backup-20260803/index.html',
    '.deploy-lock',
    '.deploy-lock-v0.3.3-id.json',
  ]) assert.equal(isPrivateDeployArtifactPath(path), true, path);

  for (const path of ['.well-known/acme-challenge/token', 'about/index.html', '.deploy-staged/index.html']) {
    assert.equal(isPrivateDeployArtifactPath(path), false, path);
  }
});

test('rejects a deployment-artifact deny rule placed after preservation exceptions', () => {
  const reordered = validPolicy
    .replace('RewriteRule (^|/)\\.deploy-(?:stage|backup|lock)(?:-|/|$) - [F,L,NC]\n', '')
    .replace('RewriteCond %{REQUEST_FILENAME} !-d\n', 'RewriteCond %{REQUEST_FILENAME} !-d\nRewriteRule (^|/)\\.deploy-(?:stage|backup|lock)(?:-|/|$) - [F,L,NC]\n');
  assert.match(checkLegacyRetirementPolicy(reordered).join('\n'), /before file\/directory preservation/);
});
