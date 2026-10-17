import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './scripts/browser-test',
  fullyParallel: true,
  workers: 2,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    trace: 'retain-on-failure',
    launchOptions: process.env.TEST_CHROMIUM_PATH ? {
      executablePath: process.env.TEST_CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
    } : {},
  },
  projects: [
    { name: 'mobile', use: { viewport: { width: 390, height: 844 } } },
    { name: 'tablet', use: { viewport: { width: 820, height: 1180 } } },
    { name: 'desktop', use: { viewport: { width: 1440, height: 1000 } } },
  ],
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4173',
    url: 'http://127.0.0.1:4173',
    reuseExistingServer: false,
  },
});
