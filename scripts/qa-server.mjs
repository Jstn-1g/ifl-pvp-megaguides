import { spawn } from 'node:child_process';

export async function withPreviewServer(run, { root, port = 4321 } = {}) {
  if (process.env.BASE_URL) return run(process.env.BASE_URL.replace(/\/$/, ''));
  const command = process.platform === 'win32' ? 'npx.cmd' : 'npx';
  const child = spawn(command, ['astro', 'preview', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    for (let attempt = 0; attempt < 30; attempt += 1) {
      try {
        const response = await fetch(baseUrl, { redirect: 'manual' });
        if (response.ok) return await run(baseUrl);
      } catch {
        // The server is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    throw new Error(`Astro preview did not become ready. ${output.slice(-2000)}`);
  } finally {
    child.kill();
  }
}
