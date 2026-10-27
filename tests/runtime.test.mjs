import test from 'node:test';
import assert from 'node:assert/strict';
import { buildApp } from '../dist/app.js';
import { listen } from '../dist/runtime.js';

function restoreEnv(name, original) {
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
    const response = await fetch(address + '/health');
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
  app.addHook('onClose', async () => { cleaned += 1; });
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
  await new Promise(resolve => blocker.listen(0, '127.0.0.1', resolve));
  const occupiedPort = blocker.address().port;
  const originalPort = process.env.PORT;
  const originalHost = process.env.HOST;
  const termCount = process.listenerCount('SIGTERM');
  const intCount = process.listenerCount('SIGINT');
  const app = buildApp();
  let closed = 0;
  app.addHook('onClose', async () => { closed += 1; });
  try {
    process.env.PORT = String(occupiedPort);
    process.env.HOST = '127.0.0.1';
    await assert.rejects(listen(app), (error) => error?.code === 'EADDRINUSE');
    assert.equal(closed, 1);
    assert.equal(process.listenerCount('SIGTERM'), termCount);
    assert.equal(process.listenerCount('SIGINT'), intCount);
  } finally {
    await app.close();
    await new Promise(resolve => blocker.close(resolve));
    restoreEnv('PORT', originalPort);
    restoreEnv('HOST', originalHost);
  }
});
