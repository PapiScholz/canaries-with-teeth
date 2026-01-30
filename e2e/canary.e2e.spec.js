// E2E Canary: Critical user flows with timing and assertions
// Deterministic: No retries, no flakiness masking
// Performance: p95 and hard cap enforced per flow


const { test, expect } = require('@playwright/test');

// Performance thresholds (ms)
const FLOW_CONFIG = {
  login: { p95: 1200, hardCap: 2000 },
  purchase: { p95: 1800, hardCap: 2500 },
  logout: { p95: 800, hardCap: 1500 },
};

// Failure injection mode (for CI validation only)
const CANARY_FAILURE_MODE = process.env.CANARY_FAILURE_MODE;

// Helper to measure step timings, with optional injection for performance failures
async function stepWithTiming(label, fn, timings, injectDelayMs = 0) {
  const start = Date.now();
  await fn();
  if (injectDelayMs > 0) {
    await new Promise(res => setTimeout(res, injectDelayMs));
  }
  const duration = Date.now() - start;
  timings.push({ label, duration });
}

test.describe('E2E Canary Flows', () => {

  test('Login flow', async ({ page }) => {
    const timings = [];
    let failed = false, failType = '', failDetail = '';
    let injectDelayMs = 0;
    // Failure injection logic
    if (CANARY_FAILURE_MODE === 'functional') {
      // Force assertion failure after navigation
      try {
        await stepWithTiming('visit-login', async () => {
          await page.goto('https://example.com/login');
          await expect(page).toHaveTitle(/login/i);
        }, timings);
        // Inject failure here
        throw new Error('Injected functional failure (CANARY_FAILURE_MODE=functional)');
      } catch (e) {
        failed = true;
        failType = 'functional-injected';
        failDetail = e.message;
      }
    } else {
      try {
        await stepWithTiming('visit-login', async () => {
          await page.goto('https://example.com/login');
          await expect(page).toHaveTitle(/login/i);
        }, timings);
        await stepWithTiming('submit-login', async () => {
          await page.fill('#username', 'canary');
          await page.fill('#password', 'canarypass');
          await page.click('button[type=submit]');
          await expect(page).toHaveURL(/dashboard/);
        }, timings);
      } catch (e) {
        failed = true;
        failType = 'functional';
        failDetail = e.message;
      }
    }
    // Performance failure injection
    if (!failed && CANARY_FAILURE_MODE === 'performance_hardcap') {
      // Inject delay to exceed hard cap
      injectDelayMs = FLOW_CONFIG.login.hardCap + 100;
      await stepWithTiming('injected-delay', async () => {}, timings, injectDelayMs);
    }
    if (!failed && CANARY_FAILURE_MODE === 'performance_p95') {
      // Inject delay to inflate p95
      injectDelayMs = FLOW_CONFIG.login.p95 + 200;
      await stepWithTiming('injected-delay', async () => {}, timings, injectDelayMs);
    }
    // Performance check
    const max = Math.max(...timings.map(t => t.duration));
    if (!failed && (max > FLOW_CONFIG.login.hardCap)) {
      failed = true;
      failType = 'performance-hardcap';
      failDetail = `step exceeded hard cap (${max}ms > ${FLOW_CONFIG.login.hardCap}ms)`;
    }
    if (!failed && (percentile(timings.map(t => t.duration), 95) > FLOW_CONFIG.login.p95)) {
      failed = true;
      failType = 'performance-p95';
      failDetail = `p95 exceeded baseline (${percentile(timings.map(t => t.duration), 95)}ms > ${FLOW_CONFIG.login.p95}ms)`;
    }
    if (failed) {
      logCanaryFailure('login', failType, failDetail, timings);
      console.error(`[CANARY_FAILURE_MODE] ${CANARY_FAILURE_MODE || 'none'}`);
      throw new Error('Canary failed: login');
    }
  });

  test('Purchase flow', async ({ page }) => {
    const timings = [];
    let failed = false, failType = '', failDetail = '';
    try {
      await stepWithTiming('visit-store', async () => {
        await page.goto('https://example.com/store');
        await expect(page.locator('.item')).toBeVisible();
      }, timings);
      await stepWithTiming('add-to-cart', async () => {
        await page.click('.item:first-child .add-to-cart');
        await expect(page.locator('.cart-count')).toHaveText('1');
      }, timings);
      await stepWithTiming('checkout', async () => {
        await page.click('.checkout');
        await expect(page).toHaveURL(/checkout/);
      }, timings);
    } catch (e) {
      failed = true;
      failType = 'functional';
      failDetail = e.message;
    }
    const max = Math.max(...timings.map(t => t.duration));
    if (!failed && (max > FLOW_CONFIG.purchase.hardCap)) {
      failed = true;
      failType = 'performance-hardcap';
      failDetail = `step exceeded hard cap (${max}ms > ${FLOW_CONFIG.purchase.hardCap}ms)`;
    }
    if (!failed && (percentile(timings.map(t => t.duration), 95) > FLOW_CONFIG.purchase.p95)) {
      failed = true;
      failType = 'performance-p95';
      failDetail = `p95 exceeded baseline (${percentile(timings.map(t => t.duration), 95)}ms > ${FLOW_CONFIG.purchase.p95}ms)`;
    }
    if (failed) {
      logCanaryFailure('purchase', failType, failDetail, timings);
      console.error(`[CANARY_FAILURE_MODE] ${CANARY_FAILURE_MODE || 'none'}`);
      throw new Error('Canary failed: purchase');
    }
  });

  test('Logout flow', async ({ page }) => {
    const timings = [];
    let failed = false, failType = '', failDetail = '';
    try {
      await stepWithTiming('visit-dashboard', async () => {
        await page.goto('https://example.com/dashboard');
        await expect(page).toHaveTitle(/dashboard/i);
      }, timings);
      await stepWithTiming('logout', async () => {
        await page.click('.logout');
        await expect(page).toHaveURL(/login/);
      }, timings);
    } catch (e) {
      failed = true;
      failType = 'functional';
      failDetail = e.message;
    }
    const max = Math.max(...timings.map(t => t.duration));
    if (!failed && (max > FLOW_CONFIG.logout.hardCap)) {
      failed = true;
      failType = 'performance-hardcap';
      failDetail = `step exceeded hard cap (${max}ms > ${FLOW_CONFIG.logout.hardCap}ms)`;
    }
    if (!failed && (percentile(timings.map(t => t.duration), 95) > FLOW_CONFIG.logout.p95)) {
      failed = true;
      failType = 'performance-p95';
      failDetail = `p95 exceeded baseline (${percentile(timings.map(t => t.duration), 95)}ms > ${FLOW_CONFIG.logout.p95}ms)`;
    }
    if (failed) {
      logCanaryFailure('logout', failType, failDetail, timings);
      console.error(`[CANARY_FAILURE_MODE] ${CANARY_FAILURE_MODE || 'none'}`);
      throw new Error('Canary failed: logout');
    }
  });
});

// Utility: percentile calculation
function percentile(arr, p) {
  if (!arr.length) return 0;
  const sorted = arr.slice().sort((a, b) => a - b);
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[idx];
}

// Utility: concise failure log
function logCanaryFailure(flow, type, detail, timings) {
  console.error(`E2E CANARY FAILURE | flow: ${flow} | type: ${type} | detail: ${detail}`);
  timings.forEach(t => console.error(`  step: ${t.label} | ${t.duration}ms`));
}
