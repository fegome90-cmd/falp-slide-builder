import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Process-level tests spawn dist/server.js, so compile once before the run.
    globalSetup: ['./tests/global-setup.ts'],
    testTimeout: 15_000,
  },
});
