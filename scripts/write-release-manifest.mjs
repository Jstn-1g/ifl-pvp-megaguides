import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { projectRoot, relativePosix, sha256File, walkFiles } from './release-utils.mjs';

function option(name) {
  return process.argv.find((argument) => argument.startsWith(`${name}=`))?.slice(name.length + 1);
}

export async function writeReleaseManifest({ root = projectRoot, tag = option('--tag') ?? process.env.GITHUB_REF_NAME, commit = option('--commit') ?? process.env.GITHUB_SHA } = {}) {
  if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(String(tag ?? ''))) throw new Error('A SemVer release tag is required.');
  if (!/^[a-f0-9]{40}$/i.test(String(commit ?? ''))) throw new Error('A full 40-character commit SHA is required.');
  const dist = path.join(root, 'dist');
  const files = [];
  for (const file of await walkFiles(dist)) {
    const relative = relativePosix(dist, file);
    if (relative === 'release-manifest.json') continue;
    files.push({ path: relative, sha256: await sha256File(file) });
  }
  const digest = createHash('sha256').update(files.map((file) => `${file.path}\0${file.sha256}\n`).join('')).digest('hex');
  const manifest = {
    schemaVersion: 2,
    tag,
    commit: commit.toLowerCase(),
    fileCount: files.length,
    files,
    manifestSha256: digest,
  };
  await mkdir(dist, { recursive: true });
  await writeFile(path.join(dist, 'release-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  console.log(`Release manifest written: ${manifest.fileCount} files; ${manifest.manifestSha256}.`);
  return manifest;
}

if (process.argv[1]?.replaceAll('\\', '/').endsWith('/write-release-manifest.mjs')) {
  writeReleaseManifest().catch((error) => { console.error(`Release manifest failed: ${error.message}`); process.exitCode = 1; });
}
