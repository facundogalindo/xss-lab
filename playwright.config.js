import { defineConfig } from '@playwright/test';

const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: false,
  timeout: 30_000,
  expect: { timeout: 8_000 },
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    browserName: 'chromium',
    headless: true,
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `${npmCommand} run dev:backend`,
      url: 'http://127.0.0.1:3001/lab/vulnerable',
      name: 'Backend Express',
      reuseExistingServer: false,
      timeout: 60_000,
    },
    {
      command: `${npmCommand} run dev:frontend`,
      url: 'http://127.0.0.1:5173',
      name: 'Frontend Vite',
      reuseExistingServer: false,
      timeout: 60_000,
    },
  ],
});
