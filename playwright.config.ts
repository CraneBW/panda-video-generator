import { defineConfig, devices } from '@playwright/test';
import path from 'path';
import { existsSync } from 'fs';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * See https://playwright.dev/docs/test-configuration.
 */
const authFile = path.join(__dirname, 'playwright/.auth/bilibili.json');
const storageState = existsSync(authFile) ? authFile : undefined;

export default defineConfig({
  testDir: './automations',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* No retries for any test cases */
  retries: 0,
  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: 'html',
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    /* Collect trace on failure (since we don't retry) */
    trace: 'retain-on-failure',
    /* Load saved login state if it exists (optional) */
    ...(storageState && { storageState }),
  },

  /* Configure projects for major browsers */
  /* Only use chromium by default to avoid running tests twice */
  projects: [
    {
      name: 'chromium',
      use: { 
        ...devices['Desktop Chrome'],
        /* Load saved login state if it exists */
        ...(storageState && { storageState }),
      },
    },
    // Uncomment below to test on multiple browsers (will run tests multiple times)
    // {
    //   name: 'edge',
    //   use: { 
    //     ...devices['Desktop Edge'],
    //     ...(storageState && { storageState }),
    //   },
    // },
    // {
    //   name: 'firefox',
    //   use: { ...devices['Desktop Firefox'] },
    // },
    // {
    //   name: 'webkit',
    //   use: { ...devices['Desktop Safari'] },
    // },
  ],

  /* Run your local dev server before starting the tests */
  // Temporarily disabled for debugging
  // webServer: {
  //   command: 'pnpm dev',
  //   url: 'http://localhost:3000',
  //   reuseExistingServer: !process.env.CI,
  // },
});
