const { test, expect } = require('@playwright/test');

// Universal E2E Canary: MODE 0 (zero config)
test('Universal Canary: Home, Login, Navigation, Write', async ({ page }) => {
  // Aggressive safe defaults
  const TIMEOUT = 30000; // 30s extreme timeout
  const BASE_URL = process.env.CANARIES_BASE_URL || 'http://localhost:3000';

  // 1. GET /
  const start = Date.now();
  await page.goto(BASE_URL, { timeout: TIMEOUT });
  const loadTime = Date.now() - start;

  // 2. Attempt login if login form detected
  const loginForm = await page.$('form[action*="login"], form[id*="login"], form[class*="login"]');
  if (loginForm) {
    const userInput = await page.$('input[type="text"], input[type="email"]');
    const passInput = await page.$('input[type="password"]');
    if (userInput && passInput) {
      await userInput.fill('canary');
      await passInput.fill('canary');
      const submitBtn = await page.$('button[type="submit"], input[type="submit"]');
      if (submitBtn) {
        await Promise.all([
          page.waitForNavigation({ timeout: TIMEOUT }),
          submitBtn.click()
        ]);
      }
    }
  }

  // 3. Safe navigation: click first nav link if exists
  const navLink = await page.$('nav a, a[href]:not([download])');
  if (navLink) {
    await Promise.all([
      page.waitForNavigation({ timeout: TIMEOUT }),
      navLink.click()
    ]);
  }

  // 4. Safe write: submit if form with submit button exists
  const form = await page.$('form');
  if (form) {
    const submitBtn = await form.$('button[type="submit"], input[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
    }
  }

  // Metrics
  const perf = await page.evaluate(() => ({
    load: performance.timing.domContentLoadedEventEnd - performance.timing.navigationStart,
    inp: window.INP || null,
    lcp: window.LCP || null,
  }));

  // Canary pass/fail logic
  expect(loadTime).toBeLessThan(TIMEOUT);
  expect(perf.load).toBeLessThan(TIMEOUT);

  // Fail only on crash/extreme timeout/extreme regression
});
