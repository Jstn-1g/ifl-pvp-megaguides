import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { projectRoot } from './release-utils.mjs';
import { withPreviewServer } from './qa-server.mjs';

async function run(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
        .analyze();
      if (results.violations.length) {
        const detail = results.violations.map((violation) => `${viewport.name}: ${violation.id} (${violation.nodes.length} node(s))`).join('\n');
        throw new Error(detail);
      }
      await page.close();
    }
  } finally { await browser.close(); }
  console.log(`Accessibility QA passed at ${baseUrl}.`);
}

withPreviewServer(run, { root: projectRoot }).catch((error) => { console.error(`Accessibility QA failed: ${error.message}`); process.exitCode = 1; });
