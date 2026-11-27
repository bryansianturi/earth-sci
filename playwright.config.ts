import { defineConfig } from '@playwright/test';
// Uses the system-installed Chrome so no browser download is needed.
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 60_000,
  retries: 0,
  use: { baseURL: 'http://localhost:4321', channel: 'chrome', serviceWorkers: 'allow' },
  webServer: { command: 'npm run preview', url: 'http://localhost:4321', reuseExistingServer: true, timeout: 120_000 },
});
