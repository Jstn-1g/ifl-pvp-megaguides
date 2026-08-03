import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot, relativePosix, walkFiles } from './release-utils.mjs';

function attribute(html, tag, attributeName, required = {}) {
  const attributes = Object.entries(required).map(([name, value]) => `(?=[^>]*\\b${name}=["']${value}["'])`).join('');
  const expression = new RegExp(`<${tag}\\b${attributes}[^>]*\\b${attributeName}=["']([^"']+)["'][^>]*>`, 'i');
  return expression.exec(html)?.[1]?.trim();
}

function routeFor(dist, file) {
  const relative = relativePosix(dist, file);
  return relative === 'index.html' ? '/' : `/${relative.replace(/\/index\.html$/, '').replace(/\.html$/, '')}`;
}

function outputFor(dist, absoluteUrl) {
  const url = new URL(absoluteUrl);
  const parts = decodeURIComponent(url.pathname).replace(/^\/+|\/+$/g, '').split('/').filter(Boolean);
  return path.join(dist, ...(parts.length ? parts : []), 'index.html');
}

function allLinks(html) {
  return [...html.matchAll(/<a\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)].map((match) => match[1].replaceAll('&amp;', '&').trim()).filter(Boolean);
}

export async function checkSeoOutput({ root = projectRoot, siteUrl = 'https://iflpvp.com' } = {}) {
  const dist = path.join(root, 'dist');
  const failures = [];
  const htmlFiles = (await walkFiles(dist)).filter((file) => file.endsWith('.html'));
  const seenTitles = new Map();
  const seenCanonicals = new Map();
  const rendered = new Map();
  for (const file of htmlFiles) {
    const html = await readFile(file, 'utf8');
    const route = routeFor(dist, file);
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.trim();
    const description = attribute(html, 'meta', 'content', { name: 'description' });
    const canonical = attribute(html, 'link', 'href', { rel: 'canonical' });
    if (!title) failures.push(`${route}: missing title.`);
    if (!description) failures.push(`${route}: missing meta description.`);
    if (!canonical) failures.push(`${route}: missing canonical.`);
    else {
      try { if (new URL(canonical).origin !== siteUrl) failures.push(`${route}: canonical must use ${siteUrl}.`); }
      catch { failures.push(`${route}: invalid canonical URL.`); }
    }
    if (title && seenTitles.has(title)) failures.push(`${route}: duplicate title also used by ${seenTitles.get(title)}.`); else if (title) seenTitles.set(title, route);
    if (canonical && seenCanonicals.has(canonical)) failures.push(`${route}: duplicate canonical also used by ${seenCanonicals.get(canonical)}.`); else if (canonical) seenCanonicals.set(canonical, route);
    rendered.set(file, { route, html, canonical });
  }
  for (const [file, page] of rendered) {
    const base = page.canonical ?? new URL(page.route, siteUrl).href;
    for (const href of allLinks(page.html)) {
      let target;
      try { target = new URL(href, base); } catch { failures.push(`${page.route}: invalid link ${href}.`); continue; }
      if (target.origin !== siteUrl) continue;
      const targetFile = target.pathname === new URL(base).pathname ? file : outputFor(dist, target.href);
      try { await readFile(targetFile); } catch { failures.push(`${page.route}: internal link has no output target ${href}.`); }
    }
  }
  const sitemap = path.join(dist, 'sitemap-0.xml');
  try {
    const xml = await readFile(sitemap, 'utf8');
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1].trim());
    if (!urls.length) failures.push('sitemap contains no URLs.');
    for (const url of urls) {
      try {
        if (new URL(url).origin !== siteUrl) failures.push(`sitemap URL must use ${siteUrl}: ${url}`);
        await readFile(outputFor(dist, url));
      } catch { failures.push(`sitemap URL has no generated page: ${url}`); }
    }
  } catch { failures.push('dist/sitemap-0.xml is missing or unreadable.'); }
  return { ok: failures.length === 0, failures, htmlCount: htmlFiles.length };
}

async function main() {
  const result = await checkSeoOutput();
  if (!result.ok) { console.error('SEO output check failed:'); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return; }
  console.log(`SEO output check passed: ${result.htmlCount} pages.`);
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/check-seo-output.mjs')) main().catch((error) => { console.error(`SEO output check failed: ${error.message}`); process.exitCode = 1; });
