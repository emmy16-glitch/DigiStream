import { defineConfig, devices } from '@playwright/test';

const databaseUrl =
  process.env.DATABASE_URL ??
  'postgresql://digistream:digistream@127.0.0.1:5432/digistream_test';

export default defineConfig({
  testDir: './tests/ui',
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  workers: process.env.CI ? 1 : undefined,
  timeout: 60_000,
  expect: {
    timeout: 12_000,
  },
  outputDir: 'test-results/playwright',
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    actionTimeout: 12_000,
    baseURL: 'http://127.0.0.1:5173',
    colorScheme: 'dark',
    navigationTimeout: 20_000,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
    {
      name: 'android-chrome',
      use: {
        ...devices['Pixel 7'],
      },
    },
    {
      name: 'android-desktop-site',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 980, height: 1740 },
        deviceScaleFactor: 1,
      },
    },
  ],
  webServer: [
    {
      command: 'npm run dev:api',
      env: {
        ...process.env,
        AUTH_COOKIE_SECURE: 'false',
        DATABASE_URL: databaseUrl,
        NODE_ENV: 'test',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: 'http://127.0.0.1:3000/api/v1/status',
    },
    {
      command: 'npm run dev:web',
      env: {
        ...process.env,
        VITE_API_URL: '',
      },
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      url: 'http://127.0.0.1:5173',
    },
  ],
});
