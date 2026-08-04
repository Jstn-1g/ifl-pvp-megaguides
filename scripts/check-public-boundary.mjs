import { execFile as execFileCallback } from 'node:child_process';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { invokedAsMain, projectRoot, readJson } from './release-utils.mjs';

const execFile = promisify(execFileCallback);
const mediaExtensions = new Set(['.avif', '.gif', '.ico', '.jpeg', '.jpg', '.mp3', '.mp4', '.ogg', '.otf', '.pdf', '.png', '.svg', '.ttf', '.wav', '.webm', '.webp', '.woff', '.woff2']);
const prohibitedPrefixes = [
  'Art/', 'automation/', 'fonts-backup/', 'images-backup/', 'reports/',
  'docs/screenshots/', 'public/images/', 'public/videos/', 'public/fonts/',
];
const prohibitedExact = new Set(['.env', '.env.local', '.env.deploy.local']);
const textExtensions = new Set(['.astro', '.css', '.html', '.js', '.json', '.mjs', '.ts', '.tsx', '.yaml', '.yml']);
const suspiciousSecret = /(?:api[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|password|private[_-]?key|secret)\s*[:=]\s*["']?(?!changeme|example|placeholder|your[_-]?[a-z0-9_-]*)(?:[A-Za-z0-9_\-]{20,})/i;

function normalizeRepoPath(value) {
  if (typeof value !== 'string' || !value.trim()) throw new Error('Repository path must be a non-empty string.');
  const normalized = value.replaceAll('\\', '/').replace(/^\.\//, '');
  if (normalized.startsWith('/') || /^[A-Za-z]:/.test(normalized) || normalized.split('/').some((part) => !part || part === '.' || part === '..')) {
    throw new Error(`Unsafe repository path: ${value}`);
  }
  return normalized;
}

async function trackedPaths(root) {
  const { stdout } = await execFile('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root, encoding: 'buffer' });
  return stdout.toString('utf8').split('\0').filter(Boolean).map(normalizeRepoPath).sort();
}

function validateAllowlist(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value) || value.schemaVersion !== 1) {
    throw new Error('governance/public-asset-allowlist.json must be a schemaVersion 1 object.');
  }
  if (!Array.isArray(value.assets)) throw new Error('Public asset allowlist requires an assets array.');
  const result = new Map();
  for (const [index, asset] of value.assets.entries()) {
    if (!asset || typeof asset !== 'object' || Array.isArray(asset)) throw new Error(`assets[${index}] must be an object.`);
    const assetPath = normalizeRepoPath(asset.path);
    if (!mediaExtensions.has(path.posix.extname(assetPath).toLowerCase())) throw new Error(`assets[${index}] is not a media asset: ${assetPath}`);
    if (!/^[a-f0-9]{64}$/i.test(String(asset.sha256 ?? ''))) throw new Error(`assets[${index}].sha256 must be a SHA-256 digest.`);
    if (typeof asset.rightsBasis !== 'string' || !asset.rightsBasis.trim()) throw new Error(`assets[${index}].rightsBasis is required.`);
    if (!['social-card', 'brand-icon', 'game-media', 'other'].includes(asset.role)) throw new Error(`assets[${index}].role must be social-card, brand-icon, game-media, or other.`);
    const isGameMediaPath = assetPath.startsWith('public/game-media/');
    if (isGameMediaPath && asset.role !== 'game-media') throw new Error(`assets[${index}] under public/game-media/ must use role game-media: ${assetPath}`);
    if (asset.role === 'game-media') {
      if (!isGameMediaPath) throw new Error(`assets[${index}] game-media must live under public/game-media/: ${assetPath}`);
      if (typeof asset.gameKey !== 'string' || !asset.gameKey.trim()) throw new Error(`assets[${index}].gameKey is required for game-media.`);
      if (typeof asset.sourceUrl !== 'string' || !/^https:\/\//.test(asset.sourceUrl)) throw new Error(`assets[${index}].sourceUrl must be an HTTPS primary-source URL for game-media.`);
      for (const field of ['displayGrant', 'repositoryRedistributionGrant', 'attribution', 'license']) {
        if (typeof asset[field] !== 'string' || !asset[field].trim()) throw new Error(`assets[${index}].${field} is required for game-media.`);
      }
      if (asset.redistributable !== true) throw new Error(`assets[${index}].redistributable must be true before game-media can enter the public repository.`);
    }
    if (result.has(assetPath)) throw new Error(`Duplicate public asset allowlist entry: ${assetPath}`);
    result.set(assetPath, { ...asset, path: assetPath });
  }
  return result;
}

export async function auditPublicBoundary({ root = projectRoot, paths, allowlistPath = path.join(root, 'governance', 'public-asset-allowlist.json') } = {}) {
  const repoPaths = paths ?? await trackedPaths(root);
  const allowlist = validateAllowlist(await readJson(allowlistPath));
  const failures = [];
  const seenMedia = new Set();

  for (const rawPath of repoPaths) {
    const repoPath = normalizeRepoPath(rawPath);
    const lower = repoPath.toLowerCase();
    if (prohibitedExact.has(lower) || lower.startsWith('.env.') || lower.includes('/.env.')) failures.push(`${repoPath}: environment files are never public.`);
    if (repoPath.startsWith('.git/') || repoPath.startsWith('node_modules/') || repoPath.startsWith('dist/') || repoPath.startsWith('.astro/')) failures.push(`${repoPath}: generated or repository-internal path is forbidden.`);
    const prohibitedPrefix = prohibitedPrefixes.find((prefix) => repoPath.startsWith(prefix));
    const reviewedPublicScreenshot = prohibitedPrefix === 'docs/screenshots/' && allowlist.has(repoPath);
    if (prohibitedPrefix && !reviewedPublicScreenshot) failures.push(`${repoPath}: private/media-vault path is forbidden.`);
    if (lower.endsWith('.pyc') || lower.endsWith('.pyo')) failures.push(`${repoPath}: compiled Python artifacts are forbidden.`);

    const extension = path.posix.extname(repoPath).toLowerCase();
    if (mediaExtensions.has(extension)) {
      seenMedia.add(repoPath);
      const approved = allowlist.get(repoPath);
      if (!approved) {
        failures.push(`${repoPath}: media is not on the exact public asset allowlist.`);
      } else {
        const digest = createHash('sha256').update(await readFile(path.join(root, ...repoPath.split('/')))).digest('hex');
        if (digest !== approved.sha256) failures.push(`${repoPath}: media digest does not match the reviewed allowlist record.`);
      }
    }

    if (textExtensions.has(extension)) {
      const source = await readFile(path.join(root, ...repoPath.split('/')), 'utf8');
      if (suspiciousSecret.test(source)) failures.push(`${repoPath}: possible credential assignment; remove it or use a documented non-secret placeholder.`);
    }
  }

  for (const approvedPath of allowlist.keys()) {
    if (!seenMedia.has(approvedPath)) failures.push(`${approvedPath}: allowlist entry does not correspond to a tracked media file.`);
  }

  return { ok: failures.length === 0, failures, trackedCount: repoPaths.length, mediaCount: seenMedia.size };
}

async function main() {
  const result = await auditPublicBoundary();
  if (!result.ok) {
    console.error(`Public boundary check failed with ${result.failures.length} issue(s):`);
    result.failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log(`Public boundary check passed: ${result.trackedCount} tracked files; ${result.mediaCount} reviewed media files.`);
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`Public boundary check failed: ${error.message}`); process.exitCode = 1; });
