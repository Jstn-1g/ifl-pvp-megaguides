import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { invokedAsMain, projectRoot } from './release-utils.mjs';

function indentation(line) {
  return line.match(/^\s*/)?.[0].length ?? 0;
}

function expressionInRunBlock(lines, start) {
  const line = lines[start];
  const match = line.match(/^(\s*)-?\s*run:\s*(.*)$/);
  if (!match) return false;
  const value = match[2];
  if (value !== '|' && value !== '>' && value !== '|-' && value !== '>-') return value.includes('${{');
  const baseIndent = match[1].length;
  for (let index = start + 1; index < lines.length; index += 1) {
    if (!lines[index].trim()) continue;
    if (indentation(lines[index]) <= baseIndent) break;
    if (lines[index].includes('${{')) return true;
  }
  return false;
}

export async function checkWorkflows({ root = projectRoot } = {}) {
  const directory = path.join(root, '.github', 'workflows');
  const names = (await readdir(directory)).filter((name) => /\.ya?ml$/i.test(name)).sort();
  const failures = [];
  for (const name of names) {
    const source = await readFile(path.join(directory, name), 'utf8');
    const lines = source.split(/\r?\n/);
    if (!/^permissions:\s*$/m.test(source)) failures.push(`${name}: top-level permissions must be declared.`);
    if (/^\s*pull_request_target\s*:/m.test(source)) failures.push(`${name}: pull_request_target is forbidden for the public repository.`);
    if (/^\s*secrets:\s*inherit\s*$/m.test(source)) failures.push(`${name}: inherited workflow secrets are forbidden.`);
    if (/^\s*persist-credentials:\s*true\s*$/m.test(source)) failures.push(`${name}: checkout credentials must not persist.`);
    for (const [index, line] of lines.entries()) {
      const uses = line.match(/^\s*-?\s*uses:\s*([^\s#]+)/);
      if (uses && !uses[1].startsWith('./') && !/@[a-f0-9]{40}$/i.test(uses[1])) {
        failures.push(`${name}:${index + 1}: action must be pinned to a full commit SHA.`);
      }
      if (expressionInRunBlock(lines, index)) failures.push(`${name}:${index + 1}: GitHub expressions must enter shell steps through a quoted environment variable.`);
    }
  }
  return { ok: failures.length === 0, failures, workflowCount: names.length };
}

async function main() {
  const result = await checkWorkflows();
  if (!result.ok) {
    console.error('Workflow security check failed:');
    result.failures.forEach((failure) => console.error(`  - ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log(`Workflow security check passed: ${result.workflowCount} pinned workflows.`);
}

if (invokedAsMain(import.meta.url)) main().catch((error) => { console.error(`Workflow security check failed: ${error.message}`); process.exitCode = 1; });
