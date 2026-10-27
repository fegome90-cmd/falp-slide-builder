import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Process-level tests spawn dist/server.js, so compile once before the run.
    globalSetup: ['./tests/global-setup.ts'],
    testTimeout: 15_000,
    // Process-level tests run dist/ and import nothing from src/, so any source change must
    // rerun the whole suite in watch mode (the global setup rebuilds dist/ first).
    forceRerunTriggers: ['**/package.json', '**/{vitest,vite}.config.*', '**/src/**'],
  },
});
