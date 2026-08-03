import { existsSync } from 'node:fs';
import path from 'node:path';
import { invokedAsMain, projectRoot, readJson } from './release-utils.mjs';

const semver = /^\d+\.\d+\.\d+(?:-[0-9A-Za-z]+(?:\.[0-9A-Za-z]+)*)?(?:\+[0-9A-Za-z.-]+)?$/;

export async function checkVersion({ root = projectRoot, environment = process.env } = {}) {
  const packagePath = path.join(root, 'package.json');
  const lockPath = path.join(root, 'package-lock.json');
  const packageJson = await readJson(packagePath);
  const failures = [];
  if (!semver.test(String(packageJson.version ?? ''))) failures.push(`package.json version is not SemVer: ${packageJson.version ?? '(missing)'}`);
  if (packageJson.private !== true) failures.push('package.json private must remain true; public Git source is not authorization to publish to npm.');
  if (!existsSync(lockPath)) {
    failures.push('package-lock.json is required so CI can use npm ci and releases are reproducible.');
  } else {
    const lock = await readJson(lockPath);
    if (lock.name !== packageJson.name || lock.packages?.['']?.version !== packageJson.version) failures.push('package.json and package-lock.json package identity/version differ.');
  }
  if (environment.GITHUB_REF_TYPE === 'tag' && environment.GITHUB_REF_NAME !== `v${packageJson.version}`) {
    failures.push(`tag must exactly equal v${packageJson.version}; received ${environment.GITHUB_REF_NAME ?? '(missing)'}.`);
  }
  return { ok: failures.length === 0, failures, version: packageJson.version };
}

async function main() {
  const result = await checkVersion();
  if (!result.ok) {
    console.error('Version check failed:'); result.failures.forEach((failure) => console.error(`  - ${failure}`)); process.exitCode = 1; return;
  }
  console.log(`Version check passed: v${result.version}`);
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`Version check failed: ${error.message}`); process.exitCode = 1; });
