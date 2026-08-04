import assert from 'node:assert/strict';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { checkRenderedMedia, collectHtmlMediaReferences } from './check-rendered-media.mjs';

async function fixture(files) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'ifl-rendered-media-'));
  for (const [name, content] of Object.entries(files)) {
    const target = path.join(root, 'dist', ...name.split('/'));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, content);
  }
  return root;
}

test('collects responsive, poster, preload, social, and CSS media', () => {
  const found = collectHtmlMediaReferences('<img src="/a.webp" srcset="/b.webp 1x, /c.webp 2x"><picture><source srcset="/d.webp 400w"></picture><video poster="/e.webp"></video><link rel="preload" as="image" href="/f.webp"><meta property="og:image" content="https://iflpvp.com/g.png"><style>.x{background:url(/h.webp)}</style>');
  assert.deepEqual(found.map(({ value }) => value), ['/a.webp', '/b.webp', '/c.webp', '/d.webp', '/e.webp', '/f.webp', 'https://iflpvp.com/g.png', '/h.webp']);
});

test('passes when every rendered local media reference exists', async (t) => {
  const root = await fixture({
    'index.html': '<img src="/brand/a.webp"><meta name="twitter:image" content="https://iflpvp.com/og.png"><style>.hero{background:url(./brand/a.webp)}</style>',
    'brand/a.webp': 'a',
    'og.png': 'og',
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await checkRenderedMedia({ root });
  assert.equal(result.ok, true, result.failures.join('\n'));
  assert.equal(result.referenceCount, 3);
});

test('reports every missing responsive and CSS candidate with its source', async (t) => {
  const root = await fixture({
    'guides/index.html': '<picture><source srcset="./small.webp 400w, /large.webp 1200w"><img src="/fallback.webp"></picture>',
    'assets/site.css': '.hero{background-image:url(../missing-bg.webp)}',
  });
  t.after(() => rm(root, { recursive: true, force: true }));
  const result = await checkRenderedMedia({ root });
  assert.equal(result.ok, false);
  assert.equal(result.failures.length, 4);
  assert.match(result.failures.join('\n'), /guides\/small\.webp/);
  assert.match(result.failures.join('\n'), /large\.webp/);
  assert.match(result.failures.join('\n'), /fallback\.webp/);
  assert.match(result.failures.join('\n'), /missing-bg\.webp/);
});
