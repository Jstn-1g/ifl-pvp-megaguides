import { createHash } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { projectRoot } from './release-utils.mjs';

const width = 1200;
const height = 630;

function cardMarkup() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>
    *{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:#0a0d12;color:#f5f0e7}
    body{font-family:Arial,Helvetica,sans-serif;background:radial-gradient(circle at 78% 14%,rgba(244,169,58,.22),transparent 27%),linear-gradient(135deg,#090c12,#101827 60%,#0b1018)}
    main{position:relative;width:100%;height:100%;padding:74px 86px;display:flex;flex-direction:column;justify-content:space-between;border:2px solid #d99b35}
    main:before,main:after{content:"";position:absolute;inset:25px;border:1px solid rgba(245,240,231,.2);pointer-events:none}main:after{inset:auto 86px 54px;height:1px;background:#d99b35;border:0}
    .eyebrow{color:#f0af42;font-size:20px;font-weight:700;letter-spacing:.18em;text-transform:uppercase}.title{max-width:880px;font-family:Georgia,'Times New Roman',serif;font-size:82px;line-height:.94;letter-spacing:-.055em;margin:0}.title span{color:#f0af42}.deck{max-width:760px;font-size:27px;line-height:1.28;color:#d6dbe4;margin:0}.footer{display:flex;align-items:center;justify-content:space-between;font-size:18px;letter-spacing:.09em;text-transform:uppercase}.mark{display:flex;align-items:center;gap:14px;font-weight:700}.mark i{display:inline-block;width:28px;height:28px;transform:skewY(-28deg) rotate(45deg);background:#f0af42;border:3px solid #f5f0e7}.grid{position:absolute;right:78px;bottom:70px;width:242px;height:155px;opacity:.48;background:linear-gradient(90deg,rgba(240,175,66,.45) 1px,transparent 1px),linear-gradient(rgba(240,175,66,.45) 1px,transparent 1px);background-size:24px 24px;transform:perspective(300px) rotateX(56deg)}
  </style></head><body><main><div class="eyebrow">Independent competitive-game reference</div><h1 class="title">IFL PvP<br><span>MegaGuides</span></h1><p class="deck">Source-backed, version-pinned field manuals for competitive games.</p><div class="footer"><div class="mark"><i></i> IFL PvP MegaGuides</div><div>iflpvp.com</div></div><div class="grid"></div></main></body></html>`;
}

async function render(outputPath) {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(cardMarkup(), { waitUntil: 'load' });
    await page.screenshot({ path: outputPath, type: 'png' });
  } finally { await browser.close(); }
}

export async function generateSocialCard({ root = projectRoot, outputPath = path.join(root, 'public', 'og.png') } = {}) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await render(outputPath);
  const digest = createHash('sha256').update(await readFile(outputPath)).digest('hex');
  console.log(`Generated CSS-only social card: ${outputPath} (${digest}).`);
  return { outputPath, digest, width, height };
}

export async function verifySocialCard({ root = projectRoot } = {}) {
  const expectedPath = path.join(root, 'public', 'og.png');
  const temporaryPath = path.join(os.tmpdir(), `ifl-public-og-${process.pid}.png`);
  try {
    await render(temporaryPath);
    const [expected, actual] = await Promise.all([readFile(expectedPath), readFile(temporaryPath)]);
    if (!expected.equals(actual)) throw new Error('rendered bytes differ');
  } finally { await rm(temporaryPath, { force: true }); }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/generate-social-card.mjs')) {
  const verify = process.argv.includes('--verify');
  const action = verify ? verifySocialCard() : generateSocialCard();
  action.then(() => { if (verify) console.log('Deterministic social-card verification passed.'); }).catch((error) => { console.error(`Social-card generation failed: ${error.message}`); process.exitCode = 1; });
}
