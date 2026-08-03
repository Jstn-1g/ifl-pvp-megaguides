import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot, relativePosix, walkFiles, readJson } from './release-utils.mjs';

function pngDimensions(bytes) {
  const signature = '89504e470d0a1a0a';
  if (bytes.subarray(0, 8).toString('hex') !== signature || bytes.subarray(12, 16).toString('ascii') !== 'IHDR') return null;
  return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
}

function socialValue(html, name, value) {
  const expression = new RegExp(`<meta\\b(?=[^>]*\\b${name}=["']${value}["'])[^>]*\\bcontent=["']([^"']+)["'][^>]*>`, 'i');
  return expression.exec(html)?.[1]?.trim();
}

export async function checkSocialCard({ root = projectRoot, siteUrl = 'https://iflpvp.com' } = {}) {
  const failures = [];
  const cardPath = path.join(root, 'public', 'og.png');
  let card;
  try { card = pngDimensions(await readFile(cardPath)); } catch { failures.push('public/og.png is required; do not rely on a GitHub avatar or repository social-image fallback.'); }
  if (card && (card.width !== 1200 || card.height !== 630)) failures.push(`public/og.png must be exactly 1200x630; found ${card.width}x${card.height}.`);
  const allPublicPngs = (await walkFiles(path.join(root, 'public'))).filter((file) => file.toLowerCase().endsWith('.png'));
  for (const file of allPublicPngs) {
    if (relativePosix(root, file) === 'public/og.png') continue;
    const dimensions = pngDimensions(await readFile(file));
    if (dimensions?.width === 1200 && dimensions.height === 630) failures.push(`${relativePosix(root, file)} is a second 1200x630 social-card candidate; public social imagery is restricted to public/og.png.`);
  }
  try {
    const allowlist = await readJson(path.join(root, 'governance', 'public-asset-allowlist.json'));
    const socialAssets = Array.isArray(allowlist.assets) ? allowlist.assets.filter((asset) => asset?.role === 'social-card') : [];
    if (socialAssets.length !== 1 || socialAssets[0]?.path !== 'public/og.png') failures.push('public/og.png must be the only reviewed asset with role "social-card".');
  } catch { failures.push('public/og.png requires governance/public-asset-allowlist.json.'); }
  const expected = `${siteUrl}/og.png`;
  const dist = path.join(root, 'dist');
  for (const file of (await walkFiles(dist)).filter((item) => item.endsWith('.html'))) {
    const html = await readFile(file, 'utf8');
    const route = relativePosix(dist, file);
    for (const [name, value] of [['property', 'og:image'], ['name', 'twitter:image']]) {
      if (socialValue(html, name, value) !== expected) failures.push(`${route}: ${value} must exactly equal ${expected}.`);
    }
    if (/avatars\.githubusercontent\.com|github\.com\/.*avatar/i.test(html)) failures.push(`${route}: social metadata must not use a GitHub avatar fallback.`);
  }
  return { ok: failures.length === 0, failures };
}

async function main() {
  const result = await checkSocialCard();
  if (!result.ok) { console.error('Social card check failed:'); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return; }
  console.log('Social card check passed.');
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/check-social-card.mjs')) main().catch((error) => { console.error(`Social card check failed: ${error.message}`); process.exitCode = 1; });
