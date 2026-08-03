import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';
import { projectRoot } from './release-utils.mjs';
import { withPreviewServer } from './qa-server.mjs';

async function run(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const failures = [];
  const outputDirectory = process.env.QA_OUTPUT_DIR;
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      const consoleErrors = [];
      const unexpected404s = [];
      page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
      page.on('pageerror', (error) => consoleErrors.push(error.message));
      page.on('response', (response) => { if (response.status() === 404) unexpected404s.push(response.url()); });
      const response = await page.goto(baseUrl, { waitUntil: 'networkidle' });
      if (!response?.ok()) failures.push(`${viewport.name}: homepage returned ${response?.status() ?? 'no response'}.`);
      const state = await page.evaluate(() => ({
        language: document.documentElement.lang,
        h1: document.querySelector('h1')?.textContent?.trim(),
        title: document.title,
        overflow: document.documentElement.scrollWidth - window.innerWidth,
        skipLink: Boolean(document.querySelector('a[href="#main-content"]')),
        main: Boolean(document.querySelector('main#main-content, main')),
      }));
      if (!state.language) failures.push(`${viewport.name}: document language is missing.`);
      if (!state.h1) failures.push(`${viewport.name}: homepage H1 is missing.`);
      if (!state.title) failures.push(`${viewport.name}: homepage title is missing.`);
      if (!state.main) failures.push(`${viewport.name}: main landmark is missing.`);
      if (!state.skipLink) failures.push(`${viewport.name}: skip link to main content is missing.`);
      if (state.overflow > 1) failures.push(`${viewport.name}: horizontal overflow is ${state.overflow}px.`);
      if (outputDirectory) {
        await mkdir(outputDirectory, { recursive: true });
        await page.screenshot({ path: path.join(outputDirectory, `home-${viewport.name}.png`), fullPage: true });
      }
      for (const error of consoleErrors) failures.push(`${viewport.name}: browser error ${error}`);
      for (const url of unexpected404s) failures.push(`${viewport.name}: unexpected 404 ${url}`);
      await page.close();
    }
  } finally { await browser.close(); }
  if (failures.length) throw new Error(failures.join('\n'));
  console.log(`Frontend QA passed at ${baseUrl}.`);
}

withPreviewServer(run, { root: projectRoot }).catch((error) => { console.error(`Frontend QA failed: ${error.message}`); process.exitCode = 1; });
