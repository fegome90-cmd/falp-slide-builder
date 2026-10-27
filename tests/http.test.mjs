import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { buildApp } from '../dist/app.js';

test('health, request ID and security headers work without external services', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  const response = await app.inject({ method: 'GET', url: '/health' });
  assert.equal(response.statusCode, 200);
  assert.deepEqual(response.json(), { ok: true });
  const uuidV4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
  assert.match(response.headers['x-request-id'], uuidV4);
  const second = await app.inject({
    method: 'GET',
    url: '/health',
    headers: { 'x-request-id': 'client-chosen' },
  });
  assert.notEqual(second.headers['x-request-id'], 'client-chosen');
  assert.notEqual(second.headers['x-request-id'], response.headers['x-request-id']);
  assert.equal(response.headers['x-content-type-options'], 'nosniff');
  assert.equal(response.headers['referrer-policy'], 'no-referrer');
  assert.equal(response.headers['access-control-allow-origin'], undefined);
});

test('404, malformed JSON 400, body-limit 413 and sanitized 500', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  app.post('/probe', async (req) => req.body);
  app.get('/explode', async () => {
    throw new Error('DO_NOT_LEAK_SECRET');
  });

  const missing = await app.inject({ method: 'GET', url: '/missing' });
  assert.equal(missing.statusCode, 404);
  assert.equal(missing.headers['content-type'], 'application/problem+json; charset=utf-8');

  const malformed = await app.inject({
    method: 'POST',
    url: '/probe',
    headers: { 'content-type': 'application/json' },
    payload: '{',
  });
  assert.equal(malformed.statusCode, 400);

  const oversized = await app.inject({
    method: 'POST',
    url: '/probe',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ value: 'x'.repeat(1024 * 1024 + 100) }),
  });
  assert.equal(oversized.statusCode, 413);

  const failed = await app.inject({ method: 'GET', url: '/explode?token=MY_SECRET' });
  assert.equal(failed.statusCode, 500);
  assert.ok(!failed.body.includes('DO_NOT_LEAK_SECRET'));
  assert.ok(!failed.body.includes('MY_SECRET'));
  assert.equal(failed.json().status, 500);
});

test('5xx logs error type and stack frames but never the message', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  const logged = [];
  app.addHook('onRequest', async (request) => {
    const original = request.log.error.bind(request.log);
    request.log.error = (obj, msg) => {
      logged.push(obj);
      original(obj, msg);
    };
  });
  app.get('/boom', async () => {
    const e = new TypeError('LEAKY_MESSAGE line1\nLEAKY_LINE2');
    e.code = 'E_TEST';
    throw e;
  });

  const response = await app.inject({ method: 'GET', url: '/boom' });
  assert.equal(response.statusCode, 500);
  const entry = logged.find((obj) => obj.statusCode === 500);
  assert.ok(entry);
  assert.equal(entry.errorName, 'TypeError');
  assert.equal(entry.errorCode, 'E_TEST');
  assert.equal(typeof entry.stack, 'string');
  assert.ok(entry.stack.includes('at '));
  assert.ok(!JSON.stringify(logged).includes('LEAKY'));
});

test('Problem Details titles reflect 403 and 502 without leaking error messages', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  // Register every route before the first inject() finalizes Fastify's graph.
  for (const status of [403, 502]) {
    app.get('/status-' + status, async () => {
      const error = new Error('PRIVATE_DIAGNOSTIC_MESSAGE');
      error.statusCode = status;
      throw error;
    });
  }
  for (const [status, title] of [
    [403, 'Forbidden'],
    [502, 'Bad Gateway'],
  ]) {
    const response = await app.inject({ method: 'GET', url: '/status-' + status });
    assert.equal(response.statusCode, status);
    assert.equal(response.headers['content-type'], 'application/problem+json; charset=utf-8');
    const body = response.json();
    assert.equal(body.status, status);
    assert.equal(body.title, title);
    assert.equal(body.type, 'about:blank');
    assert.ok(!response.body.includes('PRIVATE_DIAGNOSTIC_MESSAGE'));
  }
});

test('status-only 409 errors keep Conflict status without leaking diagnostics', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  app.get('/status-only', async () => {
    const error = new Error('PRIVATE_STATUS_ONLY_DIAGNOSTIC');
    error.status = 409;
    throw error;
  });

  const response = await app.inject({ method: 'GET', url: '/status-only' });
  assert.equal(response.statusCode, 409);
  assert.equal(response.headers['content-type'], 'application/problem+json; charset=utf-8');
  assert.deepEqual(response.json(), {
    type: 'about:blank',
    title: 'Conflict',
    status: 409,
    requestId: response.headers['x-request-id'],
  });
  assert.ok(!response.body.includes('PRIVATE_STATUS_ONLY_DIAGNOSTIC'));
});

test('schema validation 400 lists failing fields without echoing input', async (t) => {
  const app = buildApp();
  t.after(() => app.close());
  app.post(
    '/validated',
    {
      schema: {
        body: {
          type: 'object',
          required: ['name'],
          properties: { name: { type: 'string', maxLength: 3 } },
        },
      },
    },
    async () => ({ ok: true }),
  );

  const response = await app.inject({
    method: 'POST',
    url: '/validated',
    headers: { 'content-type': 'application/json' },
    payload: JSON.stringify({ name: 'SECRET_INPUT_VALUE' }),
  });
  assert.equal(response.statusCode, 400);
  assert.equal(response.headers['content-type'], 'application/problem+json; charset=utf-8');
  const body = response.json();
  assert.equal(body.title, 'Bad Request');
  assert.ok(Array.isArray(body.errors));
  assert.ok(body.errors.length >= 1);
  assert.equal(body.errors[0].in, 'body');
  assert.equal(body.errors[0].path, '/name');
  assert.ok(!response.body.includes('SECRET_INPUT_VALUE'));

  const missing = await app.inject({
    method: 'POST',
    url: '/validated',
    headers: { 'content-type': 'application/json' },
    payload: '{}',
  });
  assert.equal(missing.statusCode, 400);
  assert.ok(/name/.test(JSON.stringify(missing.json().errors)));
});

for (const signal of ['SIGTERM', 'SIGINT']) {
  test(`compiled JS listens and stops cleanly on ${signal}`, async () => {
    const child = spawn(process.execPath, ['dist/server.js'], {
      env: { ...process.env, PORT: '0', HOST: '127.0.0.1' },
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let output = '';
    const ready = new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error('server timeout: ' + output)), 7000);
      child.stdout.on('data', (chunk) => {
        output += chunk.toString();
        const match = output.match(/Server listening at (http:\/\/[^"\s]+)/);
        if (match) {
          clearTimeout(timer);
          resolve(match[1]);
        }
      });
      child.stderr.on('data', (chunk) => {
        output += chunk.toString();
      });
      child.once('exit', (code) => {
        clearTimeout(timer);
        reject(new Error('early exit: ' + code + output));
      });
    });
    try {
      const url = await ready;
      const response = await fetch(url + '/health');
      assert.equal(response.status, 200);
    } finally {
      if (child.exitCode === null) {
        const exit = new Promise((resolve) => child.once('exit', resolve));
        child.kill(signal);
        const code = await Promise.race([
          exit,
          new Promise((_, reject) => setTimeout(() => reject(new Error('SIGTERM timeout')), 7000)),
        ]);
        assert.equal(code, 0);
      }
    }
  });
}
