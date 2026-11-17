import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/modules/decks/domain/deck-spec.ts', 'studio/src/slide-view.tsx'],
      reporter: ['text', 'json-summary'],
      thresholds: { lines: 80, functions: 80, statements: 80, branches: 70 },
    },
    include: ['tests/**/*.test.ts'],
    // Process-level tests spawn dist/server.js, so compile once before the run.
    globalSetup: ['./tests/global-setup.ts'],
    testTimeout: 15_000,
    // Process-level tests run dist/ and import nothing from src/, so any source change must
    // rerun the whole suite in watch mode (the global setup rebuilds dist/ first).
    forceRerunTriggers: ['**/package.json', '**/{vitest,vite}.config.*', '**/src/**'],
  },
});
