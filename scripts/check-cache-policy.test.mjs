import assert from 'node:assert/strict';
import test from 'node:test';
import { checkCachePolicy } from './check-cache-policy.mjs';

const validPolicy = String.raw`
<FilesMatch "\.(?:html?|xml|txt)$">
    Header always set Cache-Control "no-cache, max-age=0, must-revalidate"
  </FilesMatch>
<FilesMatch "\.[A-Za-z0-9_-]{8,}\.(?:css|js|mjs)$">
    Header always set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
<FilesMatch "-v[0-9]+\.(?:webp|avif|png)$">
    Header always set Cache-Control "public, max-age=31536000, immutable"
  </FilesMatch>
<FilesMatch "^(?:og\.png|ifl-pvp-logo\.webp)$">
    Header always set Cache-Control "no-cache, max-age=0, must-revalidate"
  </FilesMatch>
`;

test('accepts the release cache policy', () => {
  assert.deepEqual(checkCachePolicy(validPolicy), []);
});

test('rejects cache policy that can retain stale HTML across release switches', () => {
  const failures = checkCachePolicy(validPolicy.replace('no-cache, max-age=0, must-revalidate', 'public, max-age=86400'));
  assert.match(failures.join('\n'), /document and discovery-feed revalidation/);
});

test('requires distinct policies for hashed code, versioned art, and stable visuals', () => {
  const documentOnly = String.raw`
<FilesMatch "\.(?:html?|xml|txt)$">
    Header always set Cache-Control "no-cache, max-age=0, must-revalidate"
  </FilesMatch>
`;
  const failures = checkCachePolicy(documentOnly);
  assert.match(failures.join('\n'), /content-hashed code/);
  assert.match(failures.join('\n'), /versioned first-party art/);
  assert.match(failures.join('\n'), /public-visual revalidation/);
});
