import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';

const root = path.resolve(import.meta.dirname, '..');
const guideDirectory = path.join(root, 'src', 'data', 'guides');

const expectedGuides = {
  'battlerite-complete-guide-every-champion.md': {
    sha256: 'c7bac8c65dc95d84cb71b097a926560c39dd6be035e4ae83397e9cbf4ce079b2',
    minimumWords: 9000,
    minimumTableLines: 300,
    dataRows: 267,
  },
  'bloodline-champions-complete-guide-every-bloodline.md': {
    sha256: 'c2e8c9fa6452afb8cdb370a25fe0ed77b1cd2b24dae3e716d36d0d267b302c60',
    minimumWords: 10000,
    minimumTableLines: 300,
    dataRows: 273,
  },
  'gigantic-complete-guide-every-hero.md': {
    sha256: 'db7ce5cdcd177a53bf7d0116a8c833936040fc0bbdac3ee7b7a8a72251e9a62d',
    minimumWords: 11000,
    minimumTableLines: 150,
    dataRows: 116,
  },
  'gunz-the-duel-complete-guide-k-style.md': {
    sha256: '70773fb2be836e76d227b105c5cb603759379c2921abbb933812d9ba66b42feb',
    minimumWords: 4500,
    minimumTableLines: 110,
    dataRows: 94,
  },
  'marvel-rivals-complete-hero-guide-tier-list.md': {
    sha256: 'e44a6b7833828c4648c0cb2d9307e0d4f2f60aaabf81bb1ec9a8e4097f69d60d',
    minimumWords: 5400,
    minimumTableLines: 190,
    dataRows: 173,
  },
};

test('the public guide collection contains the five complete restored editions', async () => {
  const files = (await readdir(guideDirectory)).filter((file) => file.endsWith('.md')).sort();
  assert.deepEqual(files, Object.keys(expectedGuides).sort());
});

for (const [file, expectations] of Object.entries(expectedGuides)) {
  test(`${file} is substantive, immutable, and public-boundary safe`, async () => {
    const markdown = await readFile(path.join(guideDirectory, file), 'utf8');
    const digest = createHash('sha256').update(markdown).digest('hex');
    const words = markdown.trim().split(/\s+/u).length;
    const lines = markdown.split(/\r?\n/u);
    const tableLines = lines.filter((line) => line.trimStart().startsWith('|')).length;
    const tableCount = lines.filter((line) => /^\s*\|(?:\s*:?-+:?\s*\|)+\s*$/u.test(line)).length;
    const dataRows = tableLines - (tableCount * 2);

    assert.equal(digest, expectations.sha256);
    assert.ok(words >= expectations.minimumWords, `expected at least ${expectations.minimumWords} words, found ${words}`);
    assert.ok(tableLines >= expectations.minimumTableLines, `expected at least ${expectations.minimumTableLines} table lines, found ${tableLines}`);
    assert.equal(dataRows, expectations.dataRows, 'data-row count must exclude each table header and separator');

    assert.doesNotMatch(markdown, /!\[[^\]]*\]\([^)]*\)/u, 'publisher or remote Markdown images must not be embedded');
    assert.doesNotMatch(markdown, /<(?:img|video|audio|iframe|script|style)\b/iu, 'embedded media or executable HTML must not be present');
    assert.doesNotMatch(markdown, /(?:file:\/{2,3}|[A-Z]:\\|\\\\)/iu, 'local filesystem paths must not be present');
    assert.doesNotMatch(markdown, /\]\(\s*\/(?!\/)/u, 'private legacy routes must not be linked');
    assert.doesNotMatch(markdown, /\]\([^)]*\.(?:avif|gif|jpe?g|png|svg|webm|webp)(?:[?#][^)]*)?\)/iu, 'media files must not be linked from restored text');
  });
}

test('guide metadata pins every restored body digest', async () => {
  const metadata = await readFile(path.join(root, 'src', 'data', 'public-content.ts'), 'utf8');
  for (const { sha256 } of Object.values(expectedGuides)) {
    assert.match(metadata, new RegExp(`bodySha256:\\s*['\"]${sha256}['\"]`, 'u'));
  }
  for (const { dataRows } of Object.values(expectedGuides)) {
    assert.match(metadata, new RegExp(`tableRows:\\s*${dataRows}\\b`, 'u'));
  }
});
