import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { createServer } from 'node:net';
import path from 'node:path';
import { setTimeout as delay } from 'node:timers/promises';

async function reserveLoopbackPort() {
  const server = createServer();
  server.unref();
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const address = server.address();
  if (!address || typeof address === 'string') {
    server.close();
    throw new Error('Could not allocate a loopback port for Astro preview.');
  }
  await new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  return address.port;
}

async function stopPreview(child) {
  if (child.exitCode !== null || child.signalCode !== null) return;
  let closePromise = once(child, 'close');
  child.kill();
  let result = await Promise.race([
    closePromise.then(() => 'closed'),
    delay(5_000, 'timeout', { ref: false }),
  ]);
  if (result === 'timeout' && child.exitCode === null && child.signalCode === null) {
    closePromise = once(child, 'close');
    child.kill('SIGKILL');
    result = await Promise.race([
      closePromise.then(() => 'closed'),
      delay(2_000, 'timeout', { ref: false }),
    ]);
  }
  child.stdout?.destroy();
  child.stderr?.destroy();
  if (result === 'timeout') throw new Error('Astro preview did not stop within the cleanup deadline.');
}

export async function withPreviewServer(run, { root } = {}) {
  if (process.env.BASE_URL) return run(process.env.BASE_URL.replace(/\/$/, ''));
  const port = await reserveLoopbackPort();
  const astroCli = path.join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const child = spawn(process.execPath, [astroCli, 'preview', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: root,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let output = '';
  let childError;
  child.on('error', (error) => { childError = error; });
  child.stdout.on('data', (chunk) => { output += chunk.toString(); });
  child.stderr.on('data', (chunk) => { output += chunk.toString(); });
  const baseUrl = `http://127.0.0.1:${port}`;
  try {
    let ready = false;
    for (let attempt = 0; attempt < 30; attempt += 1) {
      if (childError) throw childError;
      if (child.exitCode !== null) throw new Error(`Astro preview exited with code ${child.exitCode}. ${output.slice(-2000)}`);
      try {
        const response = await fetch(baseUrl, { redirect: 'manual' });
        if (response.ok) {
          ready = true;
          break;
        }
      } catch {
        // The server is still starting.
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    if (!ready) throw new Error(`Astro preview did not become ready. ${output.slice(-2000)}`);
    return await run(baseUrl);
  } finally {
    await stopPreview(child);
  }
}
