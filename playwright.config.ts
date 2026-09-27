import { defineConfig, devices } from '@playwright/test';

const executablePath = process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium';

export default defineConfig({
  testDir: './e2e',
  timeout: 90_000,
  retries: 0,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173/FOWL-PLAY/',
    launchOptions: { executablePath },
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview -- --port 4173 --strictPort',
    url: 'http://localhost:4173/FOWL-PLAY/',
    reuseExistingServer: true,
    timeout: 60_000,
  },
  projects: [
    { name: 'iphone', use: { ...devices['iPhone 13'], defaultBrowserType: 'chromium', launchOptions: { executablePath } } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'], launchOptions: { executablePath } } },
  ],
});
