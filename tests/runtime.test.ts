import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import type { AddressInfo } from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { test } from 'vitest';
import { buildApp } from '../src/app.js';
import { listen } from '../src/runtime.js';

function restoreEnv(name: string, original: string | undefined): void {
  if (original === undefined) delete process.env[name];
  else process.env[name] = original;
}

test('closing a listening app unregisters its process signal handlers', async () => {
  const oldPort = process.env.PORT;
  const oldHost = process.env.HOST;
  const initialTerm = process.listenerCount('SIGTERM');
  const initialInt = process.listenerCount('SIGINT');
  const app = buildApp();
  try {
    process.env.PORT = '0';
    process.env.HOST = '127.0.0.1';
    const address = await listen(app);
    const response = await fetch(`${address}/health`);
    assert.equal(response.status, 200);
    assert.equal(process.listenerCount('SIGTERM'), initialTerm + 1);
    assert.equal(process.listenerCount('SIGINT'), initialInt + 1);
    await app.close();
    assert.equal(process.listenerCount('SIGTERM'), initialTerm);
    assert.equal(process.listenerCount('SIGINT'), initialInt);
  } finally {
    await app.close();
    restoreEnv('PORT', oldPort);
    restoreEnv('HOST', oldHost);
  }
});

test('invalid server configuration triggers plugin teardown and adds no signal handlers', async () => {
  const oldPort = process.env.PORT;
  const term = process.listenerCount('SIGTERM');
  const interrupt = process.listenerCount('SIGINT');
  const app = buildApp();
  let cleaned = 0;
  app.addHook('onClose', async () => {
    cleaned += 1;
  });
  try {
    process.env.PORT = 'invalid';
    await assert.rejects(listen(app), /PORT/);
    assert.equal(cleaned, 1, 'a preflight failure must close the app');
    assert.equal(process.listenerCount('SIGTERM'), term);
    assert.equal(process.listenerCount('SIGINT'), interrupt);
  } finally {
    await app.close();
    restoreEnv('PORT', oldPort);
  }
});

test('occupied TCP port fails cleanly without leaking shutdown listeners', async () => {
  const { createServer } = await import('node:net');
  const blocker = createServer();
  await new Promise<void>((resolve) => blocker.listen(0, '127.0.0.1', resolve));
  const occupiedPort = (blocker.address() as AddressInfo).port;
  const originalPort = process.env.PORT;
  const originalHost = process.env.HOST;
  const termCount = process.listenerCount('SIGTERM');
  const intCount = process.listenerCount('SIGINT');
  const app = buildApp();
  let closed = 0;
  app.addHook('onClose', async () => {
    closed += 1;
  });
  try {
    process.env.PORT = String(occupiedPort);
    process.env.HOST = '127.0.0.1';
    await assert.rejects(
      listen(app),
      (error) => (error as NodeJS.ErrnoException | undefined)?.code === 'EADDRINUSE',
    );
    assert.equal(closed, 1);
    assert.equal(process.listenerCount('SIGTERM'), termCount);
    assert.equal(process.listenerCount('SIGINT'), intCount);
  } finally {
    await app.close();
    await new Promise((resolve) => blocker.close(resolve));
    restoreEnv('PORT', originalPort);
    restoreEnv('HOST', originalHost);
  }
});

test('a hung close is force-exited with code 1 after the shutdown timeout', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'kit-shutdown-'));
  try {
    const appUrl = new URL('../dist/app.js', import.meta.url).href;
    const runtimeUrl = new URL('../dist/runtime.js', import.meta.url).href;
    // Plain Node runs this child, so it imports compiled dist/ modules, not src/.
    const script = path.join(dir, 'hung-close.mjs');
    fs.writeFileSync(
      script,
      `import { buildApp } from '${appUrl}';
import { listen } from '${runtimeUrl}';
const app = buildApp();
// An open handle plus a never-settling hook simulates a hung plugin teardown.
app.addHook('onClose', () => new Promise(() => { setInterval(() => {}, 1000); }));
await listen(app, { shutdownTimeoutMs: 300 });
`,
    );
    const child = spawn(process.execPath, [script], {
      env: { ...process.env, PORT: '0', HOST: '127.0.0.1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const ready = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`server timeout: ${output}`)), 7000);
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        if (output.includes('Server listening at')) {
          clearTimeout(timer);
          resolve();
        }
      });
      child.stderr.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error(`early exit: ${code}${output}`));
      });
    });
    try {
      await ready;
      const exit = new Promise((resolve) => child.once('exit', resolve));
      child.kill('SIGTERM');
      let forceTimer: NodeJS.Timeout | undefined;
      const code = await Promise.race([
        exit,
        new Promise((_, reject) => {
          forceTimer = setTimeout(() => reject(new Error('force exit timeout')), 5000);
        }),
      ]);
      clearTimeout(forceTimer);
      assert.equal(code, 1);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
