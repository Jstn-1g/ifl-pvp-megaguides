import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { projectRoot } from './release-utils.mjs';
import { withPreviewServer } from './qa-server.mjs';

async function run(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const outputDirectory = process.env.QA_OUTPUT_DIR;
  const reducedMotion = process.env.QA_REDUCED_MOTION === '1' ? 'reduce' : 'no-preference';
  const routes = [
    { name: 'home', path: '/', expectedGameKeys: ['battlerite', 'gigantic', 'gunz'] },
    { name: 'guides', path: '/guides/', expectedGameKeys: ['battlerite', 'bloodline-champions', 'gigantic', 'gunz', 'marvel-rivals'] },
    { name: 'guide-hold', path: '/battlerite-complete-guide-every-champion/', noindex: true },
    { name: 'evidence-hold', path: '/bloodline-champions-complete-guide-every-bloodline/', noindex: true },
    { name: 'search', path: '/search/' },
    { name: 'support', path: '/support/' },
    { name: 'archive', path: '/archive/' },
    { name: 'not-found', path: '/definitely-not-a-public-route/', canonicalPath: '/404/', expectedStatus: 404, noindex: true },
  ];
  try {
    for (const viewport of [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'narrow', width: 320, height: 800 },
      { name: 'narrow-scrollbar', width: 284, height: 800 },
    ]) {
      for (const route of routes) {
        console.log(`Checking ${viewport.name}/${route.name}...`);
        const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height }, reducedMotion });
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
        await page.waitForFunction(() => [...document.querySelectorAll('img[data-public-art-asset]')]
          .every((image) => image instanceof HTMLImageElement && image.complete && image.naturalWidth > 0));
        const label = `${viewport.name}/${route.name}`;
        const expectedStatus = route.expectedStatus ?? 200;
        if (response?.status() !== expectedStatus) failures.push(`${label}: returned ${response?.status() ?? 'no response'}; expected ${expectedStatus}.`);
        const state = await page.evaluate(() => {
          const isVisiblyClipped = (element) => {
            for (let ancestor = element.parentElement; ancestor && ancestor !== document.body; ancestor = ancestor.parentElement) {
              if (['auto', 'clip', 'hidden', 'scroll'].includes(getComputedStyle(ancestor).overflowX)) return true;
            }
            return false;
          };
          const overflowSources = [...document.querySelectorAll('body *')]
            .map((element) => ({ element, rect: element.getBoundingClientRect() }))
            .filter(({ element, rect }) => !isVisiblyClipped(element) && (rect.left < -1 || rect.right > window.innerWidth + 1))
            .sort((left, right) => Math.max(right.rect.right - window.innerWidth, -right.rect.left) - Math.max(left.rect.right - window.innerWidth, -left.rect.left))
            .slice(0, 4)
            .map(({ element, rect }) => {
              const identity = `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ''}${[...element.classList].slice(0, 2).map((name) => `.${name}`).join('')}`;
              return `${identity} [${Math.round(rect.left)}..${Math.round(rect.right)}]`;
            });
          return {
            language: document.documentElement.lang,
            h1: document.querySelector('h1')?.textContent?.trim(),
            title: document.title,
            overflow: document.documentElement.scrollWidth - window.innerWidth,
            overflowSources,
            skipLink: Boolean(document.querySelector('a[href="#main-content"]')),
            main: Boolean(document.querySelector('main#main-content, main')),
            canonical: document.querySelector('link[rel="canonical"]')?.getAttribute('href'),
            robots: document.querySelector('meta[name="robots"]')?.getAttribute('content')?.toLowerCase(),
            forbiddenMedia: [...document.querySelectorAll('img, video, iframe, svg')].filter((element) => {
              if (!(element instanceof HTMLImageElement)) return true;
              const isApprovedLogo = element.dataset.publicBrandAsset === 'ifl-pvp-logo'
                && new URL(element.src, window.location.href).pathname === '/brand/ifl-pvp-logo.webp';
              const isApprovedGenreWorlds = element.dataset.publicArtAsset === 'ifl-pvp-genre-worlds'
                && new URL(element.src, window.location.href).pathname === '/brand/ifl-pvp-genre-worlds-v1.webp';
              const isApprovedArenaSilhouettes = element.dataset.publicArtAsset === 'ifl-pvp-arena-silhouettes'
                && new URL(element.src, window.location.href).pathname === '/brand/ifl-pvp-arena-silhouettes-v1.webp';
              return !(isApprovedLogo || isApprovedGenreWorlds || isApprovedArenaSilhouettes);
            }).length,
            approvedBrandMarks: document.querySelectorAll('img[data-public-brand-asset="ifl-pvp-logo"]').length,
            approvedArenaArt: document.querySelectorAll('img[data-public-art-asset="ifl-pvp-arena-silhouettes"]').length,
            gameVisuals: [...document.querySelectorAll('.reference-cover[data-game]')].map((element) => {
              const style = getComputedStyle(element);
              return {
                key: element.getAttribute('data-game'),
                accent: style.getPropertyValue('--cover-accent').trim(),
                secondary: style.getPropertyValue('--cover-secondary').trim(),
              };
            }).sort((left, right) => String(left.key).localeCompare(String(right.key))),
          };
        });
        if (!state.language) failures.push(`${label}: document language is missing.`);
        if (!state.h1) failures.push(`${label}: H1 is missing.`);
        if (!state.title) failures.push(`${label}: title is missing.`);
        if (!state.main) failures.push(`${label}: main landmark is missing.`);
        if (!state.skipLink) failures.push(`${label}: skip link to main content is missing.`);
        if (state.overflow > 1) {
          const sources = state.overflowSources.length ? ` Likely sources: ${state.overflowSources.join(', ')}.` : '';
          failures.push(`${label}: horizontal overflow is ${state.overflow}px.${sources}`);
        }
        if (state.canonical !== new URL(route.canonicalPath ?? route.path, 'https://iflpvp.com').href) failures.push(`${label}: canonical is ${state.canonical ?? 'missing'}.`);
        if (route.noindex && !(state.robots?.includes('noindex') && state.robots.includes('follow'))) failures.push(`${label}: evidence-held route must emit noindex,follow.`);
        if (state.forbiddenMedia !== 0) failures.push(`${label}: rendered ${state.forbiddenMedia} forbidden media element(s).`);
        if (state.approvedBrandMarks < 1) failures.push(`${label}: approved IFL PvP brand mark is missing.`);
        if (route.name === 'home' && state.approvedArenaArt < 1) failures.push(`${label}: approved first-party fantasy arena artwork is missing.`);
        if (route.expectedGameKeys) {
          const actualGameKeys = state.gameVisuals.map((visual) => visual.key);
          const expectedGameKeys = [...route.expectedGameKeys].sort();
          if (JSON.stringify(actualGameKeys) !== JSON.stringify(expectedGameKeys)) {
            failures.push(`${label}: game identities are ${JSON.stringify(actualGameKeys)}; expected ${JSON.stringify(expectedGameKeys)}.`);
          }
          const visualSignatures = new Set(state.gameVisuals.map((visual) => `${visual.accent}|${visual.secondary}`));
          if (state.gameVisuals.some((visual) => !visual.accent || !visual.secondary) || visualSignatures.size !== expectedGameKeys.length) {
            failures.push(`${label}: game cards do not expose ${expectedGameKeys.length} distinct computed visual identities.`);
          }
        }
        if (route.name === 'search' && !(await page.locator('input[type="search"]').count())) failures.push(`${label}: search input is missing.`);
        if (outputDirectory && ['home', 'guide-hold', 'evidence-hold', 'support'].includes(route.name)) {
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
