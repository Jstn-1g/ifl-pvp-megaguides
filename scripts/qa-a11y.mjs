import AxeBuilder from '@axe-core/playwright';
import { chromium } from 'playwright';
import { projectRoot } from './release-utils.mjs';
import { withPreviewServer } from './qa-server.mjs';

async function run(baseUrl) {
  const browser = await chromium.launch({ headless: true });
  const routes = ['/', '/guides/', '/battlerite-complete-guide-every-champion/', '/bloodline-champions-complete-guide-every-bloodline/', '/search/', '/support/', '/archive/', '/definitely-not-a-public-route/'];
  try {
    for (const viewport of [{ name: 'desktop', width: 1440, height: 1000 }, { name: 'mobile', width: 390, height: 844 }]) {
      const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
      try {
        for (const route of routes) {
          console.log(`Auditing ${viewport.name}${route}...`);
          const page = await context.newPage();
          page.setDefaultNavigationTimeout(10_000);
          await page.goto(new URL(route, `${baseUrl}/`).href, { waitUntil: 'load' });
          const results = await new AxeBuilder({ page })
            .withTags(['wcag2a', 'wcag2aa', 'wcag21aa', 'wcag22aa'])
            .analyze();
          if (results.violations.length) {
            const detail = results.violations.map((violation) => {
              const nodes = violation.nodes.slice(0, 3).map((node) => `${node.target.join(' ')} — ${node.failureSummary ?? 'failed rule'}`).join(' | ');
              return `${viewport.name}${route}: ${violation.id} (${violation.nodes.length} node(s)): ${nodes}`;
            }).join('\n');
            throw new Error(detail);
          }
          await page.close();
        }
      } finally { await context.close(); }
    }
  } finally { await browser.close(); }
  console.log(`Accessibility QA passed at ${baseUrl}.`);
}

withPreviewServer(run, { root: projectRoot }).catch((error) => { console.error(`Accessibility QA failed: ${error.message}`); process.exitCode = 1; });
