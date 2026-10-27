import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export default function setup(): void {
  execFileSync(
    process.execPath,
    [require.resolve('typescript/bin/tsc'), '-p', 'tsconfig.build.json'],
    {
      stdio: 'inherit',
    },
  );
}
