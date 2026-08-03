import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { projectRoot } from './release-utils.mjs';
import { withPreviewServer } from './qa-server.mjs';

async function run(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const outputDirectory = process.env.QA_OUTPUT_DIR;
  const routes = [
    { name: 'home', path: '/' },
    { name: 'guides', path: '/guides/' },
    { name: 'guide-hold', path: '/battlerite-complete-guide-every-champion/', noindex: true },
    { name: 'evidence-hold', path: '/bloodline-champions-complete-guide-every-bloodline/', noindex: true },
    { name: 'search', path: '/search/' },
    { name: 'support', path: '/support/' },
    { name: 'archive', path: '/archive/' },
    { name: 'not-found', path: '/definitely-not-a-public-route/', canonicalPath: '/404/', expectedStatus: 404, noindex: true },
  ];
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      for (const route of routes) {
        console.log(`Checking ${viewport.name}/${route.name}...`);
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
        page.setDefaultNavigationTimeout(10_000);
        const consoleErrors = [];
        const unexpected404s = [];
        page.on('console', (message) => {
          const text = message.text();
          if (message.type() === 'error' && !(route.expectedStatus === 404 && /Failed to load resource:.*404/i.test(text))) consoleErrors.push(text);
        });
        page.on('pageerror', (error) => consoleErrors.push(error.message));
        const requestedUrl = new URL(route.path, `${baseUrl}/`).href;
        page.on('response', (response) => { if (response.status() === 404 && !(route.expectedStatus === 404 && response.url() === requestedUrl)) unexpected404s.push(response.url()); });
        const response = await page.goto(requestedUrl, { waitUntil: 'load' });
        const label = `${viewport.name}/${route.name}`;
        const expectedStatus = route.expectedStatus ?? 200;
        if (response?.status() !== expectedStatus) failures.push(`${label}: returned ${response?.status() ?? 'no response'}; expected ${expectedStatus}.`);
        const state = await page.evaluate(() => ({
          language: document.documentElement.lang,
          h1: document.querySelector('h1')?.textContent?.trim(),
          title: document.title,
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          skipLink: Boolean(document.querySelector('a[href="#main-content"]')),
          main: Boolean(document.querySelector('main#main-content, main')),
          canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
          robots: document.querySelector('meta[name="robots"]')?.getAttribute('content')?.toLowerCase(),
          forbiddenMedia: document.querySelectorAll('img, video, iframe, svg').length,
        }));
        if (!state.language) failures.push(`${label}: document language is missing.`);
        if (!state.h1) failures.push(`${label}: H1 is missing.`);
        if (!state.title) failures.push(`${label}: title is missing.`);
        if (!state.main) failures.push(`${label}: main landmark is missing.`);
        if (!state.skipLink) failures.push(`${label}: skip link to main content is missing.`);
        if (state.overflow > 1) failures.push(`${label}: horizontal overflow is ${state.overflow}px.`);
        if (state.canonical !== new URL(route.canonicalPath ?? route.path, 'https://iflpvp.com').href) failures.push(`${label}: canonical is ${state.canonical ?? 'missing'}.`);
        if (route.noindex && !(state.robots?.includes('noindex') && state.robots.includes('follow'))) failures.push(`${label}: evidence-held route must emit noindex,follow.`);
        if (state.forbiddenMedia !== 0) failures.push(`${label}: rendered ${state.forbiddenMedia} forbidden media element(s).`);
        if (route.name === 'search' && !(await page.locator('input[type="search"]').count())) failures.push(`${label}: search input is missing.`);
        if (outputDirectory && ['home', 'guide-hold', 'support'].includes(route.name)) {
          await mkdir(outputDirectory, { recursive: true });
          await page.screenshot({ path: path.join(outputDirectory, `${route.name}-${viewport.name}.png`), fullPage: true });
        }
        for (const error of consoleErrors) failures.push(`${label}: browser error ${error}`);
        for (const url of unexpected404s) failures.push(`${label}: unexpected 404 ${url}`);
        await page.close();
      }
    }
  } finally { await browser.close(); }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log(`Frontend QA passed at ${baseUrl}.`);
}

withPreviewServer(run, { root: projectRoot }).catch((error) => { console.error(`Frontend QA failed: ${error.message}`); process.exitCode = 1; });
