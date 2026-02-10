const { test, expect } = require('@playwright/test');
const fs = require('fs');
const path = require('path');

const METRICS_PATH = path.join(process.cwd(), 'artifacts', 'gating', 'canary-metrics.json');
const NETWORK_OBS_PATH = path.join(process.cwd(), 'artifacts', 'gating', 'network-observations.json');
const NAV_TIMEOUT_MS = 30000;
const NAV_CAP_MS = 15000;
const DOM_CONTENT_CAP_MS = 10000;
const LOAD_CAP_MS = 20000;

let lastMetrics = null;
let networkObservations = [];

function writeMetrics(metrics) {
  try {
    fs.mkdirSync(path.dirname(METRICS_PATH), { recursive: true });
    fs.writeFileSync(METRICS_PATH, JSON.stringify(metrics, null, 2));
  } catch {}
}

function writeNetworkObservations(observations) {
  try {
    fs.mkdirSync(path.dirname(NETWORK_OBS_PATH), { recursive: true });
    fs.writeFileSync(NETWORK_OBS_PATH, JSON.stringify(observations, null, 2));
  } catch {}
}

test.afterEach(() => {
  if (lastMetrics) writeMetrics(lastMetrics);
  writeNetworkObservations(networkObservations);
  networkObservations = []; // Reset for next test
});

// Universal E2E Canary: MODE 0 (zero config)
test('Universal Canary: Home + Performance', async ({ page }) => {
  const baseUrl = process.env.BASE_URL || process.env.CANARIES_BASE_URL || 'http://localhost:3000';
  const consoleErrors = [];

  // Capture network observations for Service Maps
  page.on('response', (response) => {
    try {
      const request = response.request();
      const url = request.url();
      const statusCode = response.status();
      const timing = response.timing();
      
      // Estimate latency from timing data
      // timing includes: domainLookup, connect, secureConnect, request, response, download
      const latencyMs = timing ? (timing.responseEnd - timing.startTime) : 0;
      
      networkObservations.push({
        url,
        statusCode,
        latencyMs: Math.round(Math.max(0, latencyMs)),
        timestamp: Date.now(),
        method: request.method(),
      });
    } catch {
      // Safely ignore network observation errors
    }
  });

  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });

  page.on('pageerror', err => {
    consoleErrors.push(err.message);
  });

  const start = Date.now();
  await page.goto(baseUrl, { waitUntil: 'load', timeout: NAV_TIMEOUT_MS });
  const navigationMs = Date.now() - start;

  const perf = await page.evaluate(() => {
    const nav = performance.getEntriesByType('navigation')[0];
    if (nav) {
      return {
        domContentLoadedMs: nav.domContentLoadedEventEnd - nav.startTime,
        loadMs: nav.loadEventEnd - nav.startTime,
        responseEndMs: nav.responseEnd - nav.startTime,
        resourceCount: performance.getEntriesByType('resource').length,
      };
    }
    const timing = performance.timing;
    return {
      domContentLoadedMs: timing.domContentLoadedEventEnd - timing.navigationStart,
      loadMs: timing.loadEventEnd - timing.navigationStart,
      responseEndMs: timing.responseEnd - timing.navigationStart,
      resourceCount: performance.getEntriesByType('resource').length,
    };
  });

  lastMetrics = {
    navigationMs,
    domContentLoadedMs: perf.domContentLoadedMs,
    loadMs: perf.loadMs,
    responseEndMs: perf.responseEndMs,
    resourceCount: perf.resourceCount,
    consoleErrors
  };

  expect(consoleErrors, 'JS console errors').toEqual([]);
  expect(navigationMs).toBeLessThan(NAV_CAP_MS);
  expect(perf.domContentLoadedMs).toBeLessThan(DOM_CONTENT_CAP_MS);
  expect(perf.loadMs).toBeLessThan(LOAD_CAP_MS);
});
