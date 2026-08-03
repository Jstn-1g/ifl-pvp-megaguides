import { stat } from 'node:fs/promises';
import path from 'node:path';
import { checkSeoOutput } from './check-seo-output.mjs';
import { checkSocialCard } from './check-social-card.mjs';
import { projectRoot, relativePosix, walkFiles } from './release-utils.mjs';

export async function checkBuild({ root = projectRoot } = {}) {
  const dist = path.join(root, 'dist');
  const failures = [];
  let files = [];
  try { files = await walkFiles(dist); } catch { failures.push('dist/ is missing; run the production build first.'); }
  const relative = new Set(files.map((file) => relativePosix(dist, file)));
  for (const required of ['.htaccess', 'index.html', '404.html', 'robots.txt', 'sitemap-index.xml', 'sitemap-0.xml', 'rss.xml']) {
    if (!relative.has(required)) failures.push(`dist/${required} is required for a public static release.`);
  }
  let totalBytes = 0;
  for (const file of files) {
    const bytes = (await stat(file)).size;
    totalBytes += bytes;
    if (bytes > 5 * 1024 * 1024) failures.push(`${relativePosix(dist, file)} exceeds the 5 MiB single-file public budget.`);
    if (/\.(?:env|pem|key|pfx|p12)$/i.test(file)) failures.push(`${relativePosix(dist, file)} is a forbidden generated credential-like file.`);
  }
  if (totalBytes > 20 * 1024 * 1024) failures.push(`dist exceeds the 20 MiB public artifact budget (${totalBytes} bytes).`);
  if (!failures.length) {
    const [seo, social] = await Promise.all([checkSeoOutput({ root }), checkSocialCard({ root })]);
    failures.push(...seo.failures, ...social.failures);
  }
  return { ok: failures.length === 0, failures, fileCount: files.length, totalBytes };
}

async function main() {
  const result = await checkBuild();
  if (!result.ok) { console.error('Build check failed:'); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return; }
  console.log(`Build check passed: ${result.fileCount} files, ${result.totalBytes} bytes.`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/check-build.mjs')) main().catch((error) => { console.error(`Build check failed: ${error.message}`); process.exitCode = 1; });
