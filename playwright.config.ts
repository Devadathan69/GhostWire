import { defineConfig } from '@playwright/test';
const port = process.env.E2E_PORT || '3211';
const baseURL = process.env.E2E_BASE_URL || `http://localhost:${port}`;
export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90000,
  expect: { timeout: 12000 },
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL,
    viewport: { width: 1440, height: 1000 },
    headless: true,
    actionTimeout: 15000,
    screenshot: 'only-on-failure',
    // Explicit scene screenshots provide visual evidence. Capturing every WebGL
    // frame for traces adds timing overhead and corrupts trace streams on Windows.
    trace: { mode: 'retain-on-failure', screenshots: false, snapshots: true, sources: true },
    launchOptions: {
      args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'],
    },
  },
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'node dist/server/index.js',
        env: { PORT: port },
        url: `${baseURL}/api/health`,
        reuseExistingServer: false,
        timeout: 30000,
      },
});
