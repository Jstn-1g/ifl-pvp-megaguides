import assert from 'node:assert/strict';
import test from 'node:test';
import { checkLegacyRetirementPolicy } from './check-legacy-retirement.mjs';

const validPolicy = `
ErrorDocument 410 /archive/index.html
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ - [G,L]
`;

test('accepts the governed legacy-retirement policy', () => {
  assert.deepEqual(checkLegacyRetirementPolicy(validPolicy), []);
});

test('rejects a policy that falls back to ambiguous 404 responses', () => {
  const failures = checkLegacyRetirementPolicy('Options -Indexes\n');
  assert.equal(failures.length, 5);
  assert.match(failures.join('\n'), /410 error document/);
  assert.match(failures.join('\n'), /terminal Gone rule/);
});
