import test from 'node:test';
import assert from 'node:assert/strict';
import { readServerConfig } from '../dist/config.js';

test('defaults bind only to localhost', () => {
  assert.deepEqual(readServerConfig({}), { host: '127.0.0.1', port: 3000 });
});

test('explicit supported host and ephemeral port are accepted', () => {
  assert.deepEqual(readServerConfig({ HOST: '0.0.0.0', PORT: '0' }),
    { host: '0.0.0.0', port: 0 });
});

test('invalid ports and hosts fail closed', () => {
  for (const port of ['-1', '65536', '12.5', 'x', '', ' 100', '1e2']) {
    assert.throws(() => readServerConfig({ PORT: port }), /PORT/);
  }
  for (const host of ['bad host', 'evil.invalid', '', '\n127.0.0.1']) {
    assert.throws(() => readServerConfig({ HOST: host }), /HOST/);
  }
});
