import path from 'node:path';
import { chromium } from 'playwright';
import { invokedAsMain, projectRoot, relativePosix, walkFiles } from './release-utils.mjs';
import { withPreviewServer } from './qa-server.mjs';

async function generatedRoutes() {
  const dist = path.join(projectRoot, 'dist');
  const files = await walkFiles(dist);
  return files.filter((file) => file.endsWith('.html')).map((file) => {
    const relative = relativePosix(dist, file);
    if (relative === 'index.html') return '/';
    if (relative.endsWith('/index.html')) return `/${relative.slice(0, -'index.html'.length)}`;
    return `/${relative}`;
  }).sort();
}

export async function auditPageMedia(page, { productionOrigin = 'https://iflpvp.com' } = {}) {
  return page.evaluate(async ({ productionOrigin }) => {
    const candidates = new Set();
    const imageExtension = /\.(?:avif|gif|ico|jpe?g|png|svg|webp)(?:$|[?#])/i;
    const add = (rawValue) => {
      const value = rawValue?.trim();
      if (!value || value.startsWith('data:') || value.startsWith('blob:') || value.startsWith('#')) return;
      let url;
      try { url = new URL(value, document.baseURI); } catch { return; }
      if (url.origin === productionOrigin) url = new URL(`${url.pathname}${url.search}`, window.location.origin);
      if (url.origin === window.location.origin && imageExtension.test(url.pathname)) candidates.add(url.href);
    };
    const addSrcset = (srcset) => {
      for (const candidate of (srcset ?? '').split(',')) add(candidate.trim().split(/\s+/, 1)[0]);
    };
    const addCssUrls = (value) => {
      for (const match of (value ?? '').matchAll(/url\(\s*(?:"([^"]+)"|'([^']+)'|([^)'"\s]+))\s*\)/gi)) add(match[1] ?? match[2] ?? match[3]);
    };

    for (const image of document.querySelectorAll('img')) {
      add(image.getAttribute('src'));
      add(image.currentSrc);
      addSrcset(image.getAttribute('srcset'));
    }
    for (const source of document.querySelectorAll('picture source')) {
      add(source.getAttribute('src'));
      addSrcset(source.getAttribute('srcset'));
    }
    for (const video of document.querySelectorAll('video[poster]')) add(video.getAttribute('poster'));
    for (const preload of document.querySelectorAll('link[rel~="preload"][as="image"]')) {
      add(preload.getAttribute('href'));
      addSrcset(preload.getAttribute('imagesrcset'));
    }
    for (const meta of document.querySelectorAll('meta[property="og:image"], meta[name="twitter:image"]')) add(meta.getAttribute('content'));
    for (const svgImage of document.querySelectorAll('svg image')) add(svgImage.getAttribute('href') ?? svgImage.getAttribute('xlink:href'));

    const cssProperties = ['backgroundImage', 'borderImageSource', 'content', 'listStyleImage', 'maskImage'];
    for (const element of document.querySelectorAll('*')) {
      for (const pseudo of [null, '::before', '::after']) {
        const style = getComputedStyle(element, pseudo);
        for (const property of cssProperties) addCssUrls(style[property]);
      }
    }
    const visitRules = (rules) => {
      for (const rule of rules ?? []) {
        addCssUrls(rule.cssText);
        if ('cssRules' in rule) visitRules(rule.cssRules);
      }
    };
    for (const sheet of document.styleSheets) {
      try { visitRules(sheet.cssRules); } catch { /* Cross-origin stylesheets are not part of the local media contract. */ }
    }

    const failures = [];
    await Promise.all([...candidates].map((url) => new Promise((resolve) => {
      const image = new Image();
      const timer = setTimeout(() => { failures.push(`${url} (decode timeout)`); resolve(); }, 8_000);
      const finish = (error) => {
        clearTimeout(timer);
        if (error || image.naturalWidth <= 0) failures.push(`${url} (${error ?? 'zero natural width'})`);
        resolve();
      };
      image.onload = () => finish();
      image.onerror = () => finish('decode failed');
      image.src = url;
    })));
    return { candidateCount: candidates.size, failures };
  }, { productionOrigin });
}

async function run(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const routes = await generatedRoutes();
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      for (const route of routes) {
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion: 'reduce' });
        const label = `${viewport.name}${route}`;
        const resourceFailures = [];
        page.on('requestfailed', (request) => resourceFailures.push(`${request.url()} (${request.failure()?.errorText ?? 'request failed'})`));
        page.on('response', (response) => {
          const type = response.request().resourceType();
          if (['image', 'media', 'font', 'stylesheet'].includes(type) && response.status() >= 400) resourceFailures.push(`${response.url()} (${response.status()})`);
        });
        const response = await page.goto(new URL(route, `${baseUrl}/`).href, { waitUntil: 'load', timeout: 15_000 });
        if (!response?.ok()) failures.push(`${label}: document returned ${response?.status() ?? 'no response'}.`);
        const audit = await auditPageMedia(page);
        for (const failure of audit.failures) failures.push(`${label}: broken media candidate ${failure}.`);
        for (const failure of resourceFailures) failures.push(`${label}: failed resource ${failure}.`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log(`Media QA passed: ${routes.length} generated route(s), desktop and mobile.`);
}

if (invokedAsMain(import.meta.url)) withPreviewServer(run, { root: projectRoot }).catch((error) => { console.error(`Media QA failed: ${error.message}`); process.exitCode = 1; });
