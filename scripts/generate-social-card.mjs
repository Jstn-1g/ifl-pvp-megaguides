import { createHash } from 'node:crypto';
import { mkdir, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';
import { projectRoot } from './release-utils.mjs';

const width = 1200;
const height = 630;

function cardMarkup(logoDataUrl, worldsDataUrl) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; img-src data:; style-src 'unsafe-inline'"><style>
    *{box-sizing:border-box}html,body{margin:0;width:${width}px;height:${height}px;overflow:hidden;background:#0b1830;color:#fff}
    body{font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
    main{position:relative;width:100%;height:100%;overflow:hidden;border:2px solid #ffb24a;background:#70b9eb}
    .worlds{position:absolute;z-index:0;inset:0;width:100%;height:100%;object-fit:cover;object-position:center;filter:saturate(1.08) contrast(1.02) brightness(1.03)}
    .veil{position:absolute;z-index:1;inset:0;background:linear-gradient(90deg,rgba(5,13,28,.97) 0%,rgba(5,13,28,.91) 37%,rgba(5,13,28,.47) 58%,rgba(5,13,28,.03) 82%),linear-gradient(180deg,rgba(5,13,28,.04) 48%,rgba(5,13,28,.64) 100%)}
    main:before{content:"";position:absolute;z-index:2;inset:24px;border:1px solid rgba(255,255,255,.34);pointer-events:none}
    main:after{content:"";position:absolute;z-index:2;inset:0;background-image:linear-gradient(rgba(255,255,255,.08) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.08) 1px,transparent 1px);background-size:54px 54px;mask-image:linear-gradient(105deg,rgba(0,0,0,.78),transparent 57%);pointer-events:none}
    .copy{position:absolute;z-index:3;top:65px;left:78px;width:680px}.eyebrow{display:flex;align-items:center;gap:13px;color:#ffe0a6;font-size:18px;font-weight:800;letter-spacing:.16em;text-transform:uppercase}.eyebrow:before{content:"";width:46px;height:3px;background:linear-gradient(90deg,#69c9ff,#ffaf3d,#dc75ff)}
    .title{max-width:675px;margin:50px 0 0;font-size:83px;font-weight:900;letter-spacing:-.065em;line-height:.85;text-shadow:0 10px 36px rgba(0,0,0,.34)}.title span{display:block;background:linear-gradient(90deg,#75d6ff,#ffca6c 65%,#f49aff);color:transparent;background-clip:text}.deck{max-width:610px;margin:31px 0 0;color:#e8f1fa;font-size:25px;line-height:1.32;text-shadow:0 3px 18px rgba(0,0,0,.42)}
    .signals{display:flex;gap:8px;margin-top:32px}.signals span{display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid rgba(255,255,255,.24);background:rgba(7,18,36,.55);color:#fff;font-size:12px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;backdrop-filter:blur(9px)}.signals span:before{content:"";width:7px;height:7px;border-radius:50%;background:#72d7ff}.signals span:nth-child(2):before{background:#ffb052}
    .visual{position:absolute;z-index:3;top:58px;right:65px;width:270px;height:270px;display:grid;place-items:center}.visual:before{content:"";position:absolute;inset:14px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.86),rgba(101,197,255,.52) 39%,rgba(255,177,69,.30) 59%,transparent 73%);filter:blur(20px)}.visual img{position:relative;width:235px;height:235px;object-fit:contain;filter:drop-shadow(0 25px 26px rgba(0,0,0,.42))}
    .rail{position:absolute;z-index:3;right:67px;bottom:90px;color:#fff;font-size:13px;font-weight:800;letter-spacing:.13em;text-align:right;text-shadow:0 2px 11px rgba(0,0,0,.56);text-transform:uppercase}.rail strong{display:block;margin-top:7px;color:#fff0b6;font-size:19px}
    .footer{position:absolute;z-index:3;right:78px;bottom:38px;left:78px;display:flex;align-items:center;justify-content:space-between;padding-top:14px;border-top:1px solid rgba(255,211,128,.78);color:#fff;font-size:15px;font-weight:800;letter-spacing:.09em;text-shadow:0 2px 9px rgba(0,0,0,.58);text-transform:uppercase}.footer span:last-child{color:#fff0b6}
  </style></head><body><main><img class="worlds" src="${worldsDataUrl}" alt=""><div class="veil"></div><section class="copy"><div class="eyebrow">Independent competitive reference</div><h1 class="title">IFL PvP<span>MegaGuides</span></h1><p class="deck">Source-backed, version-pinned field manuals for competitive games.</p><div class="signals"><span>Original IFL concept art</span><span>Not game footage</span></div></section><section class="visual"><img src="${logoDataUrl}" alt=""></section><div class="rail">One library. One evidence standard.<strong>Built to stay useful.</strong></div><footer class="footer"><span>Open-source field manuals</span><span>iflpvp.com</span></footer></main></body></html>`;
}

async function render(outputPath, root = projectRoot) {
  const logoPath = path.join(root, 'public', 'brand', 'ifl-pvp-logo.webp');
  const worldsPath = path.join(root, 'public', 'brand', 'ifl-pvp-genre-worlds-v1.webp');
  const logoDataUrl = `data:image/webp;base64,${(await readFile(logoPath)).toString('base64')}`;
  const worldsDataUrl = `data:image/webp;base64,${(await readFile(worldsPath)).toString('base64')}`;
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    await page.setContent(cardMarkup(logoDataUrl, worldsDataUrl), { waitUntil: 'load' });
    await page.screenshot({ path: outputPath, type: 'png' });
  } finally { await browser.close(); }
}

export async function generateSocialCard({ root = projectRoot, outputPath = path.join(root, 'public', 'og.png') } = {}) {
  await mkdir(path.dirname(outputPath), { recursive: true });
  await render(outputPath, root);
  const digest = createHash('sha256').update(await readFile(outputPath)).digest('hex');
  console.log(`Generated first-party brand social card: ${outputPath} (${digest}).`);
  return { outputPath, digest, width, height };
}

export async function verifySocialCard({ root = projectRoot } = {}) {
  const expectedPath = path.join(root, 'public', 'og.png');
  const temporaryPath = path.join(os.tmpdir(), `ifl-public-og-${process.pid}.png`);
  try {
    await render(temporaryPath, root);
    const [expected, actual] = await Promise.all([readFile(expectedPath), readFile(temporaryPath)]);
    if (!expected.equals(actual)) throw new Error('rendered bytes differ');
  } finally { await rm(temporaryPath, { force: true }); }
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/generate-social-card.mjs')) {
  const verify = process.argv.includes('--verify');
  const action = verify ? verifySocialCard() : generateSocialCard();
  action.then(() => { if (verify) console.log('Deterministic social-card verification passed.'); }).catch((error) => { console.error(`Social-card generation failed: ${error.message}`); process.exitCode = 1; });
}
