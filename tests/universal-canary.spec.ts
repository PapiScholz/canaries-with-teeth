import { test, Page } from '@playwright/test';
import { CanaryStats, timedStep } from './canary-metrics';

const FAKE_EMAIL = 'canary@example.com';
const FAKE_PASSWORD = 'canary-password';

function isSafeButton(el: Element): boolean {
  if (!(el instanceof HTMLButtonElement)) return false;
  const txt = el.textContent?.toLowerCase() || '';
  return !/delete|remove|logout/.test(txt);
}

test('Universal E2E Canary', async ({ page }: { page: Page }) => {
  const stats = new CanaryStats();

  // 1) GET /
  await timedStep('visit-root', async () => {
    await page.goto('/');
  }, stats);

  // 2) Detect login form heuristically
  const loginForm = await timedStep('detect-login-form', async () => {
    const forms = await page.$$('form');
    for (const form of forms) {
      const pwInput = await form.$('input[type="password"]');
      if (pwInput) return form;
    }
    return null;
  }, stats);

  // 3) Try login if form exists
  await timedStep('try-login', async () => {
    if (!loginForm) return;
    const emailInput = await loginForm.$('input[type="email"], input[type="text"]');
    if (emailInput) await emailInput.fill(FAKE_EMAIL);
    const pwInput = await loginForm.$('input[type="password"]');
    if (pwInput) await pwInput.fill(FAKE_PASSWORD);
    // Try submit, skip if not found
    const submitBtn = await loginForm.$('button[type="submit"], input[type="submit"]');
    if (submitBtn) await submitBtn.click();
  }, stats);

  // 4) Navigate to first safe internal link
  await timedStep('navigate-internal-link', async () => {
    const links = await page.$$('a[href]');
    for (const link of links) {
      const href = await link.getAttribute('href');
      if (href && href.startsWith('/') && !href.startsWith('//')) {
        await link.click();
        break;
      }
    }
  }, stats);

  // 5) Try safe write action if possible
  await timedStep('safe-write-action', async () => {
    const forms = await page.$$('form');
    for (const form of forms) {
      const btns = await form.$$('button, input[type="submit"]');
      for (const btn of btns) {
        const txt = (await btn.textContent())?.toLowerCase() || '';
        if (/delete|remove|logout/.test(txt)) continue;
        // Try to fill a text input if present
        const textInput = await form.$('input[type="text"], textarea');
        if (textInput) {
          await textInput.fill('canary-test');
          await btn.click();
          return;
        }
      }
    }
  }, stats);

  // 6) Measure times (already done per step)
  // 7) Assert p95
  stats.assertConservativeP95(10000);
});
