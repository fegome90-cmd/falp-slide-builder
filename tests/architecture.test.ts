import assert from 'node:assert/strict';
import { type SpawnSyncReturns, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, test } from 'vitest';
// Vitest must load the source behind the aliases, not the compiled dist/ fallback.
import { healthPlugin as viaAlias } from '#modules/health';
import { healthPlugin as viaPath } from '../src/modules/health/index.js';

// Canary: if an architecture rule silently stops working (Biome upgrade, config edit),
// these tests fail. Each source file below is written into a temp project that uses the
// repo's biome.json and package.json imports, then linted with the repo's Biome binary.
const require = createRequire(import.meta.url);
const repoRoot = fileURLToPath(new URL('../', import.meta.url));

const SOURCES: Record<string, string> = {
  // Violations.
  'src/app.ts': "import { x } from '#modules/health/routes/a'; export const v1 = x;",
  'src/server.ts': "import { y } from './modules/decks/index.js'; export const v2 = y;",
  'src/shared/bad-shared.ts': "import { z } from '#modules/decks'; export const v3 = z;",
  'src/modules/decks/routes/deep-relative.ts':
    "import { w } from '../../health/routes/a.js'; export const v4 = w;",
  'src/modules/decks/domain/impure.ts':
    "import Fastify from 'fastify'; import { r } from '../routes/ok-route.js'; export const v5 = [Fastify, r];",
  'src/modules/decks/domain/BadName.ts': 'export const ok = 1;',
  'src/modules/cyc-a/index.ts': "import { b } from '#modules/cyc-b'; export const a = () => b;",
  'src/modules/cyc-b/index.ts': "import { a } from '#modules/cyc-a'; export const b = () => a;",
  // Allowed: must produce no diagnostics.
  'src/modules/decks/routes/ok-route.ts':
    "import { health } from '#modules/health'; import { s } from '#shared/util'; import { pure } from '../domain/pure.js'; export const r = [health, s, pure];",
  'src/modules/decks/domain/pure.ts': 'export const pure = (n: number) => n * 2;',
  'src/shared/util.ts': 'export const s = 1;',
  'src/modules/health/index.ts': 'export const health = 1;',
  'src/modules/health/routes/a.ts': 'export const x = 1; export const w = 1;',
  'src/modules/decks/index.ts':
    "export const y = 1; export const z = 1; export { r } from './routes/ok-route.js';",
};

const VIOLATIONS = [
  { file: 'src/app.ts', rule: 'lint/style/noRestrictedImports' },
  { file: 'src/server.ts', rule: 'lint/style/noRestrictedImports' },
  { file: 'src/shared/bad-shared.ts', rule: 'lint/style/noRestrictedImports' },
  { file: 'src/modules/decks/routes/deep-relative.ts', rule: 'lint/style/noRestrictedImports' },
  { file: 'src/modules/decks/domain/impure.ts', rule: 'lint/style/noRestrictedImports' },
  { file: 'src/modules/decks/domain/BadName.ts', rule: 'lint/style/useFilenamingConvention' },
  { file: 'src/modules/cyc-a/index.ts', rule: 'lint/suspicious/noImportCycles' },
  { file: 'src/modules/cyc-b/index.ts', rule: 'lint/suspicious/noImportCycles' },
] as const;

const ALLOWED = [
  'src/modules/decks/routes/ok-route.ts',
  'src/modules/decks/domain/pure.ts',
  'src/shared/util.ts',
  'src/modules/health/index.ts',
  'src/modules/health/routes/a.ts',
  'src/modules/decks/index.ts',
] as const;

let tempDir = '';
let biome: SpawnSyncReturns<string> | undefined;

/** Biome prints each diagnostic header as "<path>:<line>:<col> <rule>" or "<path> <rule>". */
function diagnosticLines(): string[] {
  return `${biome?.stdout ?? ''}${biome?.stderr ?? ''}`.split(/\r?\n/);
}

function hasDiagnosticFor(file: string, rule?: string): boolean {
  return diagnosticLines().some(
    (line) =>
      (line.startsWith(`${file}:`) || line.startsWith(`${file} `)) &&
      (rule === undefined || line.includes(rule)),
  );
}

describe('architecture rules canary', () => {
  beforeAll(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'arch-canary-'));

    const biomeConfig = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'biome.json'), 'utf8'),
    ) as Record<string, unknown>;
    delete biomeConfig.$schema;
    biomeConfig.vcs = { enabled: false };
    fs.writeFileSync(path.join(tempDir, 'biome.json'), JSON.stringify(biomeConfig, null, 2));

    const repoPackage = JSON.parse(
      fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'),
    ) as { imports: unknown };
    fs.writeFileSync(
      path.join(tempDir, 'package.json'),
      JSON.stringify({ type: 'module', imports: repoPackage.imports }, null, 2),
    );

    for (const [file, source] of Object.entries(SOURCES)) {
      const target = path.join(tempDir, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, `${source}\n`);
    }

    biome = spawnSync(
      process.execPath,
      [
        require.resolve('@biomejs/biome/bin/biome'),
        'lint',
        '--max-diagnostics=none',
        '--colors=off',
        'src',
      ],
      { cwd: tempDir, encoding: 'utf8' },
    );
  });

  afterAll(() => {
    if (tempDir) fs.rmSync(tempDir, { recursive: true, force: true });
  });

  test.each(VIOLATIONS)('$file is flagged by $rule', ({ file, rule }) => {
    assert.ok(
      hasDiagnosticFor(file, rule),
      `expected a ${rule} diagnostic starting with ${file}\n${biome?.stdout}${biome?.stderr}`,
    );
  });

  test('allowed files produce no diagnostics', () => {
    const offenders = ALLOWED.filter((file) => hasDiagnosticFor(file));
    assert.deepEqual(offenders, [], `unexpected diagnostics\n${biome?.stdout}${biome?.stderr}`);
  });

  test('biome exits non-zero when violations are present', () => {
    assert.equal(biome?.error, undefined, 'biome failed to spawn');
    assert.ok(
      typeof biome?.status === 'number' && biome.status !== 0,
      `expected a non-zero exit status, got ${biome?.status}`,
    );
  });
});

test('#modules aliases resolve to src/ under Vitest', () => {
  assert.equal(viaAlias, viaPath);
});
