import { access, readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot, relativePosix, walkFiles } from './release-utils.mjs';

const siteOrigin = 'https://iflpvp.com';
const ignoredSchemes = /^(?:data|blob|mailto|tel|javascript):/i;

function htmlBasePath(relativeFile) {
  if (relativeFile === 'index.html') return '/';
  if (relativeFile.endsWith('/index.html')) return `/${relativeFile.slice(0, -'index.html'.length)}`;
  return `/${relativeFile}`;
}

function attribute(tag, name) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i'));
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function srcsetValues(value) {
  return value.split(',').map((candidate) => candidate.trim().split(/\s+/, 1)[0]).filter(Boolean);
}

function cssValues(source) {
  return [...source.matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi)]
    .map((match) => match[1] ?? match[2] ?? match[3])
    .filter(Boolean);
}

export function collectHtmlMediaReferences(source) {
  const references = [];
  for (const match of source.matchAll(/<(?:img|source|video|link|meta)\b[^>]*>/gi)) {
    const tag = match[0];
    const name = tag.match(/^<([a-z]+)/i)?.[1]?.toLowerCase();
    if (name === 'img' || name === 'source') {
      const src = attribute(tag, 'src');
      const srcset = attribute(tag, 'srcset');
      if (src) references.push({ value: src, context: `${name}[src]` });
      if (srcset) references.push(...srcsetValues(srcset).map((value) => ({ value, context: `${name}[srcset]` })));
    } else if (name === 'video') {
      const poster = attribute(tag, 'poster');
      if (poster) references.push({ value: poster, context: 'video[poster]' });
    } else if (name === 'link') {
      const rel = attribute(tag, 'rel')?.toLowerCase().split(/\s+/) ?? [];
      const as = attribute(tag, 'as')?.toLowerCase();
      const href = attribute(tag, 'href');
      if (href && rel.includes('preload') && as === 'image') references.push({ value: href, context: 'link[rel=preload][as=image]' });
    } else if (name === 'meta') {
      const key = (attribute(tag, 'property') ?? attribute(tag, 'name'))?.toLowerCase();
      const content = attribute(tag, 'content');
      if (content && ['og:image', 'twitter:image'].includes(key ?? '')) references.push({ value: content, context: `meta[${key}]` });
    }
  }
  for (const value of cssValues(source)) references.push({ value, context: 'inline-css[url]' });
  return references;
}

function outputPathForReference(value, basePath, dist) {
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith('#') || ignoredSchemes.test(trimmed) || trimmed.startsWith('//')) return undefined;
  let url;
  try { url = new URL(trimmed, new URL(basePath, siteOrigin)); } catch { return { error: `invalid media URL ${JSON.stringify(value)}` }; }
  if (url.origin !== siteOrigin) return undefined;
  let pathname;
  try { pathname = decodeURIComponent(url.pathname); } catch { return { error: `invalid URL encoding in ${JSON.stringify(value)}` }; }
  const normalized = path.posix.normalize(pathname);
  if (!normalized.startsWith('/') || normalized.includes('/../') || normalized === '/..') return { error: `unsafe media path ${JSON.stringify(value)}` };
  const relative = normalized.replace(/^\/+/, '');
  if (!relative) return { error: `media reference points to the site root: ${JSON.stringify(value)}` };
  return { path: path.join(dist, ...relative.split('/')), relative };
}

export async function checkRenderedMedia({ root = projectRoot } = {}) {
  const dist = path.join(root, 'dist');
  const failures = [];
  let files = [];
  try { files = await walkFiles(dist); } catch { return { ok: false, failures: ['dist/ is missing; run the production build first.'], referenceCount: 0 }; }
  let referenceCount = 0;
  for (const file of files) {
    const relativeFile = relativePosix(dist, file);
    const extension = path.extname(file).toLowerCase();
    if (!['.html', '.css'].includes(extension)) continue;
    const source = await readFile(file, 'utf8');
    const references = extension === '.html'
      ? collectHtmlMediaReferences(source)
      : cssValues(source).map((value) => ({ value, context: 'css[url]' }));
    const basePath = extension === '.html' ? htmlBasePath(relativeFile) : `/${relativeFile}`;
    for (const reference of references) {
      const resolved = outputPathForReference(reference.value, basePath, dist);
      if (!resolved) continue;
      referenceCount += 1;
      if (resolved.error) { failures.push(`${relativeFile} ${reference.context}: ${resolved.error}`); continue; }
      try { await access(resolved.path); } catch { failures.push(`${relativeFile} ${reference.context}: ${reference.value} resolves to missing dist/${resolved.relative}`); }
    }
  }
  return { ok: failures.length === 0, failures, referenceCount };
}

async function main() {
  const result = await checkRenderedMedia();
  if (!result.ok) {
    console.error(`Rendered media check failed with ${result.failures.length} issue(s):`);
    result.failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log(`Rendered media check passed: ${result.referenceCount} local media reference(s) resolved.`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/check-rendered-media.mjs')) main().catch((error) => { console.error(`Rendered media check failed: ${error.message}`); process.exitCode = 1; });
