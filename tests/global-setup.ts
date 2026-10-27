import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import type { TestProject } from 'vitest/node';

const require = createRequire(import.meta.url);

function build(): void {
  execFileSync(
    process.execPath,
    [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json'],
    {
      stdio: 'inherit',
    },
  );
}

export default function setup(project: TestProject): void {
  build();
  // Watch mode reruns tests without re-running setup; rebuild dist/ first so the
  // process-level tests do not exercise stale compiled code.
  project.onTestsRerun(() => build());
}
