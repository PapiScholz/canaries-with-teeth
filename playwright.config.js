// Playwright config for deterministic E2E canaries
// Only critical flows, no retries, no flakiness masking
import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  retries: 0,
  timeout: 30000, // 30s per test max
  reporter: [['list']],
  use: {
    trace: 'off',
    video: 'off',
    screenshot: 'off',
  },
});
