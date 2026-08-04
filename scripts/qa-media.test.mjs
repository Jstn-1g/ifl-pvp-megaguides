import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import test from 'node:test';
import { chromium } from 'playwright';
import { auditPageMedia } from './qa-media.mjs';

const validPng = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9ZJ1sAAAAASUVORK5CYII=', 'base64');

test('media QA decodes every srcset and CSS image candidate, not only the selected image', async (t) => {
  const server = createServer((request, response) => {
    if (request.url === '/good.png') { response.writeHead(200, { 'content-type': 'image/png' }); response.end(validPng); return; }
    if (request.url === '/bad-responsive.webp' || request.url === '/bad-background.webp') { response.writeHead(200, { 'content-type': 'image/webp' }); response.end('not an image'); return; }
    response.writeHead(200, { 'content-type': 'text/html' });
    response.end('<!doctype html><html><head><style>.art{background-image:url(/bad-background.webp)}</style></head><body><img src="/good.png" srcset="/good.png 1x, /bad-responsive.webp 2x" alt=""><div class="art">test</div></body></html>');
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const browser = await chromium.launch({ headless: true });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 800, height: 600 }, deviceScaleFactor: 1 });
  await page.goto(`http://127.0.0.1:${address.port}/`, { waitUntil: 'load' });
  const result = await auditPageMedia(page);
  assert.equal(result.candidateCount, 3);
  assert.equal(result.failures.length, 2);
  assert.match(result.failures.join('\n'), /bad-responsive\.webp/);
  assert.match(result.failures.join('\n'), /bad-background\.webp/);
  assert.doesNotMatch(result.failures.join('\n'), /good\.png/);
});
