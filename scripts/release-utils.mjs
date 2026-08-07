import { createHash } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

export const projectRoot = fileURLToPath(new URL('..', import.meta.url));

export async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

export async function sha256File(path) {
  return createHash('sha256').update(await readFile(path)).digest('hex');
}

export async function walkFiles(root) {
  const files = [];
  async function visit(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) await visit(path);
      else if (entry.isFile()) files.push(path);
    }
  }
  await visit(root);
  return files.sort((left, right) => {
    const leftPath = relativePosix(root, left);
    const rightPath = relativePosix(root, right);
    if (leftPath < rightPath) return -1;
    if (leftPath > rightPath) return 1;
    return 0;
  });
}

export function relativePosix(root, path) {
  return relative(root, path).replaceAll('\\', '/');
}

export function invokedAsMain(moduleUrl) {
  return Boolean(process.argv[1]) && pathToFileURL(process.argv[1]).href === moduleUrl;
}

