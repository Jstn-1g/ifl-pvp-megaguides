import { execFile as execFileCallback } from 'node:child_process';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { projectRoot } from './release-utils.mjs';

const execFile = promisify(execFileCallback);
const tag = process.argv.find((argument) => argument.startsWith('--tag='))?.slice('--tag='.length);
const expectedCommit = process.argv.find((argument) => argument.startsWith('--commit='))?.slice('--commit='.length);

async function main() {
  if (!tag || !expectedCommit) throw new Error('Use --tag=vX.Y.Z and --commit=<full SHA>.');
  if (!/^v\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(tag) || !/^[a-f0-9]{40}$/i.test(expectedCommit)) throw new Error('Tag or commit format is invalid.');
  const { stdout } = await execFile('git', ['rev-list', '-n', '1', tag], { cwd: projectRoot, encoding: 'utf8' });
  if (stdout.trim().toLowerCase() !== expectedCommit.toLowerCase()) throw new Error(`Tag ${tag} does not resolve to requested commit.`);
  const manifest = JSON.parse(await readFile(path.join(projectRoot, 'dist', 'release-manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== 2) throw new Error('Release manifest schema is not the reproducible v2 contract.');
  if (manifest.tag !== tag || manifest.commit !== expectedCommit.toLowerCase()) throw new Error('Release manifest tag/commit does not match the requested immutable candidate.');
  console.log(`Immutable release candidate verified: ${tag} at ${expectedCommit}.`);
}

main().catch((error) => { console.error(`Release candidate verification failed: ${error.message}`); process.exitCode = 1; });
