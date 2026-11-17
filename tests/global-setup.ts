import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { build as buildVite } from 'vite';
import type { TestProject } from 'vitest/node';

const require = createRequire(import.meta.url);

async function prepareTestArtifacts(): Promise<void> {
  execFileSync(
    process.execPath,
    [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json'],
    { stdio: 'inherit' },
  );
  await buildVite({
    configFile: fileURLToPath(new URL('../studio/vite.config.ts', import.meta.url)),
  });
}

export default async function setup(project: TestProject): Promise<void> {
  await prepareTestArtifacts();
  // Watch reruns process-level tests against rebuilt server and Studio assets.
  project.onTestsRerun(() => prepareTestArtifacts());
}
