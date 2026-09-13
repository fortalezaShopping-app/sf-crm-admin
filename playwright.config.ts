import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60000,
  expect: { timeout: 15000 },
  use: { baseURL: 'http://localhost:3103', trace: 'retain-on-failure' },
  webServer: {
    command: 'node tests/serve-admin.mjs',
    url: 'http://localhost:3103/login',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
