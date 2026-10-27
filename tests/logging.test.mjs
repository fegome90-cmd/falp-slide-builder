import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

test('HTTP query secrets never enter the starter process logs', async () => {
  const secret = 'CANARY_DO_NOT_LOG_849312';
  const child = spawn(process.execPath, ['dist/server.js'], {
    env: { ...process.env, PORT: '0', HOST: '127.0.0.1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let stdout = '';
  let stderr = '';
  const ready = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('listen timeout')), 8000);
    child.stdout.on('data', chunk => {
      stdout += chunk.toString();
      const match = stdout.match(/KIT_LISTEN (http:\/\/[^\s]+)/);
      if (match) { clearTimeout(timer); resolve(match[1]); }
    });
    child.stderr.on('data', chunk => stderr += chunk.toString());
    child.once('error', error => { clearTimeout(timer); reject(error); });
    child.once('exit', code => { clearTimeout(timer); reject(new Error('early exit ' + code)); });
  });
  try {
    const url = await ready;
    const query = '?access_token=' + encodeURIComponent(secret);
    assert.equal((await fetch(url + '/health' + query)).status, 200);
    assert.equal((await fetch(url + '/nonexistent' + query)).status, 404);
    // Allow stdout logging to flush before shutdown.
    await new Promise(resolve => setTimeout(resolve, 120));
  } finally {
    if (child.exitCode === null) {
      const exited = new Promise(resolve => child.once('exit', resolve));
      child.kill('SIGTERM');
      assert.equal(await Promise.race([
        exited,
        new Promise((_, reject) => setTimeout(() => reject(new Error('SIGTERM timeout')), 7000)),
      ]), 0);
    }
  }
  assert.ok(stdout.includes('"level"'), 'expected JSON structured server logging');
  assert.ok(!stdout.includes(secret), 'sensitive query value leaked into stdout');
  assert.ok(!stderr.includes(secret), 'sensitive query value leaked into stderr');
});
